import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

const ALLOWED_STAGES = new Set([
  "seller_item_before_packing",
  "seller_item_in_packaging",
  "seller_sealed_package",
  "seller_shipping_label",
  "buyer_package_on_arrival",
  "buyer_unboxing",
  "buyer_item_on_arrival",
  "buyer_return_item",
  "buyer_return_packaging",
  "buyer_return_sealed_package",
  "seller_return_package_received",
  "seller_return_item_received",
]);

const SELLER_STAGES = new Set([
  "seller_item_before_packing",
  "seller_item_in_packaging",
  "seller_sealed_package",
  "seller_shipping_label",
  "seller_return_package_received",
  "seller_return_item_received",
]);

const BUYER_STAGES = new Set([
  "buyer_package_on_arrival",
  "buyer_unboxing",
  "buyer_item_on_arrival",
  "buyer_return_item",
  "buyer_return_packaging",
  "buyer_return_sealed_package",
]);

const ACTIVE_DISPUTE_STATUSES = new Set([
  "open",
  "awaiting_buyer",
  "awaiting_seller",
  "under_review",
]);

const CLOSED_DISPUTE_STATUSES = new Set([
  "resolved_buyer",
  "resolved_seller",
  "partially_refunded",
  "closed",
]);

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type OrderAccessRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  payment_status: string | null;
  fulfillment_status: string | null;
};

type DisputeAccessRow = {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  created_at: string;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  let uploadedStoragePath: string | null = null;

  try {
    const { orderId } = await context.params;

    if (!isUuid(orderId)) {
      return NextResponse.json(
        { error: "Ordre-id er ugyldigt." },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Du skal være logget ind." },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const evidenceStage = formData.get("evidenceStage");
    const requestedDisputeIdValue = formData.get("disputeId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Der mangler en fil." },
        { status: 400 },
      );
    }

    if (
      typeof evidenceStage !== "string" ||
      !ALLOWED_STAGES.has(evidenceStage)
    ) {
      return NextResponse.json(
        { error: "Dokumentationstrinnet er ugyldigt." },
        { status: 400 },
      );
    }

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Filtypen understøttes ikke. Brug JPG, PNG, WebP, HEIC, MP4, WebM eller MOV.",
        },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Filen skal være mellem 1 byte og 100 MB." },
        { status: 400 },
      );
    }

    const requestedDisputeId =
      typeof requestedDisputeIdValue === "string" &&
      requestedDisputeIdValue.trim()
        ? requestedDisputeIdValue.trim()
        : null;

    if (requestedDisputeId && !isUuid(requestedDisputeId)) {
      return NextResponse.json(
        { error: "Tvist-id er ugyldigt." },
        { status: 400 },
      );
    }

    const { data: orderData, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .select(`
          id,
          buyer_id,
          seller_id,
          payment_status,
          fulfillment_status
        `)
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
      throw new Error(orderError.message);
    }

    const order = orderData as OrderAccessRow | null;

    if (!order) {
      return NextResponse.json(
        { error: "Ordren blev ikke fundet." },
        { status: 404 },
      );
    }

    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;

    if (!isBuyer && !isSeller) {
      return NextResponse.json(
        { error: "Du har ikke adgang til denne ordre." },
        { status: 403 },
      );
    }

    if (
      (SELLER_STAGES.has(evidenceStage) && !isSeller) ||
      (BUYER_STAGES.has(evidenceStage) && !isBuyer)
    ) {
      return NextResponse.json(
        {
          error:
            "Dette dokumentationstrin tilhører den anden part i handlen.",
        },
        { status: 403 },
      );
    }

    /*
     * Find den senest oprettede tvist på ordren.
     *
     * Hvis en aktiv tvist findes, knyttes uploaden automatisk til den,
     * også selv om klienten ikke sender disputeId.
     */
    const { data: latestDisputeData, error: latestDisputeError } =
      await supabaseAdmin
        .from("disputes")
        .select(`
          id,
          order_id,
          buyer_id,
          seller_id,
          status,
          created_at
        `)
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (latestDisputeError) {
      throw new Error(latestDisputeError.message);
    }

    const latestDispute =
      (latestDisputeData as DisputeAccessRow | null) ?? null;

    let activeDispute: DisputeAccessRow | null = null;

    if (requestedDisputeId) {
      const { data: requestedDisputeData, error: requestedDisputeError } =
        await supabaseAdmin
          .from("disputes")
          .select(`
            id,
            order_id,
            buyer_id,
            seller_id,
            status,
            created_at
          `)
          .eq("id", requestedDisputeId)
          .maybeSingle();

      if (requestedDisputeError) {
        throw new Error(requestedDisputeError.message);
      }

      const requestedDispute =
        (requestedDisputeData as DisputeAccessRow | null) ?? null;

      if (
        !requestedDispute ||
        requestedDispute.order_id !== order.id ||
        (requestedDispute.buyer_id !== user.id &&
          requestedDispute.seller_id !== user.id)
      ) {
        return NextResponse.json(
          { error: "Tvisten matcher ikke ordren." },
          { status: 403 },
        );
      }

      if (!ACTIVE_DISPUTE_STATUSES.has(requestedDispute.status)) {
        return NextResponse.json(
          {
            error:
              "Tvisten er afsluttet. Der kan ikke tilføjes mere dokumentation.",
          },
          { status: 409 },
        );
      }

      activeDispute = requestedDispute;
    } else if (
      latestDispute &&
      ACTIVE_DISPUTE_STATUSES.has(latestDispute.status)
    ) {
      activeDispute = latestDispute;
    } else if (
      latestDispute &&
      CLOSED_DISPUTE_STATUSES.has(latestDispute.status)
    ) {
      return NextResponse.json(
        {
          error:
            "Tvisten er afsluttet. Der kan ikke tilføjes mere dokumentation.",
        },
        { status: 409 },
      );
    }

    const extension = getSafeExtension(file);
    const storagePath = [
      order.id,
      evidenceStage,
      user.id,
      `${Date.now()}-${crypto.randomUUID()}.${extension}`,
    ].join("/");

    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from("order-evidence")
        .upload(storagePath, bytes, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      throw new Error(
        `Filen kunne ikke uploades: ${uploadError.message}`,
      );
    }

    uploadedStoragePath = storagePath;

    const { data: evidence, error: insertError } =
      await supabaseAdmin
        .from("order_evidence")
        .insert({
          order_id: order.id,
          dispute_id: activeDispute?.id ?? null,
          uploaded_by: user.id,
          evidence_stage: evidenceStage,
          storage_path: storagePath,
          file_name: sanitizeFileName(file.name),
          content_type: file.type,
          file_size: file.size,
        })
        .select(`
          id,
          order_id,
          dispute_id,
          uploaded_by,
          evidence_stage,
          storage_path,
          file_name,
          content_type,
          file_size,
          description,
          created_at
        `)
        .single();

    if (insertError) {
      throw new Error(
        `Dokumentationen kunne ikke registreres: ${insertError.message}`,
      );
    }

    /*
     * Hvis uploaden sker under en aktiv tvist, registreres den også
     * i tvistens tidslinje. Fejl her må ikke slette en ellers gyldig fil.
     */
    if (activeDispute) {
      const { error: eventError } =
        await supabaseAdmin
          .from("dispute_events")
          .insert({
            dispute_id: activeDispute.id,
            actor_id: user.id,
            event_type: "evidence_uploaded",
            message: `Ny dokumentation uploadet: ${sanitizeFileName(
              file.name,
            )}`,
            is_internal: false,
            metadata: {
              evidence_id: evidence.id,
              order_id: order.id,
              evidence_stage: evidenceStage,
              file_name: sanitizeFileName(file.name),
              content_type: file.type,
              file_size: file.size,
              uploaded_after_dispute: true,
            },
          });

      if (eventError) {
        console.error(
          "Dokumentationen blev gemt, men tvist-eventet kunne ikke oprettes:",
          eventError,
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        evidence,
        attachedToDispute: Boolean(activeDispute),
        disputeId: activeDispute?.id ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Ordredokumentation kunne ikke gemmes:", error);

    if (uploadedStoragePath) {
      const { error: cleanupError } =
        await supabaseAdmin.storage
          .from("order-evidence")
          .remove([uploadedStoragePath]);

      if (cleanupError) {
        console.error(
          "Den uploadede fil kunne ikke ryddes op:",
          cleanupError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Dokumentationen kunne ikke gemmes.",
      },
      { status: 400 },
    );
  }
}

async function getAuthenticatedUser(
  request: NextRequest,
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

function getSafeExtension(file: File) {
  const fromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (fromName) {
    return fromName;
  }

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };

  return extensionByType[file.type] ?? "bin";
}

function sanitizeFileName(value: string) {
  const trimmed = value.trim().slice(0, 180);

  return (
    trimmed.replace(/[^\p{L}\p{N}._ -]/gu, "_") ||
    "dokumentation"
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}