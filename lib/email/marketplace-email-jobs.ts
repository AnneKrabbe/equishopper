import { sendMarketplaceAlertEmail } from "@/lib/email/email-service";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { MarketplaceAlertProps } from "@/emails/templates/marketplace-alert";

type MarketplaceEmailJob = {
  id: string;
  claim_token: string;
  kind: MarketplaceAlertProps["kind"];
  listing_id: string;
  title: string;
  email: string | null;
  previous_price: number | null;
  new_price: number | null;
  attempts: number;
  expired: boolean;
};

export async function processMarketplaceEmailJobs() {
  const { data, error } = await supabaseAdmin.rpc("claim_marketplace_email_jobs", { p_limit: 15 });
  if (error) {
    console.error("[marketplace-email] Kunne ikke hente mails:", error.code);
    return { error: true };
  }

  const totals = { sent: 0, skipped: 0, failed: 0, retrying: 0 };
  for (const row of (data ?? []) as MarketplaceEmailJob[]) {
    let outcome: "sent" | "skipped" | "failed" =
      row.expired || row.attempts > 5 ? "failed" : "skipped";
    try {
      if (row.email) {
        await sendMarketplaceAlertEmail(row.email, {
          kind: row.kind,
          title: row.title,
          listingId: row.listing_id,
          previousPrice: row.previous_price,
          newPrice: row.new_price,
        }, row.id);
        outcome = "sent";
      }
    } catch {
      console.warn("[marketplace-email] Forsendelsen fejlede:", row.id);
      if (row.attempts < 5) {
        totals.retrying++;
        continue;
      }
      outcome = "failed";
    }

    const { error: saveError } = await supabaseAdmin.from("marketplace_email_jobs")
      .update({ outcome, completed_at: new Date().toISOString(), claim_token: null })
      .eq("id", row.id)
      .eq("claim_token", row.claim_token);
    if (saveError) {
      console.error("[marketplace-email] Kunne ikke gemme status:", row.id, saveError.code);
      totals.retrying++;
      continue;
    }

    totals[outcome]++;
  }

  return totals;
}
