"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  X,
} from "lucide-react";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

type FulfillmentStatus =
  | "pending"
  | "awaiting_shipment"
  | "ready_for_pickup"
  | "shipped"
  | "completed"
  | "cancelled"
  | "disputed";

type OrderRow = {
  id: string;
  created_at: string;
  seller_id: string;
  status: string | null;
  payment_status: string | null;
  fulfillment_status: FulfillmentStatus | null;
  shipping_method: "shipping" | "pickup" | string | null;
  subtotal: number | string | null;
  shipping_price: number | string | null;
  buyer_protection_fee: number | string | null;
  total: number | string | null;
  currency: string | null;
  shipping_name: string | null;
  shipping_address_line1: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_phone: string | null;
  shipping_note: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  ready_for_pickup_at: string | null;
  buyer_confirmed_at: string | null;
  completed_at: string | null;
  payout_status: string | null;
  stripe_transfer_id: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  listing_id: string;
  title_snapshot: string;
  unit_price: number | string;
  quantity: number;
};

type ListingImageRow = {
  listing_id: string;
  image_url: string;
  sort_order: number | null;
};

type ReviewRow = {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: number;
  comment: string | null;
  review_type: string | null;
  created_at: string;
};

type OrderView = OrderRow & {
  items: Array<
    OrderItemRow & {
      imageUrl: string | null;
    }
  >;
};

const STATUS_ORDER: FulfillmentStatus[] = [
  "pending",
  "awaiting_shipment",
  "ready_for_pickup",
  "shipped",
  "completed",
  "disputed",
  "cancelled",
];

export default function MyOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<
    string | null
  >(null);
  const [expandedOrderId, setExpandedOrderId] = useState<
    string | null
  >(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null,
  );
  const [reviewsByOrderId, setReviewsByOrderId] = useState<
    Record<string, ReviewRow>
  >({});
  const [activeDisputeByOrderId, setActiveDisputeByOrderId] = useState<
    Record<string, string>
  >({});
  const [reviewOrder, setReviewOrder] = useState<OrderView | null>(
    null,
  );
  const [disputeIntroOrder, setDisputeIntroOrder] =
    useState<OrderView | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    void loadOrders();
  }, []);

  async function loadOrders(options?: { silent?: boolean }) {
    try {
      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.push("/login?redirect=/mine-ordrer");
        return;
      }

      setCurrentUserId(user.id);

      const { data: orderData, error: ordersError } =
        await supabase
          .from("orders")
          .select(`
            id,
            created_at,
            seller_id,
            status,
            payment_status,
            fulfillment_status,
            shipping_method,
            subtotal,
            shipping_price,
            buyer_protection_fee,
            total,
            currency,
            shipping_name,
            shipping_address_line1,
            shipping_postal_code,
            shipping_city,
            shipping_phone,
            shipping_note,
            shipping_carrier,
            tracking_number,
            paid_at,
            shipped_at,
            ready_for_pickup_at,
            buyer_confirmed_at,
            completed_at,
            payout_status,
            stripe_transfer_id
          `)
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      const orderRows = (orderData ?? []) as OrderRow[];

      if (orderRows.length === 0) {
        setOrders([]);
        setReviewsByOrderId({});
        setActiveDisputeByOrderId({});
        return;
      }

      const orderIds = orderRows.map((order) => order.id);

      const { data: disputeData, error: disputesError } =
        await supabase
          .from("disputes")
          .select("id, order_id, status")
          .in("order_id", orderIds)
          .in("status", [
            "open",
            "awaiting_buyer",
            "awaiting_seller",
            "under_review",
          ]);

      if (disputesError) {
        throw disputesError;
      }

      const disputeMap: Record<string, string> = {};

      for (const dispute of disputeData ?? []) {
        disputeMap[dispute.order_id] = dispute.id;
      }

      setActiveDisputeByOrderId(disputeMap);

      const { data: reviewData, error: reviewsError } =
        await supabase
          .from("reviews")
          .select(`
            id,
            order_id,
            reviewer_id,
            reviewed_user_id,
            rating,
            comment,
            review_type,
            created_at
          `)
          .eq("reviewer_id", user.id)
          .in("order_id", orderIds);

      if (reviewsError) {
        throw reviewsError;
      }

      const reviewMap: Record<string, ReviewRow> = {};

      for (const review of (reviewData ?? []) as ReviewRow[]) {
        reviewMap[review.order_id] = review;
      }

      setReviewsByOrderId(reviewMap);

      const { data: itemData, error: itemsError } =
        await supabase
          .from("order_items")
          .select(`
            id,
            order_id,
            listing_id,
            title_snapshot,
            unit_price,
            quantity
          `)
          .in("order_id", orderIds)
          .order("id", { ascending: true });

      if (itemsError) {
        throw itemsError;
      }

      const itemRows = (itemData ?? []) as OrderItemRow[];
      const listingIds = Array.from(
        new Set(itemRows.map((item) => item.listing_id)),
      );

      let imageRows: ListingImageRow[] = [];

      if (listingIds.length > 0) {
        const { data: imageData, error: imagesError } =
          await supabase
            .from("listing_images")
            .select("listing_id, image_url, sort_order")
            .in("listing_id", listingIds)
            .order("sort_order", { ascending: true });

        if (imagesError) {
          console.error(
            "Kunne ikke hente ordrebilleder:",
            imagesError,
          );
        } else {
          imageRows = (imageData ?? []) as ListingImageRow[];
        }
      }

      const firstImageByListing = new Map<string, string>();

      for (const image of imageRows) {
        if (!firstImageByListing.has(image.listing_id)) {
          firstImageByListing.set(
            image.listing_id,
            image.image_url,
          );
        }
      }

      const orderViews: OrderView[] = orderRows.map((order) => ({
        ...order,
        items: itemRows
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            ...item,
            imageUrl:
              firstImageByListing.get(item.listing_id) ?? null,
          })),
      }));

      setOrders(orderViews);
    } catch (error) {
      console.error("Kunne ikke hente ordrer:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Dine ordrer kunne ikke hentes.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

 async function confirmReceived(orderId: string) {
  try {
    setConfirmingOrderId(orderId);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      router.push(
        `/login?redirect=/mine-ordrer`
      );
      return;
    }

    const response = await fetch(
      `/api/orders/${encodeURIComponent(
        orderId
      )}/confirm-received`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
        },
      }
    );

    const result = (await response
      .json()
      .catch(() => null)) as
      | {
          success?: boolean;
          alreadyCompleted?: boolean;
          transferId?: string;
          message?: string;
          error?: string;
        }
      | null;

    if (!response.ok) {
      throw new Error(
        result?.error ||
          "Ordren kunne ikke afsluttes."
      );
    }

    setSuccessMessage(
      result?.message ||
        "Tak. Ordren er afsluttet, og betalingen er frigivet til sælgeren."
    );

    await loadOrders({ silent: true });
  } catch (error) {
    console.error(
      "Ordren kunne ikke markeres som modtaget:",
      error
    );

    setErrorMessage(
      error instanceof Error
        ? error.message
        : "Ordren kunne ikke markeres som modtaget."
    );
  } finally {
    setConfirmingOrderId(null);
  }
}

  function openReviewModal(order: OrderView) {
    setReviewOrder(order);
    setReviewRating(0);
    setHoveredRating(0);
    setReviewComment("");
    setReviewError("");
  }

  function closeReviewModal() {
    if (submittingReview) {
      return;
    }

    setReviewOrder(null);
    setReviewRating(0);
    setHoveredRating(0);
    setReviewComment("");
    setReviewError("");
  }

  async function submitReview() {
    if (!reviewOrder || submittingReview) {
      return;
    }

    if (!currentUserId) {
      setReviewError("Du skal være logget ind for at anmelde.");
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Vælg mellem 1 og 5 stjerner.");
      return;
    }

    const trimmedComment = reviewComment.trim();

    if (trimmedComment.length > 1000) {
      setReviewError("Din kommentar må højst være 1.000 tegn.");
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewError("");
      setErrorMessage("");
      setSuccessMessage("");

  const {
  data: { session },
  error: sessionError,
} = await supabase.auth.getSession();

if (sessionError) {
  throw sessionError;
}

if (!session) {
  router.push("/login?redirect=/mine-ordrer");
  return;
}

const response = await fetch("/api/reviews", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    orderId: reviewOrder.id,
    rating: reviewRating,
    comment: trimmedComment || null,
  }),
});

      const result = (await response.json().catch(() => null)) as
        | {
            error?: string;
            message?: string;
            review?: ReviewRow;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Anmeldelsen kunne ikke gemmes.",
        );
      }

      setSuccessMessage("Tak for din anmeldelse.");
      setReviewOrder(null);
      setReviewRating(0);
      setHoveredRating(0);
      setReviewComment("");
      setReviewError("");
      await loadOrders({ silent: true });
    } catch (error) {
      console.error("Anmeldelsen kunne ikke gemmes:", error);
      setReviewError(
        error instanceof Error
          ? error.message
          : "Anmeldelsen kunne ikke gemmes.",
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  const groupedOrders = useMemo(() => {
    const groups = new Map<FulfillmentStatus, OrderView[]>();

    for (const status of STATUS_ORDER) {
      groups.set(status, []);
    }

    for (const order of orders) {
      const status = getEffectiveStatus(order);
      groups.get(status)?.push(order);
    }

    return STATUS_ORDER.map((status) => ({
      status,
      orders: groups.get(status) ?? [],
    })).filter((group) => group.orders.length > 0);
  }, [orders]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f6f1]">
        <Header />

        <div className="flex min-h-[70vh] items-center justify-center pt-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#063f32]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-8 md:pt-36">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-[#b79a3d]">
              Købsoversigt
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[#063f32] md:text-5xl">
              Mine ordrer
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-stone-600">
              Følg dine køb, se leveringsoplysninger og bekræft,
              når varen er modtaget.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadOrders({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-[#063f32] px-5 py-3 text-sm font-semibold text-[#063f32] transition hover:bg-[#063f32] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Opdater
          </button>
        </div>

        {errorMessage && (
          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
            <p>{successMessage}</p>
          </div>
        )}

        {orders.length === 0 ? (
          <section className="mt-8 rounded-[30px] border border-[#eadfcb] bg-white p-10 text-center shadow-sm md:p-14">
            <ShoppingBag className="mx-auto h-12 w-12 text-[#d4af37]" />

            <h2 className="mt-5 font-serif text-3xl text-[#063f32]">
              Du har ingen ordrer endnu
            </h2>

            <p className="mt-3 text-stone-600">
              Når du køber en vare, kan du følge ordren her.
            </p>

            <Link
              href="/annoncer"
              className="mt-7 inline-flex rounded-full bg-[#d4af37] px-7 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
            >
              Se annoncer
            </Link>
          </section>
        ) : (
          <div className="mt-8 space-y-10">
            {groupedOrders.map((group) => (
              <section key={group.status}>
                <div className="mb-4 flex items-center gap-3">
                  <StatusIcon status={group.status} />

                  <div>
                    <h2 className="font-serif text-2xl text-[#063f32]">
                      {getStatusLabel(group.status)}
                    </h2>

                    <p className="text-sm text-stone-500">
                      {group.orders.length}{" "}
                      {group.orders.length === 1
                        ? "ordre"
                        : "ordrer"}
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {group.orders.map((order) => {
                    const effectiveStatus =
                      getEffectiveStatus(order);
                    const isExpanded =
                      expandedOrderId === order.id;
                    const activeDisputeId =
                      activeDisputeByOrderId[order.id];
                    const canOpenDispute =
                      order.payment_status === "paid" &&
                      order.fulfillment_status !== "completed" &&
                      order.payout_status !== "processing" &&
                      order.payout_status !== "paid" &&
                      !order.stripe_transfer_id &&
                      effectiveStatus !== "pending" &&
                      effectiveStatus !== "cancelled";
                    const canConfirm =
                      effectiveStatus === "shipped" ||
                      effectiveStatus === "ready_for_pickup";
                    const existingReview =
                      reviewsByOrderId[order.id];
                    const canReview =
                      effectiveStatus === "completed" &&
                      !existingReview;

                    return (
                      <article
                        key={order.id}
                        className="overflow-hidden rounded-[28px] border border-[#eadfcb] bg-white shadow-sm"
                      >
                        <div className="p-5 md:p-7">
                          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <StatusBadge
                                  status={effectiveStatus}
                                />

                                <span className="text-sm text-stone-500">
                                  {formatDate(order.created_at)}
                                </span>
                              </div>

                              <p className="mt-3 text-sm text-stone-500">
                                Ordre #
                                {order.id
                                  .slice(0, 8)
                                  .toUpperCase()}
                              </p>
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-sm text-stone-500">
                                Betalt i alt
                              </p>

                              <p className="mt-1 font-serif text-2xl text-[#063f32]">
                                {formatMoney(order.total)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 space-y-4">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex gap-4 rounded-2xl bg-[#f8f6f1] p-4"
                              >
                                <Link
                                  href={`/listing/${item.listing_id}`}
                                  className="h-24 w-20 flex-none overflow-hidden rounded-xl bg-[#eee8dc]"
                                >
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.title_snapshot}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center">
                                      <Package className="h-6 w-6 text-stone-400" />
                                    </div>
                                  )}
                                </Link>

                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={`/listing/${item.listing_id}`}
                                    className="font-serif text-lg text-[#063f32] hover:underline"
                                  >
                                    {item.title_snapshot}
                                  </Link>

                                  <p className="mt-2 text-sm text-stone-500">
                                    Antal: {item.quantity}
                                  </p>

                                  <p className="mt-2 font-semibold text-stone-800">
                                    {formatMoney(
                                      Number(item.unit_price) *
                                        item.quantity,
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <StatusExplanation
                            order={order}
                            status={effectiveStatus}
                          />

                          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrderId(
                                  isExpanded ? null : order.id,
                                )
                              }
                              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b5a47]"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}

                              {isExpanded
                                ? "Skjul detaljer"
                                : "Vis ordredetaljer"}
                            </button>

                            <div className="flex flex-col gap-3 sm:flex-row">
                              {activeDisputeId ? (
                                <Link
                                  href={`/profil/tvister/${activeDisputeId}`}
                                  className="inline-flex items-center justify-center gap-2 rounded-full border border-orange-300 px-6 py-3 font-semibold text-orange-800 transition hover:bg-orange-50"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Se tvist
                                </Link>
                              ) : (
                                canOpenDispute && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDisputeIntroOrder(order)
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-300 px-6 py-3 font-semibold text-red-700 transition hover:bg-red-50"
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                    Opret tvist
                                  </button>
                                )
                              )}

                              {canConfirm && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void confirmReceived(order.id)
                                  }
                                  disabled={
                                    confirmingOrderId === order.id
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3 font-semibold text-[#063f32] transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {confirmingOrderId === order.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <PackageCheck className="h-4 w-4" />
                                  )}

                                  {confirmingOrderId === order.id
                                    ? "Gemmer..."
                                    : "Jeg har modtaget varen"}
                                </button>
                              )}

                              {canReview && (
                                <button
                                  type="button"
                                  onClick={() => openReviewModal(order)}
                                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
                                >
                                  <Star className="h-4 w-4" />
                                  Skriv anmeldelse
                                </button>
                              )}

                              {existingReview && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
                                  <div className="flex items-center gap-1 text-[#b79a3d]">
                                    {Array.from({ length: 5 }).map(
                                      (_, index) => (
                                        <Star
                                          key={index}
                                          className={`h-4 w-4 ${
                                            index <
                                            existingReview.rating
                                              ? "fill-current"
                                              : ""
                                          }`}
                                        />
                                      ),
                                    )}
                                  </div>

                                  <p className="mt-1 text-sm font-medium text-emerald-800">
                                    Du har anmeldt denne handel
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <OrderDetails order={order} />
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {disputeIntroOrder && (
        <div
          className="fixed inset-0 z-[125] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispute-intro-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDisputeIntroOrder(null);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-[28px] border border-[#eadfcb] bg-[#fbfaf7] p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b79a3d]">
                  Før du opretter en tvist
                </p>

                <h2
                  id="dispute-intro-title"
                  className="mt-2 font-serif text-3xl text-[#063f32]"
                >
                  Se hvordan vi behandler tvister
                </h2>

                <p className="mt-3 text-sm leading-6 text-stone-600">
                  Vi anbefaler, at du læser vores guide, før du
                  opretter sagen. Her kan du se, hvad Equishopper
                  lægger vægt på, hvilke typer afgørelser der kan
                  træffes, og eksempler på typiske tvister.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDisputeIntroOrder(null)}
                className="rounded-full p-2 text-stone-500 transition hover:bg-white hover:text-[#063f32]"
                aria-label="Luk"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {disputeIntroOrder.items[0] && (
              <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[#eadfcb] bg-white p-4">
                <div className="h-16 w-14 flex-none overflow-hidden rounded-xl bg-[#eee8dc]">
                  {disputeIntroOrder.items[0].imageUrl ? (
                    <img
                      src={disputeIntroOrder.items[0].imageUrl}
                      alt={disputeIntroOrder.items[0].title_snapshot}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-5 w-5 text-stone-400" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#063f32]">
                    {disputeIntroOrder.items[0].title_snapshot}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Ordre #
                    {disputeIntroOrder.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-[#d4af37]/35 bg-[#fffdf7] p-5">
              <p className="text-sm font-semibold text-[#063f32]">
                Dokumentation er vigtig
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Husk at uploade den dokumentation, du bliver
                opfordret til i forbindelse med forsendelse,
                modtagelse og selve tvistsagen.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/hjaelp/tvister"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-full border border-[#0b5a47] px-5 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#edf4ef]"
              >
                Læs om tvistbehandling
              </Link>

              <Link
                href={`/profil/tvister/opret/${disputeIntroOrder.id}`}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-[#063f32] px-5 py-3.5 font-semibold text-white transition hover:bg-[#052f26]"
              >
                Fortsæt til opret tvist
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setDisputeIntroOrder(null)}
              className="mt-4 w-full text-center text-sm font-medium text-stone-500 transition hover:text-[#063f32]"
            >
              Annuller
            </button>
          </div>
        </div>
      )}

      {reviewOrder && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReviewModal();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-[28px] border border-[#eadfcb] bg-[#fbfaf7] p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#b79a3d]">
                  Anmeld handel
                </p>

                <h2
                  id="review-modal-title"
                  className="mt-2 font-serif text-3xl text-[#063f32]"
                >
                  Hvordan var oplevelsen?
                </h2>

                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Din anmeldelse hjælper andre købere med at handle
                  trygt på Equishopper.
                </p>
              </div>

              <button
                type="button"
                onClick={closeReviewModal}
                disabled={submittingReview}
                className="rounded-full p-2 text-stone-500 transition hover:bg-white hover:text-[#063f32] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Luk anmeldelse"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reviewOrder.items[0] && (
              <div className="mt-6 flex gap-4 rounded-2xl bg-white p-4">
                <div className="h-20 w-16 flex-none overflow-hidden rounded-xl bg-[#eee8dc]">
                  {reviewOrder.items[0].imageUrl ? (
                    <img
                      src={reviewOrder.items[0].imageUrl}
                      alt={reviewOrder.items[0].title_snapshot}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-5 w-5 text-stone-400" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="font-serif text-lg text-[#063f32]">
                    {reviewOrder.items[0].title_snapshot}
                  </p>

                  <p className="mt-1 text-sm text-stone-500">
                    Ordre #
                    {reviewOrder.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-7">
              <p className="text-sm font-semibold text-[#063f32]">
                Vælg antal stjerner
              </p>

              <div
                className="mt-3 flex gap-2"
                onMouseLeave={() => setHoveredRating(0)}
              >
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  const isActive =
                    value <= (hoveredRating || reviewRating);

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReviewRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      disabled={submittingReview}
                      className="rounded-full p-1 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`${value} ${
                        value === 1 ? "stjerne" : "stjerner"
                      }`}
                    >
                      <Star
                        className={`h-9 w-9 text-[#d4af37] ${
                          isActive ? "fill-current" : ""
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 min-h-5 text-sm text-stone-500">
                {getRatingLabel(reviewRating)}
              </p>
            </div>

            <div className="mt-6">
              <label
                htmlFor="review-comment"
                className="text-sm font-semibold text-[#063f32]"
              >
                Kommentar
                <span className="ml-1 font-normal text-stone-500">
                  (valgfri)
                </span>
              </label>

              <textarea
                id="review-comment"
                value={reviewComment}
                onChange={(event) =>
                  setReviewComment(event.target.value)
                }
                maxLength={1000}
                rows={5}
                disabled={submittingReview}
                placeholder="Fortæl kort om din oplevelse med sælgeren..."
                className="mt-2 w-full resize-none rounded-2xl border border-[#d9cfbd] bg-white px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#b79a3d] focus:ring-2 focus:ring-[#d4af37]/20 disabled:cursor-not-allowed disabled:bg-stone-100"
              />

              <p className="mt-1 text-right text-xs text-stone-500">
                {reviewComment.length}/1000
              </p>
            </div>

            {reviewError && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <p>{reviewError}</p>
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeReviewModal}
                disabled={submittingReview}
                className="rounded-full border border-[#d9cfbd] px-6 py-3 font-semibold text-stone-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuller
              </button>

              <button
                type="button"
                onClick={() => void submitReview()}
                disabled={
                  submittingReview ||
                  reviewRating < 1 ||
                  reviewRating > 5
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-7 py-3 font-semibold text-[#063f32] transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingReview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Star className="h-4 w-4" />
                )}

                {submittingReview
                  ? "Sender..."
                  : "Send anmeldelse"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

function OrderDetails({ order }: { order: OrderView }) {
  const isShipping = order.shipping_method === "shipping";

  return (
    <div className="border-t border-[#eadfcb] bg-[#fcfaf6] p-5 md:p-7">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-semibold text-[#063f32]">
            Levering
          </h3>

          <div className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
            <p className="font-medium text-stone-800">
              {isShipping ? "Fragt" : "Afhentning"}
            </p>

            {isShipping && (
              <>
                {order.shipping_name && (
                  <p>{order.shipping_name}</p>
                )}

                {order.shipping_address_line1 && (
                  <p>{order.shipping_address_line1}</p>
                )}

                {(order.shipping_postal_code ||
                  order.shipping_city) && (
                  <p>
                    {order.shipping_postal_code}{" "}
                    {order.shipping_city}
                  </p>
                )}

                {order.shipping_phone && (
                  <p>Telefon: {order.shipping_phone}</p>
                )}
              </>
            )}

            {order.shipping_note && (
              <p className="mt-3 rounded-xl bg-white p-3">
                Besked: {order.shipping_note}
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-[#063f32]">
            Betalingsoversigt
          </h3>

          <div className="mt-3 space-y-2 text-sm">
            <DetailRow
              label="Varer"
              value={formatMoney(order.subtotal)}
            />

            <DetailRow
              label="Fragt"
              value={formatMoney(order.shipping_price)}
            />

            <DetailRow
              label="Køberbeskyttelse"
              value={formatMoney(order.buyer_protection_fee)}
            />

            <div className="my-3 border-t border-[#eadfcb]" />

            <DetailRow
              label="I alt"
              value={formatMoney(order.total)}
              strong
            />
          </div>
        </div>
      </div>

      {(order.shipping_carrier || order.tracking_number) && (
        <div className="mt-6 rounded-2xl border border-[#eadfcb] bg-white p-4">
          <div className="flex items-start gap-3">
            <Truck className="mt-0.5 h-5 w-5 flex-none text-[#0b5a47]" />

            <div>
              <h3 className="font-semibold text-[#063f32]">
                Forsendelse
              </h3>

              {order.shipping_carrier && (
                <p className="mt-2 text-sm text-stone-600">
                  Fragtfirma: {order.shipping_carrier}
                </p>
              )}

              {order.tracking_number && (
                <p className="mt-1 break-all text-sm text-stone-600">
                  Trackingnummer: {order.tracking_number}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusExplanation({
  order,
  status,
}: {
  order: OrderView;
  status: FulfillmentStatus;
}) {
  const content: Record<
    FulfillmentStatus,
    {
      text: string;
      icon: typeof Clock3;
    }
  > = {
    pending: {
      text:
        order.payment_status === "paid"
          ? "Betalingen er modtaget. Sælgeren får nu besked om ordren."
          : "Ordren afventer betaling.",
      icon: Clock3,
    },
    awaiting_shipment: {
      text:
        order.shipping_method === "pickup"
          ? "Betalingen er modtaget. Sælgeren gør varen klar til afhentning."
          : "Betalingen er modtaget. Sælgeren skal nu sende varen.",
      icon: Clock3,
    },
    ready_for_pickup: {
      text:
        "Varen er klar til afhentning. Bekræft først modtagelsen, når du har fået varen.",
      icon: MapPin,
    },
    shipped: {
      text:
        "Sælgeren har markeret varen som sendt. Bekræft modtagelsen, når varen er ankommet.",
      icon: Truck,
    },
    completed: {
      text:
        "Du har bekræftet, at varen er modtaget. Ordren er afsluttet.",
      icon: CheckCircle2,
    },
    cancelled: {
      text: "Ordren er annulleret.",
      icon: AlertCircle,
    },
    disputed: {
      text:
        "Ordren er sat på pause, mens sagen bliver undersøgt.",
      icon: ShieldCheck,
    },
  };

  const item = content[status];
  const Icon = item.icon;

  return (
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#eadfcb] p-4 text-sm leading-6 text-stone-600">
      <Icon className="mt-0.5 h-5 w-5 flex-none text-[#b79a3d]" />
      <p>{item.text}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: FulfillmentStatus;
}) {
  const className: Record<FulfillmentStatus, string> = {
    pending: "bg-stone-100 text-stone-700",
    awaiting_shipment: "bg-amber-50 text-amber-800",
    ready_for_pickup: "bg-blue-50 text-blue-800",
    shipped: "bg-sky-50 text-sky-800",
    completed: "bg-emerald-50 text-emerald-800",
    cancelled: "bg-red-50 text-red-700",
    disputed: "bg-orange-50 text-orange-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${className[status]}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function StatusIcon({
  status,
}: {
  status: FulfillmentStatus;
}) {
  const iconMap = {
    pending: Clock3,
    awaiting_shipment: Clock3,
    ready_for_pickup: MapPin,
    shipped: Truck,
    completed: CheckCircle2,
    cancelled: AlertCircle,
    disputed: ShieldCheck,
  };

  const Icon = iconMap[status];

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#b79a3d] shadow-sm">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong
          ? "font-semibold text-[#063f32]"
          : "text-stone-600"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function getEffectiveStatus(
  order: OrderRow,
): FulfillmentStatus {
  if (
    order.status === "cancelled" ||
    order.payment_status === "cancelled"
  ) {
    return "cancelled";
  }

  if (order.fulfillment_status) {
    if (
      order.fulfillment_status === "pending" &&
      order.payment_status === "paid"
    ) {
      return "awaiting_shipment";
    }

    return order.fulfillment_status;
  }

  return order.payment_status === "paid"
    ? "awaiting_shipment"
    : "pending";
}

function getStatusLabel(status: FulfillmentStatus) {
  const labels: Record<FulfillmentStatus, string> = {
    pending: "Afventer betaling",
    awaiting_shipment: "Afventer sælger",
    ready_for_pickup: "Klar til afhentning",
    shipped: "Sendt",
    completed: "Afsluttet",
    cancelled: "Annulleret",
    disputed: "Tvist",
  };

  return labels[status];
}

function formatMoney(
  value: number | string | null | undefined,
) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function getRatingLabel(rating: number) {
  const labels: Record<number, string> = {
    1: "Meget utilfredsstillende",
    2: "Utilfredsstillende",
    3: "Okay oplevelse",
    4: "God oplevelse",
    5: "Fremragende oplevelse",
  };

  return labels[rating] ?? "Klik på stjernerne for at vælge";
}