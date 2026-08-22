import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase-admin";

type CampaignBody = {
  name?: string;
  userId?: string | null;
  feePercent?: number;
  priority?: number;
  startsAt?: string;
  endsAt?: string | null;
};

type UpdateCampaignBody = {
  id?: string;
  name?: string;
  feePercent?: number;
  priority?: number;
  startsAt?: string;
  endsAt?: string | null;
  isActive?: boolean;
};

async function getAuthenticatedAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      error: "Du skal være logget ind.",
      status: 401,
    };
  }

  const accessToken = authorization.slice("Bearer ".length);

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
    error: userError,
  } = await supabaseUser.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      user: null,
      error: "Din session er udløbet. Log ind igen.",
      status: 401,
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    return {
      user: null,
      error: "Du har ikke adgang til denne funktion.",
      status: 403,
    };
  }

  return {
    user,
    error: null,
    status: 200,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin(request);

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const userSearch =
      request.nextUrl.searchParams.get("userSearch")?.trim() ?? "";

    if (userSearch) {
      if (userSearch.length < 2) {
        return NextResponse.json({ users: [] });
      }

      const { data, error } = await supabaseAdmin.rpc(
        "admin_search_seller_users",
        {
          p_query: userSearch,
          p_limit: 12,
        }
      );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        users: data ?? [],
      });
    }

    const { data: campaigns, error } =
      await supabaseAdmin
        .from("seller_fee_campaigns")
        .select(`
          id,
          name,
          user_id,
          fee_bps,
          priority,
          starts_at,
          ends_at,
          is_active,
          created_by,
          created_at,
          updated_at
        `)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const userIds = Array.from(
      new Set(
        (campaigns ?? [])
          .map((campaign) => campaign.user_id)
          .filter(
            (value): value is string =>
              typeof value === "string"
          )
      )
    );

    const userMap = new Map<
      string,
      {
        id: string;
        email: string | null;
        full_name: string | null;
        username: string | null;
      }
    >();

    for (const userId of userIds) {
      const [
        { data: profile },
        { data: authData },
      ] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, full_name, username")
          .eq("id", userId)
          .maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(userId),
      ]);

      userMap.set(userId, {
        id: userId,
        email: authData.user?.email ?? null,
        full_name: profile?.full_name ?? null,
        username: profile?.username ?? null,
      });
    }

    return NextResponse.json({
      campaigns: (campaigns ?? []).map((campaign) => ({
        ...campaign,
        user: campaign.user_id
          ? userMap.get(campaign.user_id) ?? null
          : null,
      })),
    });
  } catch (error) {
    console.error(
      "Kunne ikke hente sælgerkampagner:",
      error
    );

    return NextResponse.json(
      {
        error: "Kampagnerne kunne ikke hentes.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin(request);

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body =
      (await request.json()) as CampaignBody;

    const name = body.name?.trim();
    const userId = body.userId?.trim() || null;

    if (!name) {
      return NextResponse.json(
        { error: "Angiv et navn til kampagnen." },
        { status: 400 }
      );
    }

    if (
      typeof body.feePercent !== "number" ||
      !Number.isFinite(body.feePercent) ||
      body.feePercent < 0 ||
      body.feePercent > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Sælgergebyret skal være mellem 0 og 100 %.",
        },
        { status: 400 }
      );
    }

    if (!body.startsAt) {
      return NextResponse.json(
        { error: "Angiv kampagnens startdato." },
        { status: 400 }
      );
    }

    const startsAt = new Date(body.startsAt);

    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json(
        { error: "Startdatoen er ugyldig." },
        { status: 400 }
      );
    }

    let endsAt: Date | null = null;

    if (body.endsAt) {
      endsAt = new Date(body.endsAt);

      if (Number.isNaN(endsAt.getTime())) {
        return NextResponse.json(
          { error: "Slutdatoen er ugyldig." },
          { status: 400 }
        );
      }

      if (endsAt <= startsAt) {
        return NextResponse.json(
          {
            error:
              "Slutdatoen skal ligge efter startdatoen.",
          },
          { status: 400 }
        );
      }
    }

    if (userId) {
      const { data: userProfile } =
        await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

      if (!userProfile) {
        return NextResponse.json(
          { error: "Den valgte bruger findes ikke." },
          { status: 400 }
        );
      }
    }

    const feeBps = Math.round(
      body.feePercent * 100
    );

    const priority =
      Number.isInteger(body.priority)
        ? body.priority!
        : 0;

    const { data: campaign, error } =
      await supabaseAdmin
        .from("seller_fee_campaigns")
        .insert({
          name,
          user_id: userId,
          fee_bps: feeBps,
          priority,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt
            ? endsAt.toISOString()
            : null,
          is_active: true,
          created_by: auth.user.id,
        })
        .select()
        .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      campaign,
    });
  } catch (error) {
    console.error(
      "Kunne ikke oprette sælgerkampagne:",
      error
    );

    return NextResponse.json(
      {
        error: "Kampagnen kunne ikke oprettes.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin(request);

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body =
      (await request.json()) as UpdateCampaignBody;

    if (!body.id) {
      return NextResponse.json(
        { error: "Kampagne-id mangler." },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          { error: "Kampagnen skal have et navn." },
          { status: 400 }
        );
      }

      updates.name = name;
    }

    if (typeof body.feePercent === "number") {
      if (
        !Number.isFinite(body.feePercent) ||
        body.feePercent < 0 ||
        body.feePercent > 100
      ) {
        return NextResponse.json(
          {
            error:
              "Sælgergebyret skal være mellem 0 og 100 %.",
          },
          { status: 400 }
        );
      }

      updates.fee_bps = Math.round(
        body.feePercent * 100
      );
    }

    if (typeof body.priority === "number") {
      if (!Number.isInteger(body.priority)) {
        return NextResponse.json(
          { error: "Prioritet skal være et helt tal." },
          { status: 400 }
        );
      }

      updates.priority = body.priority;
    }

    if (typeof body.isActive === "boolean") {
      updates.is_active = body.isActive;
    }

    if (body.startsAt) {
      const startsAt = new Date(body.startsAt);

      if (Number.isNaN(startsAt.getTime())) {
        return NextResponse.json(
          { error: "Startdatoen er ugyldig." },
          { status: 400 }
        );
      }

      updates.starts_at = startsAt.toISOString();
    }

    if (body.endsAt !== undefined) {
      if (!body.endsAt) {
        updates.ends_at = null;
      } else {
        const endsAt = new Date(body.endsAt);

        if (Number.isNaN(endsAt.getTime())) {
          return NextResponse.json(
            { error: "Slutdatoen er ugyldig." },
            { status: 400 }
          );
        }

        updates.ends_at = endsAt.toISOString();
      }
    }

    const { data: campaign, error } =
      await supabaseAdmin
        .from("seller_fee_campaigns")
        .update(updates)
        .eq("id", body.id)
        .select()
        .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      campaign,
    });
  } catch (error) {
    console.error(
      "Kunne ikke opdatere sælgerkampagne:",
      error
    );

    return NextResponse.json(
      {
        error: "Kampagnen kunne ikke opdateres.",
      },
      { status: 500 }
    );
  }
}