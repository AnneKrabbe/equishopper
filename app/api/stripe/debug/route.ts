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
      console.error("Stripe debug: profil kunne ikke hentes", profileError);
      return NextResponse.json(
        { error: "Kunne ikke hente Stripe-oplysninger fra profilen." },
        { status: 500 }
      );
    }

    const platformAccount = await stripe.accounts.retrieve();

    let connectedAccountCheck:
      | {
          storedAccount: string | null;
          accessible: boolean;
          livemode: boolean | null;
          detailsSubmitted: boolean | null;
          payoutsEnabled: boolean | null;
          reason?: string;
        }
      | null = null;

    if (profile?.stripe_account_id) {
      try {
        const connectedAccount = await stripe.accounts.retrieve(
          profile.stripe_account_id
        );

        connectedAccountCheck = {
          storedAccount: maskId(profile.stripe_account_id),
          accessible: !connectedAccount.deleted,
          livemode: connectedAccount.deleted ? null : connectedAccount.livemode,
          detailsSubmitted: connectedAccount.deleted
            ? null
            : connectedAccount.details_submitted,
          payoutsEnabled: connectedAccount.deleted
            ? null
            : connectedAccount.payouts_enabled,
        };
      } catch (error) {
        console.error("Stripe debug: connected account kan ikke tilgås", error);

        connectedAccountCheck = {
          storedAccount: maskId(profile.stripe_account_id),
          accessible: false,
          livemode: null,
          detailsSubmitted: null,
          payoutsEnabled: null,
          reason:
            "Den Stripe-konto, der er gemt på profilen, kan ikke tilgås med den aktive STRIPE_SECRET_KEY.",
        };
      }
    }

    if (platformAccount.deleted) {
      return NextResponse.json(
        { error: "Stripe-platformkontoen er markeret som slettet." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      environment: platformAccount.livemode ? "live" : "test",
      platform: {
        account: maskId(platformAccount.id),
        country: platformAccount.country ?? null,
        email: platformAccount.email ?? null,
        displayName:
          platformAccount.settings?.dashboard?.display_name ??
          platformAccount.business_profile?.name ??
          null,
      },
      connectedAccount: connectedAccountCheck,
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