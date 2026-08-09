import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Du skal være logget ind." },
        { status: 401 }
      );
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
      error: userError,
    } = await supabaseUser.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Din session er udløbet." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user.id)
        .single();

    if (profileError) {
      throw profileError;
    }

    if (!profile?.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    const account = await stripe.accounts.retrieve(
      profile.stripe_account_id
    );

    if ("deleted" in account && account.deleted) {
      throw new Error("Stripe-kontoen er slettet.");
    }

    const onboardingCompleted =
      account.details_submitted &&
      account.payouts_enabled;

    const { error: updateError } =
      await supabaseAdmin
        .from("profiles")
        .update({
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
        .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      connected: true,
      detailsSubmitted:
        account.details_submitted,
      chargesEnabled:
        account.charges_enabled,
      payoutsEnabled:
        account.payouts_enabled,
      requirementsCurrentlyDue:
        account.requirements?.currently_due ?? [],
      requirementsPastDue:
        account.requirements?.past_due ?? [],
    });
  } catch (error) {
    console.error(
      "Stripe Connect status-fejl:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe-status kunne ikke hentes.",
      },
      { status: 400 }
    );
  }
}