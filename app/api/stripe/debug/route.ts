import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

function maskId(value: string | null | undefined) {
  if (!value) return null;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 5)}…${value.slice(-4)}`;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Ikke logget ind." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Kunne ikke hente Stripe-oplysninger fra profilen." },
        { status: 500 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
    const environment = secretKey.startsWith("sk_live_")
      ? "live"
      : secretKey.startsWith("sk_test_")
        ? "test"
        : "ukendt";

    let connectedAccount: {
      storedAccount: string | null;
      accessible: boolean;
      detailsSubmitted: boolean | null;
      payoutsEnabled: boolean | null;
      reason?: string;
    } | null = null;

    if (profile?.stripe_account_id) {
      try {
        const account = await stripe.accounts.retrieve(
          profile.stripe_account_id
        );

        if ("deleted" in account && account.deleted) {
          connectedAccount = {
            storedAccount: maskId(profile.stripe_account_id),
            accessible: false,
            detailsSubmitted: null,
            payoutsEnabled: null,
            reason: "Den gemte Stripe-konto er slettet.",
          };
        } else {
          connectedAccount = {
            storedAccount: maskId(profile.stripe_account_id),
            accessible: true,
            detailsSubmitted: account.details_submitted,
            payoutsEnabled: account.payouts_enabled,
          };
        }
      } catch (error) {
        console.error("Stripe debug: connected account kan ikke tilgås", error);

        connectedAccount = {
          storedAccount: maskId(profile.stripe_account_id),
          accessible: false,
          detailsSubmitted: null,
          payoutsEnabled: null,
          reason:
            "Den gemte Stripe-konto kan ikke tilgås med den aktive STRIPE_SECRET_KEY.",
        };
      }
    }

    return NextResponse.json({
      ok: true,
      environment,
      connectedAccount,
    });
  } catch (error) {
    console.error("Stripe debug route fejlede", error);

    return NextResponse.json(
      {
        error:
          "Stripe-diagnosen fejlede. Se Vercel-loggen for den tekniske fejl.",
      },
      { status: 500 }
    );
  }
}
