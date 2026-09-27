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

    // En konto må ikke lukkes, mens der stadig er en handel, som kræver
    // handling eller en udbetaling. Afsluttede/cancelled handler blokerer ikke.
    const { data: relatedOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id,status,payment_status,fulfillment_status,payout_status")
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

    // Profilrækken beholdes for referentiel/historisk sammenhæng, men alle
    // personlige/offentlige oplysninger anonymiseres.
    const anonymousUsername = `slettet-bruger-${userId.replace(/-/g, "").slice(0, 12)}`;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: "Slettet bruger",
        username: anonymousUsername,
        avatar_url: null,
        phone: null,
        address: null,
        postal_code: null,
        city: null,
        latitude: null,
        longitude: null,
        location_visibility: "hidden",
        phone_verified: false,
        identity_verified: false,
        stripe_account_id: null,
        stripe_details_submitted: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Kunne ikke anonymisere profil:", profileError);
      return jsonError(
        "Kontoen kunne ikke anonymiseres. Prøv igen om lidt.",
        500
      );
    }

    // Auth-brugeren slettes til sidst. Historiske public-rækker bevares.
    const { error: deleteUserError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("Kunne ikke slette Supabase Auth-bruger:", deleteUserError);
      return jsonError(
        "Profilen og annoncerne er anonymiseret, men login-kontoen kunne ikke slettes automatisk. Kontakt Equishopper support.",
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
