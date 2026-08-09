import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ProfileRow = {
  id: string;
  full_name: string | null;
  seller_type: string | null;
  stripe_account_id: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Du skal være logget ind." },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        seller_type,
        stripe_account_id
      `)
      .eq("id", user.id)
      .single();

    if (error || !data) {
      throw new Error("Din profil kunne ikke hentes.");
    }

    const profile = data as ProfileRow;
    let stripeAccountId = profile.stripe_account_id;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "DK",
        email: user.email ?? undefined,

        business_type:
          profile.seller_type === "business"
            ? "company"
            : "individual",

        capabilities: {
          transfers: {
            requested: true,
          },
        },

        business_profile: {
          name: profile.full_name ?? undefined,
          product_description:
            "Salg af rideudstyr via Equishopper",
        },

        metadata: {
          equishopper_profile_id: user.id,
        },
      });

      stripeAccountId = account.id;

      await saveStripeStatus(user.id, account);
    } else {
      const account = await stripe.accounts.retrieve(
        stripeAccountId
      );

      if ("deleted" in account && account.deleted) {
        throw new Error(
          "Din tidligere Stripe-konto er slettet. Kontakt Equishopper."
        );
      }

      await saveStripeStatus(user.id, account);
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      request.nextUrl.origin;

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      refresh_url: `${appUrl}/stripe/connect/refresh`,
      return_url: `${appUrl}/stripe/connect/return`,
    });

    return NextResponse.json({
      url: accountLink.url,
    });
  } catch (error) {
    console.error("Stripe Connect onboarding-fejl:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe-onboarding kunne ikke startes.",
      },
      { status: 400 }
    );
  }
}

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken =
    authorization.slice("Bearer ".length);

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
    error,
  } = await supabaseUser.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

async function saveStripeStatus(
  profileId: string,
  account: Stripe.Account
) {
  const onboardingCompleted =
    account.details_submitted &&
    account.payouts_enabled;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      stripe_account_id: account.id,
      stripe_details_submitted:
        account.details_submitted,
      stripe_charges_enabled:
        account.charges_enabled,
      stripe_payouts_enabled:
        account.payouts_enabled,
      stripe_onboarding_completed_at:
        onboardingCompleted
          ? new Date().toISOString()
          : null,
      stripe_account_updated_at:
        new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    throw new Error(
      "Stripe-status kunne ikke gemmes."
    );
  }
}