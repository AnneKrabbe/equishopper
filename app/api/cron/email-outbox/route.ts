import { NextRequest, NextResponse } from "next/server";

import { sendEmailFromOutbox } from "@/lib/email/email-service";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;

type EmailOutboxRow = {
  id: string;
  template_key: string;
  payload: unknown;
  attempts: number;
};

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[email-outbox] CRON_SECRET mangler.");
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function processEmail(row: EmailOutboxRow) {
  const nextAttempt = (row.attempts ?? 0) + 1;

  try {
    await sendEmailFromOutbox(row.template_key, row.payload);

    const { error } = await supabaseAdmin
      .from("email_outbox")
      .update({
        status: "sent",
        attempts: nextAttempt,
        last_error: null,
        sent_at: new Date().toISOString(),
        processing_started_at: null,
      })
      .eq("id", row.id)
      .eq("status", "processing");

    if (error) {
      throw new Error(
        `Mailen blev sendt, men outbox-rækken kunne ikke markeres som sent: ${error.message}`,
      );
    }

    return { id: row.id, status: "sent" as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ukendt fejl ved e-mailudsendelse";

    const finalStatus = nextAttempt >= MAX_ATTEMPTS ? "failed" : "failed";

    const { error: updateError } = await supabaseAdmin
      .from("email_outbox")
      .update({
        status: finalStatus,
        attempts: nextAttempt,
        last_error: message.slice(0, 4000),
        processing_started_at: null,
      })
      .eq("id", row.id)
      .eq("status", "processing");

    if (updateError) {
      console.error(
        `[email-outbox] Kunne ikke gemme fejlstatus for ${row.id}:`,
        updateError,
      );
    }

    console.error(
      `[email-outbox] Mail ${row.id} fejlede på forsøg ${nextAttempt}/${MAX_ATTEMPTS}:`,
      error,
    );

    return {
      id: row.id,
      status: "failed" as const,
      attempts: nextAttempt,
      error: message,
    };
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.rpc("claim_email_outbox_batch", {
    p_limit: BATCH_SIZE,
  });

  if (error) {
    console.error("[email-outbox] Kunne ikke claime mails:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente email-outbox." },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as EmailOutboxRow[];

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      claimed: 0,
      sent: 0,
      failed: 0,
    });
  }

  const results = [];

  // Bevidst sekventielt: mere skånsomt mod Resend og lettere at fejlsøge.
  for (const row of rows) {
    results.push(await processEmail(row));
  }

  const sent = results.filter((result) => result.status === "sent").length;
  const failed = results.filter((result) => result.status === "failed").length;

  return NextResponse.json({
    ok: true,
    claimed: rows.length,
    sent,
    failed,
    results,
  });
}
