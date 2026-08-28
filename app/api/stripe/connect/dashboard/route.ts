import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ProfileRow = {
  stripe_account_id: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Du skal være logget ind." },
        { status: 401 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      throw new Error("Din profil kunne ikke hentes.");
    }

    const profile = data as ProfileRow;

    if (!profile.stripe_account_id) {
      return NextResponse.json(
        {
          error: "Du skal først forbinde din Stripe-konto.",
          needsOnboarding: true,
        },
        { status: 409 },
      );
    }

    try {
      const account = await stripe.accounts.retrieve(
        profile.stripe_account_id,
      );

      if ("deleted" in account && account.deleted) {
        return NextResponse.json(
          {
            error: "Din Stripe-konto skal forbindes igen.",
            needsOnboarding: true,
          },
          { status: 409 },
        );
      }
    } catch (error) {
      /*
       * Typisk når profilen stadig indeholder et acct_... fra Stripe test,
       * mens serveren nu kører med live-nøglen.
       */
      if (isMissingStripeResourceError(error)) {
        return NextResponse.json(
          {
            error: "Din Stripe-konto skal forbindes igen i live-miljøet.",
            needsOnboarding: true,
          },
          { status: 409 },
        );
      }

      throw error;
    }

    const loginLink = await stripe.accounts.createLoginLink(
      profile.stripe_account_id,
    );

    return NextResponse.json({
      url: loginLink.url,
    });
  } catch (error) {
    console.error("Stripe Express Dashboard-fejl:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe-kontoen kunne ikke åbnes.",
      },
      { status: 400 },
    );
  }
}

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
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
    },
  );

  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

function isMissingStripeResourceError(error: unknown) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}
