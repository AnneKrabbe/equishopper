import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE_DISPUTE_STATUSES = [
  "open",
  "awaiting_buyer",
  "awaiting_seller",
  "under_review",
];

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function requirePlaceholderIds() {
  const deletedUserId = process.env.DELETED_USER_ID;
  const deletedUser2Id = process.env.DELETED_USER_2_ID;

  if (!deletedUserId || !deletedUser2Id) {
    throw new Error(
      "DELETED_USER_ID eller DELETED_USER_2_ID mangler i environment."
    );
  }

  if (deletedUserId === deletedUser2Id) {
    throw new Error("De to placeholder-brugere skal være forskellige.");
  }

  return { deletedUserId, deletedUser2Id };
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonError("Du skal være logget ind for at slette din konto.", 401);
    }

    const accessToken = authorization.slice("Bearer ".length).trim();

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return jsonError(
        "Din session er udløbet. Log ind igen og prøv på ny.",
        401
      );
    }

    const userId = user.id;
    const { deletedUserId, deletedUser2Id } = requirePlaceholderIds();

    if (userId === deletedUserId || userId === deletedUser2Id) {
      return jsonError("Denne systemkonto kan ikke slettes.", 403);
    }

    // En konto må ikke lukkes, mens der stadig er en handel, som kræver
    // handling eller en udbetaling. Afsluttede/cancelled handler blokerer ikke.
    const { data: relatedOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id,status,payment_status,fulfillment_status,payout_status,buyer_id,seller_id")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (ordersError) {
      console.error("Kunne ikke kontrollere handler før kontosletning:", ordersError);
      return jsonError(
        "Vi kunne ikke kontrollere dine handler. Prøv igen om lidt.",
        500
      );
    }

    const blockingOrders = (relatedOrders ?? []).filter((order) => {
      const status = String(order.status ?? "").toLowerCase();
      const fulfillment = String(order.fulfillment_status ?? "").toLowerCase();
      const payout = String(order.payout_status ?? "").toLowerCase();

      const terminalOrder =
        status === "cancelled" ||
        (fulfillment === "completed" && payout === "paid");

      return !terminalOrder;
    });

    if (blockingOrders.length > 0) {
      return jsonError(
        "Du kan ikke slette din konto endnu, fordi du har en aktiv handel eller en handel med ventende udbetaling. Afslut handlen først.",
        409
      );
    }

    const { count: activeDisputeCount, error: disputeError } =
      await supabaseAdmin
        .from("disputes")
        .select("id", { count: "exact", head: true })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .in("status", ACTIVE_DISPUTE_STATUSES);

    if (disputeError) {
      console.error("Kunne ikke kontrollere tvister før kontosletning:", disputeError);
      return jsonError(
        "Vi kunne ikke kontrollere dine handler. Prøv igen om lidt.",
        500
      );
    }

    if ((activeDisputeCount ?? 0) > 0) {
      return jsonError(
        "Du kan ikke slette din konto, mens du har en aktiv tvist. Afslut tvisten først.",
        409
      );
    }

    // Fjern ALLE annoncer fra offentlig visning, men behold rækkerne så
    // historiske order_items fortsat kan referere til dem.
    const { error: listingsError } = await supabaseAdmin
      .from("listings")
      .update({
        status: "deleted",
        deleted_at: new Date().toISOString(),
      })
      .eq("seller_id", userId)
      .is("deleted_at", null);

    if (listingsError) {
      console.error("Kunne ikke skjule annoncer ved kontosletning:", listingsError);
      return jsonError(
        "Dine annoncer kunne ikke fjernes. Kontoen er derfor ikke blevet slettet.",
        500
      );
    }

    // Flyt historiske ordre-referencer til systemets placeholder-brugere.
    // Der vælges pr. ordre, så buyer_id og seller_id aldrig bliver ens.
    for (const order of relatedOrders ?? []) {
      let buyerId = order.buyer_id;
      let sellerId = order.seller_id;

      if (buyerId === userId) {
        buyerId = sellerId === deletedUserId ? deletedUser2Id : deletedUserId;

        const { error } = await supabaseAdmin
          .from("orders")
          .update({ buyer_id: buyerId })
          .eq("id", order.id)
          .eq("buyer_id", userId);

        if (error) {
          console.error("Kunne ikke anonymisere buyer_id:", order.id, error);
          return jsonError(
            "Din ordrehistorik kunne ikke anonymiseres. Kontoen er ikke blevet slettet.",
            500
          );
        }
      }

      if (sellerId === userId) {
        sellerId = buyerId === deletedUserId ? deletedUser2Id : deletedUserId;

        const { error } = await supabaseAdmin
          .from("orders")
          .update({ seller_id: sellerId })
          .eq("id", order.id)
          .eq("seller_id", userId);

        if (error) {
          console.error("Kunne ikke anonymisere seller_id:", order.id, error);
          return jsonError(
            "Din ordrehistorik kunne ikke anonymiseres. Kontoen er ikke blevet slettet.",
            500
          );
        }
      }
    }

    // order_items.seller_id bruger RESTRICT og skal derfor flyttes før
    // Auth-brugeren kan slettes.
    const { data: sellerItems, error: sellerItemsError } = await supabaseAdmin
      .from("order_items")
      .select("id,order_id")
      .eq("seller_id", userId);

    if (sellerItemsError) {
      console.error("Kunne ikke hente order_items:", sellerItemsError);
      return jsonError(
        "Din ordrehistorik kunne ikke anonymiseres. Kontoen er ikke blevet slettet.",
        500
      );
    }

    for (const item of sellerItems ?? []) {
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("buyer_id")
        .eq("id", item.order_id)
        .maybeSingle();

      if (orderError) {
        console.error("Kunne ikke hente ordre til order_item:", item.order_id, orderError);
        return jsonError(
          "Din ordrehistorik kunne ikke anonymiseres. Kontoen er ikke blevet slettet.",
          500
        );
      }

      const replacementSeller =
        order?.buyer_id === deletedUserId ? deletedUser2Id : deletedUserId;

      const { error } = await supabaseAdmin
        .from("order_items")
        .update({ seller_id: replacementSeller })
        .eq("id", item.id)
        .eq("seller_id", userId);

      if (error) {
        console.error("Kunne ikke anonymisere order_item:", item.id, error);
        return jsonError(
          "Din ordrehistorik kunne ikke anonymiseres. Kontoen er ikke blevet slettet.",
          500
        );
      }
    }

    // reserved_by bruger SET NULL, men vi rydder det eksplicit.
    const { error: reservedByError } = await supabaseAdmin
      .from("listings")
      .update({ reserved_by: null })
      .eq("reserved_by", userId);

    if (reservedByError) {
      console.error("Kunne ikke rydde reserved_by:", reservedByError);
      return jsonError(
        "Kontoen kunne ikke færdigbehandles. Prøv igen om lidt.",
        500
      );
    }

    // profiles.id og øvrige CASCADE-relationer ryddes automatisk, når Auth-
    // brugeren slettes. Historiske orders/order_items peger nu på placeholders.
    const { error: deleteUserError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("Kunne ikke slette Supabase Auth-bruger:", deleteUserError);
      return jsonError(
        "Dine annoncer og historiske handler er anonymiseret, men login-kontoen kunne ikke slettes automatisk. Kontakt Equishopper support.",
        500
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Uventet fejl ved kontosletning:", error);

    return jsonError(
      "Der opstod en uventet fejl. Prøv igen om lidt.",
      500
    );
  }
}
