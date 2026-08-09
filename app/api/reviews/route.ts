import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createClient } from "@supabase/supabase-js";

type CreateReviewBody = {
  orderId?: unknown;
  rating?: unknown;
  comment?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_COMMENT_LENGTH = 1000;

export async function POST(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error:
            "Du skal være logget ind for at skrive en anmeldelse.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.slice("Bearer ".length);

    /*
     * Supabase-klient med den aktuelle brugers token.
     * Det betyder, at RLS og auth.uid() fortsat virker.
     */
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(
      accessToken
    );

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Din session er udløbet. Log ind igen.",
        },
        {
          status: 401,
        }
      );
    }

    let body: CreateReviewBody;

    try {
      body =
        (await request.json()) as CreateReviewBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Anmodningen indeholder ugyldig JSON.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidUuid(body.orderId)) {
      return NextResponse.json(
        {
          error:
            "Der mangler et gyldigt ordre-id.",
        },
        {
          status: 400,
        }
      );
    }

    const rating = parseRating(body.rating);

    if (rating === null) {
      return NextResponse.json(
        {
          error:
            "Bedømmelsen skal være et helt tal fra 1 til 5.",
        },
        {
          status: 400,
        }
      );
    }

    const parsedComment =
      parseComment(body.comment);

    if (parsedComment.error) {
      return NextResponse.json(
        {
          error: parsedComment.error,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Hent ordren først, så vi kan kontrollere:
     * - at den findes
     * - at brugeren er køber eller sælger
     * - at ordren er afsluttet
     * - hvem anmeldelsen skal handle om
     */
    const {
      data: order,
      error: orderError,
    } = await supabaseUser
      .from("orders")
      .select(`
        id,
        buyer_id,
        seller_id,
        fulfillment_status,
        status,
        payment_status
      `)
      .eq("id", body.orderId)
      .maybeSingle();

    if (orderError) {
      console.error(
        "Kunne ikke hente ordre til anmeldelse:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Ordren kunne ikke kontrolleres.",
        },
        {
          status: 500,
        }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Ordren findes ikke, eller du har ikke adgang til den.",
        },
        {
          status: 404,
        }
      );
    }

    const isBuyer =
      order.buyer_id === user.id;

    const isSeller =
      order.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return NextResponse.json(
        {
          error:
            "Du har ikke adgang til at anmelde denne ordre.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      order.fulfillment_status !== "completed"
    ) {
      return NextResponse.json(
        {
          error:
            "Ordren skal være afsluttet, før den kan anmeldes.",
        },
        {
          status: 409,
        }
      );
    }

    const reviewedUserId = isBuyer
      ? order.seller_id
      : order.buyer_id;

    const reviewType = isBuyer
      ? "buyer_to_seller"
      : "seller_to_buyer";

    if (reviewedUserId === user.id) {
      return NextResponse.json(
        {
          error:
            "Du kan ikke anmelde dig selv.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: existingReview,
      error: existingReviewError,
    } = await supabaseUser
      .from("reviews")
      .select("id")
      .eq("order_id", order.id)
      .eq("reviewer_id", user.id)
      .maybeSingle();

    if (existingReviewError) {
      console.error(
        "Kunne ikke kontrollere eksisterende anmeldelse:",
        existingReviewError
      );

      return NextResponse.json(
        {
          error:
            "Det kunne ikke kontrolleres, om ordren allerede er anmeldt.",
        },
        {
          status: 500,
        }
      );
    }

    if (existingReview) {
      return NextResponse.json(
        {
          error:
            "Du har allerede anmeldt denne ordre.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: review,
      error: insertError,
    } = await supabaseUser
      .from("reviews")
      .insert({
        order_id: order.id,
        reviewer_id: user.id,
        reviewed_user_id: reviewedUserId,
        rating,
        comment: parsedComment.value,
        review_type: reviewType,
      })
      .select(`
        id,
        order_id,
        reviewer_id,
        reviewed_user_id,
        rating,
        comment,
        review_type,
        created_at,
        updated_at
      `)
      .single();

    if (insertError) {
      console.error(
        "Kunne ikke oprette anmeldelse:",
        insertError
      );

      const mappedError =
        getDatabaseErrorMessage(insertError);

      return NextResponse.json(
        {
          error: mappedError.message,
        },
        {
          status: mappedError.status,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Din anmeldelse er blevet gemt.",
        review,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Uventet fejl ved oprettelse af anmeldelse:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Der opstod en uventet fejl. Prøv igen.",
      },
      {
        status: 500,
      }
    );
  }
}

function isValidUuid(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value)
  );
}

function parseRating(
  value: unknown
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 5
  ) {
    return null;
  }

  return value;
}

function parseComment(
  value: unknown
): {
  value: string | null;
  error: string | null;
} {
  if (
    value === undefined ||
    value === null
  ) {
    return {
      value: null,
      error: null,
    };
  }

  if (typeof value !== "string") {
    return {
      value: null,
      error:
        "Kommentaren skal være tekst.",
    };
  }

  const trimmedComment =
    value.trim();

  if (
    trimmedComment.length >
    MAX_COMMENT_LENGTH
  ) {
    return {
      value: null,
      error:
        `Kommentaren må højst være ${MAX_COMMENT_LENGTH} tegn.`,
    };
  }

  return {
    value:
      trimmedComment || null,
    error: null,
  };
}

function getDatabaseErrorMessage(
  error: {
    code?: string;
    message?: string;
  }
): {
  message: string;
  status: number;
} {
  if (error.code === "23505") {
    return {
      message:
        "Du har allerede anmeldt denne ordre.",
      status: 409,
    };
  }

  if (error.code === "23503") {
    return {
      message:
        "Ordren eller brugeren findes ikke.",
      status: 404,
    };
  }

  if (error.code === "23514") {
    return {
      message:
        "Anmeldelsen indeholder ugyldige oplysninger.",
      status: 400,
    };
  }

  const databaseMessage =
    error.message?.toLowerCase() ?? "";

  if (
    databaseMessage.includes(
      "ordren skal være gennemført"
    ) ||
    databaseMessage.includes(
      "ordren skal være afsluttet"
    )
  ) {
    return {
      message:
        "Ordren skal være afsluttet, før den kan anmeldes.",
      status: 409,
    };
  }

  if (
    databaseMessage.includes(
      "kun køberen eller sælgeren"
    )
  ) {
    return {
      message:
        "Du har ikke adgang til at anmelde denne ordre.",
      status: 403,
    };
  }

  if (
    databaseMessage.includes(
      "kan ikke anmelde sig selv"
    )
  ) {
    return {
      message:
        "Du kan ikke anmelde dig selv.",
      status: 400,
    };
  }

  return {
    message:
      "Anmeldelsen kunne ikke gemmes. Prøv igen.",
    status: 500,
  };
}