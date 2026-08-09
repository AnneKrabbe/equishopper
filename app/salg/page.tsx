"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  Store,
  Truck,
  UserRound,
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
  buyer_id: string;
  status: string | null;
  payment_status: string | null;
  fulfillment_status: FulfillmentStatus | null;
  shipping_method: "shipping" | "pickup" | string | null;
  subtotal: number | string | null;
  shipping_price: number | string | null;
  buyer_protection_fee: number | string | null;
  seller_fee: number | string | null;
  seller_payout: number | string | null;
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

type BuyerProfile = {
  id: string;
  full_name: string | null;
};

type OrderView = OrderRow & {
  buyerName: string;
  items: Array<
    OrderItemRow & {
      imageUrl: string | null;
    }
  >;
};

type ShippingFormState = {
  carrier: string;
  trackingNumber: string;
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

export default function SalesPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingOrderId, setSubmittingOrderId] = useState<
    string | null
  >(null);
  const [expandedOrderId, setExpandedOrderId] = useState<
    string | null
  >(null);
  const [shippingForms, setShippingForms] = useState<
    Record<string, ShippingFormState>
  >({});
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
        router.push("/login?redirect=/salg");
        return;
      }

      const { data: orderData, error: ordersError } =
        await supabase
          .from("orders")
          .select(`
            id,
            created_at,
            buyer_id,
            status,
            payment_status,
            fulfillment_status,
            shipping_method,
            subtotal,
            shipping_price,
            buyer_protection_fee,
            seller_fee,
            seller_payout,
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
            completed_at
          `)
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      const orderRows = (orderData ?? []) as OrderRow[];

      if (orderRows.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = orderRows.map((order) => order.id);
      const buyerIds = Array.from(
        new Set(orderRows.map((order) => order.buyer_id)),
      );

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

      let profileRows: BuyerProfile[] = [];

      if (buyerIds.length > 0) {
        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", buyerIds);

        if (profileError) {
          console.error(
            "Kunne ikke hente køberprofiler:",
            profileError,
          );
        } else {
          profileRows = (profileData ?? []) as BuyerProfile[];
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

      const buyerNameById = new Map(
        profileRows.map((profile) => [
          profile.id,
          profile.full_name?.trim() || "Køber",
        ]),
      );

      const orderViews: OrderView[] = orderRows.map((order) => ({
        ...order,
        buyerName:
          buyerNameById.get(order.buyer_id) ??
          order.shipping_name ??
          "Køber",
        items: itemRows
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            ...item,
            imageUrl:
              firstImageByListing.get(item.listing_id) ?? null,
          })),
      }));

      setOrders(orderViews);

      setShippingForms((current) => {
        const next = { ...current };

        for (const order of orderViews) {
          next[order.id] = next[order.id] ?? {
            carrier: order.shipping_carrier ?? "",
            trackingNumber: order.tracking_number ?? "",
          };
        }

        return next;
      });
    } catch (error) {
      console.error("Kunne ikke hente salg:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Dine salg kunne ikke hentes.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function triggerItemShippedEmail(orderId: string) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error(
          "Afsendelsesmail kunne ikke sendes: mangler gyldig session.",
          sessionError,
        );
        return;
      }

      const response = await fetch("/api/orders/shipped-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orderId,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        console.error(
          "Afsendelsesmail kunne ikke sendes:",
          result?.error || `HTTP ${response.status}`,
        );
      }
    } catch (error) {
      /*
       * Ordren er allerede markeret som sendt.
       * En mailfejl må derfor ikke få selve handlingen til at fejle.
       */
      console.error("Afsendelsesmail fejlede:", error);
    }
  }

  async function markOrderReady(
    event: FormEvent<HTMLFormElement>,
    order: OrderView,
  ) {
    event.preventDefault();

    if (submittingOrderId) {
      return;
    }

    const form = shippingForms[order.id] ?? {
      carrier: "",
      trackingNumber: "",
    };

    try {
      setSubmittingOrderId(order.id);
      setErrorMessage("");
      setSuccessMessage("");

      const { error } = await supabase.rpc(
        "seller_mark_order_ready",
        {
          p_order_id: order.id,
          p_shipping_carrier:
            order.shipping_method === "shipping"
              ? form.carrier.trim() || null
              : null,
          p_tracking_number:
            order.shipping_method === "shipping"
              ? form.trackingNumber.trim() || null
              : null,
        },
      );

      if (error) {
        throw error;
      }

      if (order.shipping_method === "shipping") {
        await triggerItemShippedEmail(order.id);
      }

      setSuccessMessage(
        order.shipping_method === "shipping"
          ? "Ordren er markeret som sendt."
          : "Ordren er markeret som klar til afhentning.",
      );

      await loadOrders({ silent: true });
    } catch (error) {
      console.error("Ordren kunne ikke opdateres:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ordren kunne ikke opdateres.",
      );
    } finally {
      setSubmittingOrderId(null);
    }
  }

  function updateShippingForm(
    orderId: string,
    field: keyof ShippingFormState,
    value: string,
  ) {
    setShippingForms((current) => ({
      ...current,
      [orderId]: {
        carrier: current[orderId]?.carrier ?? "",
        trackingNumber:
          current[orderId]?.trackingNumber ?? "",
        [field]: value,
      },
    }));
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
              Sælgeroversigt
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[#063f32] md:text-5xl">
              Mine salg
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-stone-600">
              Se dine betalte ordrer, leveringsoplysninger og
              markér varer som sendt eller klar til afhentning.
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
            <Store className="mx-auto h-12 w-12 text-[#d4af37]" />

            <h2 className="mt-5 font-serif text-3xl text-[#063f32]">
              Du har ingen salg endnu
            </h2>

            <p className="mt-3 text-stone-600">
              Når en køber betaler for en af dine varer, vises
              ordren her.
            </p>

            <Link
              href="/opret-annonce"
              className="mt-7 inline-flex rounded-full bg-[#d4af37] px-7 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
            >
              Opret annonce
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
                    const canMarkReady =
                      effectiveStatus ===
                        "awaiting_shipment" &&
                      order.payment_status === "paid";
                    const form = shippingForms[order.id] ?? {
                      carrier: "",
                      trackingNumber: "",
                    };

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

                              <div className="mt-3 flex items-center gap-2 text-sm text-stone-600">
                                <UserRound className="h-4 w-4 text-[#b79a3d]" />
                                <span>{order.buyerName}</span>
                              </div>
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-sm text-stone-500">
                                Din udbetaling
                              </p>

                              <p className="mt-1 font-serif text-2xl text-[#063f32]">
                                {formatMoney(
                                  order.seller_payout,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-stone-500">
                                Efter sælgergebyr
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

                          {canMarkReady && (
                            <form
                              onSubmit={(event) =>
                                void markOrderReady(
                                  event,
                                  order,
                                )
                              }
                              className="mt-5 rounded-2xl border border-[#eadfcb] bg-[#fcfaf6] p-4"
                            >
                              {order.shipping_method ===
                              "shipping" ? (
                                <>
                                  <h3 className="font-semibold text-[#063f32]">
                                    Forsendelsesoplysninger
                                  </h3>

                                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <Field
                                      label="Fragtfirma"
                                      value={form.carrier}
                                      onChange={(value) =>
                                        updateShippingForm(
                                          order.id,
                                          "carrier",
                                          value,
                                        )
                                      }
                                      placeholder="Fx PostNord"
                                      disabled={
                                        submittingOrderId ===
                                        order.id
                                      }
                                    />

                                    <Field
                                      label="Trackingnummer"
                                      value={
                                        form.trackingNumber
                                      }
                                      onChange={(value) =>
                                        updateShippingForm(
                                          order.id,
                                          "trackingNumber",
                                          value,
                                        )
                                      }
                                      placeholder="Valgfrit"
                                      disabled={
                                        submittingOrderId ===
                                        order.id
                                      }
                                    />
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <h3 className="font-semibold text-[#063f32]">
                                    Afhentning
                                  </h3>

                                  <p className="mt-2 text-sm leading-6 text-stone-600">
                                    Markér ordren som klar, når
                                    køberen kan afhente varen.
                                  </p>
                                </div>
                              )}

                              <button
                                type="submit"
                                disabled={
                                  submittingOrderId === order.id
                                }
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                              >
                                {submittingOrderId ===
                                order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : order.shipping_method ===
                                  "shipping" ? (
                                  <Truck className="h-4 w-4" />
                                ) : (
                                  <PackageCheck className="h-4 w-4" />
                                )}

                                {submittingOrderId ===
                                order.id
                                  ? "Gemmer..."
                                  : order.shipping_method ===
                                      "shipping"
                                    ? "Marker som sendt"
                                    : "Marker som klar til afhentning"}
                              </button>
                            </form>
                          )}

                          <div className="mt-6">
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
                                : "Vis ordre og køberoplysninger"}
                            </button>
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
            Køber og levering
          </h3>

          <div className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
            <p className="font-medium text-stone-800">
              {order.shipping_name || order.buyerName}
            </p>

            <p>{isShipping ? "Fragt" : "Afhentning"}</p>

            {isShipping && (
              <>
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
              </>
            )}

            {order.shipping_phone && (
              <p>Telefon: {order.shipping_phone}</p>
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
            Økonomi
          </h3>

          <div className="mt-3 space-y-2 text-sm">
            <DetailRow
              label="Varesalg"
              value={formatMoney(order.subtotal)}
            />

            <DetailRow
              label="Sælgergebyr"
              value={`- ${formatMoney(order.seller_fee)}`}
            />

            <div className="my-3 border-t border-[#eadfcb]" />

            <DetailRow
              label="Din udbetaling"
              value={formatMoney(order.seller_payout)}
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
          ? "Betalingen er modtaget. Ordren er klar til behandling."
          : "Ordren afventer betaling fra køberen.",
      icon: Clock3,
    },
    awaiting_shipment: {
      text:
        order.shipping_method === "pickup"
          ? "Betalingen er modtaget. Gør varen klar og markér den som klar til afhentning."
          : "Betalingen er modtaget. Send varen og markér ordren som sendt.",
      icon: Clock3,
    },
    ready_for_pickup: {
      text:
        "Du har markeret varen som klar til afhentning. Ordren afventer køberens bekræftelse.",
      icon: MapPin,
    },
    shipped: {
      text:
        "Varen er markeret som sendt. Ordren afventer køberens bekræftelse.",
      icon: Truck,
    },
    completed: {
      text:
        "Køberen har bekræftet modtagelsen. Ordren er afsluttet.",
      icon: CheckCircle2,
    },
    cancelled: {
      text: "Ordren er annulleret.",
      icon: AlertCircle,
    },
    disputed: {
      text:
        "Ordren er sat på pause, mens sagen bliver undersøgt.",
      icon: AlertCircle,
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
    disputed: AlertCircle,
  };

  const Icon = iconMap[status];

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#b79a3d] shadow-sm">
      <Icon className="h-5 w-5" />
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#063f32]">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-[#d4af37] disabled:cursor-not-allowed disabled:bg-stone-50"
      />
    </label>
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
    awaiting_shipment: "Skal behandles",
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