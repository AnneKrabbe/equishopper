"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

type CartRow = {
  id: string;
  created_at: string;
  agreed_price: number | string | null;
  offer_id: string | null;
  listing: {
    id: string;
    title: string;
    price: number;
    seller_id: string;
    shipping_available: boolean | null;
    pickup_available: boolean | null;
    shipping_product_id: string | null;
    shipping_product: {
      id: string;
      carrier: string;
      product_code: string;
      name: string;
      package_group: string;
      max_weight_grams: number;
      price_amount: number;
      currency: string;
      delivery_method: string;
      active: boolean;
      outbound_enabled: boolean;
      size_rule_text: string | null;
    } | null;
    location: string | null;
    status: string | null;
    listing_images:
      | {
          image_url: string;
          sort_order: number | null;
        }[]
      | null;
  } | null;
};

type ShippingMethod = "shipping" | "pickup";

type CheckoutResponse = {
  url?: string;
  error?: string;
};

type DaoServicePoint = {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  distance: number | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: string[];
};

type DaoServicePointsResponse = {
  servicePoints?: DaoServicePoint[];
  error?: string;
};

const BUYER_PROTECTION_PERCENTAGE = 0.03;
const BUYER_PROTECTION_FIXED_FEE = 5;

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getEffectivePrice(item: CartRow) {
  const agreedPrice = Number(item.agreed_price);

  if (
    item.offer_id &&
    Number.isFinite(agreedPrice) &&
    agreedPrice > 0
  ) {
    return agreedPrice;
  }

  return Number(item.listing?.price ?? 0);
}

export default function CartPage() {
  const router = useRouter();

  const [items, setItems] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>("shipping");
  const [fullName, setFullName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [useAlternateAddress, setUseAlternateAddress] = useState(false);

  const [servicePoints, setServicePoints] = useState<DaoServicePoint[]>([]);
  const [selectedServicePointId, setSelectedServicePointId] = useState("");
  const [loadingServicePoints, setLoadingServicePoints] = useState(false);
  const [servicePointError, setServicePointError] = useState("");

  useEffect(() => {
    void loadCart();

    const params = new URLSearchParams(window.location.search);
    if (params.get("betaling") === "annulleret") {
      setErrorMessage(
        "Betalingen blev ikke gennemført. Varen er ikke købt. Reservationen frigives automatisk senest efter 30 minutter.",
      );
    }
  }, []);

  useEffect(() => {
    if (shippingMethod !== "shipping") {
      setServicePoints([]);
      setSelectedServicePointId("");
      setServicePointError("");
      setLoadingServicePoints(false);
      return;
    }

    const normalizedAddress = addressLine1.trim();
    const normalizedPostalCode = postalCode.trim();
    const normalizedCity = city.trim();

    if (
      !normalizedAddress ||
      !/^\d{4}$/.test(normalizedPostalCode) ||
      !normalizedCity
    ) {
      setServicePoints([]);
      setSelectedServicePointId("");
      setServicePointError("");
      setLoadingServicePoints(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void loadServicePoints(
        normalizedAddress,
        normalizedPostalCode,
        normalizedCity,
        controller.signal,
      );
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    addressLine1,
    postalCode,
    city,
    shippingMethod,
  ]);

  async function loadServicePoints(
    address: string,
    zipCode: string,
    cityName: string,
    signal?: AbortSignal,
  ) {
    try {
      setLoadingServicePoints(true);
      setServicePointError("");

      const params = new URLSearchParams({
        address,
        zipCode,
        city: cityName,
      });

      const response = await fetch(
        `/api/shipping/dao/service-points?${params.toString()}`,
        {
          method: "GET",
          signal,
        },
      );

      const data = (await response.json()) as DaoServicePointsResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "DAO-pakkeshops kunne ikke hentes.",
        );
      }

      const points = Array.isArray(data.servicePoints)
        ? data.servicePoints
        : [];

      setServicePoints(points);

      setSelectedServicePointId((current) =>
        points.some((point) => point.id === current)
          ? current
          : "",
      );

      if (points.length === 0) {
        setServicePointError(
          "Der blev ikke fundet DAO-pakkeshops tæt på denne adresse.",
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("DAO-pakkeshops kunne ikke hentes:", error);
      setServicePoints([]);
      setSelectedServicePointId("");
      setServicePointError(
        error instanceof Error
          ? error.message
          : "DAO-pakkeshops kunne ikke hentes.",
      );
    } finally {
      if (!signal?.aborted) {
        setLoadingServicePoints(false);
      }
    }
  }

  async function loadCart() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.push("/login?redirect=/kurv");
        return;
      }

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          created_at,
          agreed_price,
          offer_id,
          listing:listings (
            id,
            title,
            price,
            seller_id,
            shipping_available,
            pickup_available,
            shipping_product_id,
            shipping_product:shipping_products (
              id,
              carrier,
              product_code,
              name,
              package_group,
              max_weight_grams,
              price_amount,
              currency,
              delivery_method,
              active,
              outbound_enabled,
              size_rule_text
            ),
            location,
            status,
            listing_images (
              image_url,
              sort_order
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as unknown as CartRow[];
      const validRows = rows.filter((row) => row.listing);

      setItems(validRows);

      const shippingUnavailable = validRows.some(
        (row) => row.listing?.shipping_available === false,
      );
      const pickupUnavailable = validRows.some(
        (row) => row.listing?.pickup_available === false,
      );

      if (shippingUnavailable && !pickupUnavailable) {
        setShippingMethod("pickup");
      } else if (pickupUnavailable && !shippingUnavailable) {
        setShippingMethod("shipping");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, address, postal_code, city, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Kunne ikke hente adresseoplysninger:",
          profileError,
        );
      }

      setFullName(
        profile?.full_name ??
          user.user_metadata?.full_name ??
          "",
      );
      setAddressLine1(profile?.address ?? "");
      setPostalCode(profile?.postal_code ?? "");
      setCity(profile?.city ?? "");
      setPhone(profile?.phone ?? "");
    } catch (error) {
      console.error("Kunne ikke hente kurven:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kurven kunne ikke hentes.",
      );
    } finally {
      setLoading(false);
    }
  }

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + getEffectivePrice(item),
        0,
      ),
    [items],
  );

  const shippingTotal = useMemo(() => {
    if (
      items.length === 0 ||
      shippingMethod !== "shipping"
    ) {
      return 0;
    }

    const shippingOere = items.reduce((sum, item) => {
      const product = item.listing?.shipping_product;

      if (
        !item.listing?.shipping_available ||
        !product ||
        !product.active ||
        !product.outbound_enabled ||
        product.carrier.toLowerCase() !== "dao"
      ) {
        return sum;
      }

      return sum + Math.ceil(product.price_amount / 100) * 100;
    }, 0);

    return shippingOere / 100;
  }, [items, shippingMethod]);

  const buyerProtectionFee =
    items.length > 0
      ? roundCurrency(
          subtotal * BUYER_PROTECTION_PERCENTAGE +
            BUYER_PROTECTION_FIXED_FEE,
        )
      : 0;

  const total = roundCurrency(
    subtotal + shippingTotal + buyerProtectionFee,
  );

  const hasPickupUnavailableItem = items.some(
    (item) => item.listing?.pickup_available === false,
  );

  const hasShippingUnavailableItem = items.some((item) => {
    const listing = item.listing;
    const product = listing?.shipping_product;

    return (
      !listing?.shipping_available ||
      !listing.shipping_product_id ||
      !product ||
      !product.active ||
      !product.outbound_enabled ||
      product.carrier.toLowerCase() !== "dao"
    );
  });

  const selectedServicePoint = useMemo(
    () =>
      servicePoints.find(
        (point) => point.id === selectedServicePointId,
      ) ?? null,
    [servicePoints, selectedServicePointId],
  );

  async function removeItem(cartItemId: string) {
    try {
      setRemovingId(cartItemId);
      setErrorMessage("");

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) {
        throw error;
      }

      setItems((current) =>
        current.filter((item) => item.id !== cartItemId),
      );

      window.dispatchEvent(
        new Event("equishopper-cart-changed"),
      );
    } catch (error) {
      console.error("Kunne ikke fjerne varen:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Varen kunne ikke fjernes.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  async function startCheckout(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (items.length === 0 || submitting) {
      return;
    }

    if (
      shippingMethod === "pickup" &&
      hasPickupUnavailableItem
    ) {
      setErrorMessage(
        "Afhentning er ikke muligt for en eller flere varer. Vælg fragt.",
      );
      return;
    }

    if (
      shippingMethod === "shipping" &&
      hasShippingUnavailableItem
    ) {
      setErrorMessage(
        "En eller flere varer kan kun afhentes. Vælg afhentning.",
      );
      return;
    }

    if (
      shippingMethod === "shipping" &&
      (!fullName.trim() ||
        !addressLine1.trim() ||
        !postalCode.trim() ||
        !city.trim())
    ) {
      setErrorMessage(
        "Udfyld navn, adresse, postnummer og by.",
      );
      return;
    }

    if (
      shippingMethod === "shipping" &&
      !selectedServicePoint
    ) {
      setErrorMessage(
        "Vælg en DAO-pakkeshop, før du fortsætter.",
      );
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage(
        "Du skal acceptere handelsbetingelserne, før du kan fortsætte.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        router.push("/login?redirect=/kurv");
        return;
      }

      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          shippingMethod,
          fullName: fullName.trim(),
          addressLine1: addressLine1.trim(),
          postalCode: postalCode.trim(),
          city: city.trim(),
          phone: phone.trim(),
          shippingNote: shippingNote.trim(),
          servicePoint: selectedServicePoint
            ? {
                id: selectedServicePoint.id,
                name: selectedServicePoint.name,
                address: selectedServicePoint.address,
                postalCode: selectedServicePoint.postalCode,
                city: selectedServicePoint.city,
              }
            : null,
        }),
      });

      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Betalingen kunne ikke startes.",
        );
      }

      if (!data.url) {
        throw new Error(
          "Stripe returnerede ikke en betalingsadresse.",
        );
      }

      window.dispatchEvent(
        new Event("equishopper-cart-changed"),
      );

      window.location.assign(data.url);
    } catch (error) {
      console.error("Betalingen kunne ikke startes:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Betalingen kunne ikke startes.",
      );
      setSubmitting(false);
    }
  }

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
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.22em] text-[#b79a3d]">
            Checkout
          </p>

          <h1 className="mt-2 font-serif text-4xl text-[#063f32] md:text-5xl">
            Din indkøbskurv
          </h1>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-[28px] border border-[#eadfcb] bg-white p-10 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-12 w-12 text-[#d4af37]" />

            <h2 className="mt-5 font-serif text-3xl text-[#063f32]">
              Kurven er tom
            </h2>

            <p className="mt-3 text-stone-600">
              Find en annonce og tryk på “Køb nu”.
            </p>

            <Link
              href="/annoncer"
              className="mt-6 inline-flex rounded-full bg-[#d4af37] px-7 py-3.5 font-semibold text-[#063f32]"
            >
              Se annoncer
            </Link>
          </div>
        ) : (
          <form
            onSubmit={startCheckout}
            className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]"
          >
            <div className="space-y-6">
              <section className="rounded-[28px] border border-[#eadfcb] bg-white p-5 shadow-sm md:p-7">
                <h2 className="font-serif text-2xl text-[#063f32]">
                  Varer
                </h2>

                <div className="mt-5 divide-y divide-[#eadfcb]">
                  {items.map((item) => {
                    const listing = item.listing!;
                    const image = [
                      ...(listing.listing_images ?? []),
                    ].sort(
                      (a, b) =>
                        (a.sort_order ?? 0) -
                        (b.sort_order ?? 0),
                    )[0]?.image_url;

                    return (
                      <article
                        key={item.id}
                        className="flex gap-4 py-5 first:pt-0 last:pb-0"
                      >
                        <Link
                          href={`/listing/${listing.id}`}
                          className="h-28 w-24 flex-none overflow-hidden rounded-2xl bg-[#f1ece2]"
                        >
                          {image ? (
                            <img
                              src={image}
                              alt={listing.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Package className="h-7 w-7 text-stone-400" />
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/listing/${listing.id}`}
                            className="font-serif text-xl text-[#063f32] hover:underline"
                          >
                            {listing.title}
                          </Link>

                          <p className="mt-2 text-sm text-stone-500">
                            {listing.location || "Danmark"}
                          </p>

                          {!listing.shipping_available ? (
                            <p className="mt-2 text-sm font-medium text-amber-700">
                              Kun afhentning
                            </p>
                          ) : listing.shipping_product &&
                            listing.shipping_product.active &&
                            listing.shipping_product.outbound_enabled &&
                            listing.shipping_product.carrier.toLowerCase() ===
                              "dao" ? (
                            <div className="mt-2 text-sm text-stone-500">
                              <p className="font-medium text-[#063f32]">
                                {listing.shipping_product.name}
                              </p>
                              <p className="mt-0.5">
                                {formatWeight(
                                  listing.shipping_product.max_weight_grams,
                                )}{" "}
                                ·{" "}
                                {formatMoney(
                                  Math.ceil(
                                    listing.shipping_product.price_amount / 100,
                                  ),
                                )}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm font-medium text-amber-700">
                              Fragt er ikke konfigureret for denne annonce
                            </p>
                          )}

                          <div className="mt-3">
                            {item.offer_id &&
                            Number(item.agreed_price) > 0 ? (
                              <>
                                <p className="font-semibold text-stone-900">
                                  {getEffectivePrice(item).toLocaleString("da-DK")}{" "}
                                  kr.
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="rounded-full bg-[#edf5f0] px-2.5 py-1 font-medium text-[#063f32]">
                                    Accepteret bud
                                  </span>

                                  {Number(listing.price) !== getEffectivePrice(item) && (
                                    <span className="text-stone-400 line-through">
                                      {Number(listing.price).toLocaleString("da-DK")} kr.
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <p className="font-semibold text-stone-900">
                                {Number(listing.price).toLocaleString("da-DK")}{" "}
                                kr.
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={
                            removingId === item.id || submitting
                          }
                          aria-label="Fjern varen"
                          className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-stone-200 text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          {removingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-[#eadfcb] bg-white p-5 shadow-sm md:p-7">
                <h2 className="font-serif text-2xl text-[#063f32]">
                  Levering
                </h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label
                    className={`rounded-2xl border p-4 ${
                      hasShippingUnavailableItem
                        ? "cursor-not-allowed bg-stone-50 opacity-60"
                        : "cursor-pointer"
                    } ${
                      shippingMethod === "shipping"
                        ? "border-[#d4af37] bg-[#fbf6e8]"
                        : "border-stone-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="shipping"
                      checked={shippingMethod === "shipping"}
                      disabled={
                        hasShippingUnavailableItem || submitting
                      }
                      onChange={() =>
                        setShippingMethod("shipping")
                      }
                      className="mr-3"
                    />

                    <span className="font-semibold text-[#063f32]">
                      Fragt
                    </span>

                    <span className="mt-1 block pl-6 text-sm text-stone-500">
                      {hasShippingUnavailableItem
                        ? "Ikke muligt for en eller flere varer"
                        : `${formatMoney(
                            shippingTotal,
                          )} · DAO Shop2Shop`}
                    </span>
                  </label>

                  <label
                    className={`rounded-2xl border p-4 ${
                      hasPickupUnavailableItem || submitting
                        ? "cursor-not-allowed bg-stone-50 opacity-60"
                        : "cursor-pointer"
                    } ${
                      shippingMethod === "pickup"
                        ? "border-[#d4af37] bg-[#fbf6e8]"
                        : "border-stone-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="pickup"
                      checked={shippingMethod === "pickup"}
                      disabled={hasPickupUnavailableItem || submitting}
                      onChange={() =>
                        setShippingMethod("pickup")
                      }
                      className="mr-3"
                    />

                    <span className="font-semibold text-[#063f32]">
                      Afhentning
                    </span>

                    <span className="mt-1 block pl-6 text-sm text-stone-500">
                      {hasPickupUnavailableItem
                        ? "Ikke muligt for en eller flere varer"
                        : "0 kr. – skriv til sælger for at aftale nærmere om afhentning"}
                    </span>
                  </label>
                </div>

                {shippingMethod === "shipping" && (
                  <div className="mt-6 space-y-6">
                    <div className="rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-4 md:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-stone-500">
                            Leveringsadresse
                          </p>

                          <p className="mt-2 font-semibold text-[#063f32]">
                            {fullName || "Navn mangler"}
                          </p>

                          <p className="mt-1 text-sm leading-6 text-stone-600">
                            {addressLine1 || "Adresse mangler"}
                            <br />
                            {postalCode || "----"} {city || "By mangler"}
                          </p>

                          {phone && (
                            <p className="mt-1 text-sm text-stone-500">
                              {phone}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setUseAlternateAddress((current) => !current)
                          }
                          disabled={submitting}
                          className="self-start rounded-full border border-[#0b5a47] px-4 py-2 text-sm font-semibold text-[#063f32] transition hover:bg-[#edf4ef] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {useAlternateAddress
                            ? "Brug profiladressen"
                            : "Brug en anden adresse"}
                        </button>
                      </div>

                      {useAlternateAddress && (
                        <div className="mt-5 grid gap-4 border-t border-[#eadfcb] pt-5 sm:grid-cols-2">
                          <Field
                            label="Fulde navn"
                            value={fullName}
                            onChange={setFullName}
                            autoComplete="name"
                            disabled={submitting}
                          />

                          <Field
                            label="Telefon"
                            value={phone}
                            onChange={setPhone}
                            autoComplete="tel"
                            disabled={submitting}
                          />

                          <div className="sm:col-span-2">
                            <Field
                              label="Adresse"
                              value={addressLine1}
                              onChange={setAddressLine1}
                              autoComplete="street-address"
                              disabled={submitting}
                            />
                          </div>

                          <Field
                            label="Postnummer"
                            value={postalCode}
                            onChange={setPostalCode}
                            autoComplete="postal-code"
                            disabled={submitting}
                          />

                          <Field
                            label="By"
                            value={city}
                            onChange={setCity}
                            autoComplete="address-level2"
                            disabled={submitting}
                          />
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-4 md:p-5">
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 flex-none text-[#b79a3d]" />

                        <div>
                          <h3 className="font-semibold text-[#063f32]">
                            Vælg DAO-pakkeshop
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-stone-500">
                            Vi viser de 5 nærmeste DAO-pakkeshops ud fra
                            din adresse, dit postnummer og din by.
                          </p>
                        </div>
                      </div>

                      {!addressLine1.trim() ||
                      !/^\d{4}$/.test(postalCode.trim()) ||
                      !city.trim() ? (
                        <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-stone-500">
                          Udfyld adresse, 4-cifret postnummer og by for
                          at se de 5 nærmeste DAO-pakkeshops.
                        </p>
                      ) : loadingServicePoints ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-stone-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Henter DAO-pakkeshops...
                        </div>
                      ) : servicePointError ? (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {servicePointError}
                        </div>
                      ) : (
                        <div className="mt-4 grid gap-3">
                          {servicePoints.map((point) => {
                            const selected =
                              point.id === selectedServicePointId;

                            return (
                              <label
                                key={point.id}
                                className={`cursor-pointer rounded-2xl border bg-white p-4 transition ${
                                  selected
                                    ? "border-[#d4af37] ring-1 ring-[#d4af37]"
                                    : "border-stone-200 hover:border-[#d4af37]"
                                } ${
                                  submitting
                                    ? "cursor-not-allowed opacity-60"
                                    : ""
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="radio"
                                    name="daoServicePoint"
                                    value={point.id}
                                    checked={selected}
                                    disabled={submitting}
                                    onChange={() => {
                                      setSelectedServicePointId(point.id);
                                      setErrorMessage("");
                                    }}
                                    className="mt-1"
                                  />

                                  <div className="min-w-0">
                                    <p className="font-semibold text-[#063f32]">
                                      {point.name}
                                    </p>
                                    <p className="mt-1 text-sm leading-5 text-stone-500">
                                      {point.address}
                                      {point.address ? ", " : ""}
                                      {point.postalCode} {point.city}
                                    </p>

                                    {point.distance != null && (
                                      <p className="mt-1 text-xs font-medium text-[#0b5a47]">
                                        {formatDistance(point.distance)} væk
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-medium text-[#063f32]">
                    Besked om fragt eller afhentning
                  </span>

                  <textarea
                    value={shippingNote}
                    onChange={(event) =>
                      setShippingNote(event.target.value)
                    }
                    disabled={submitting}
                    rows={4}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-[#d4af37] disabled:cursor-not-allowed disabled:bg-stone-50"
                    placeholder="Eksempel: Jeg er hjemme efter kl. 16"
                  />
                </label>
              </section>
            </div>

            <aside className="self-start lg:sticky lg:top-28">
              <section className="rounded-[28px] border border-[#eadfcb] bg-white p-6 shadow-sm">
                <h2 className="font-serif text-2xl text-[#063f32]">
                  Ordreoversigt
                </h2>

                <div className="mt-6 space-y-3 text-sm">
                  <SummaryRow
                    label="Varer"
                    value={subtotal}
                  />

                  <SummaryRow
                    label="Fragt"
                    value={shippingTotal}
                  />

                  <SummaryRow
                    label="Køberbeskyttelse"
                    value={buyerProtectionFee}
                  />

                  <p className="text-xs leading-5 text-stone-500">
                    Køberbeskyttelse: 3 % af vareprisen + 5 kr.
                  </p>

                  <div className="my-4 border-t border-[#eadfcb]" />

                  <div className="flex items-center justify-between text-lg font-semibold text-[#063f32]">
                    <span>I alt</span>
                    <span>
                      {total.toLocaleString("da-DK", {
                        minimumFractionDigits:
                          total % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      kr.
                    </span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      required
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => {
                        setAcceptedTerms(event.target.checked);
                        setErrorMessage("");
                      }}
                      disabled={submitting}
                      className="mt-1 h-5 w-5 flex-none rounded border-stone-300 accent-[#063f32] focus:ring-[#0b5a47] disabled:cursor-not-allowed"
                    />

                    <span className="text-sm leading-6 text-stone-600">
                      Jeg accepterer Equishoppers{" "}
                      <Link
                        href="/handelsbetingelser"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#063f32] underline decoration-[#d4af37] underline-offset-4 transition hover:text-[#0b5a47]"
                      >
                        handelsbetingelser
                      </Link>{" "}
                      og bekræfter, at jeg har læst reglerne om betaling,
                      køberbeskyttelse, levering og tvister.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !acceptedTerms ||
                    (shippingMethod === "shipping" &&
                      (hasShippingUnavailableItem ||
                        !selectedServicePoint)) ||
                    (shippingMethod === "pickup" &&
                      hasPickupUnavailableItem)
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-4 font-semibold text-[#063f32] transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}

                  {submitting
                    ? "Åbner sikker betaling..."
                    : "Gå til sikker betaling"}
                </button>

                <div className="mt-4 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-4">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-[#0b5a47]" />
                    <div>
                      <p className="text-sm font-semibold text-[#063f32]">
                        Betal sikkert med Kort · MobilePay · Klarna
                      </p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        Du sendes videre til Stripe, hvor du vælger blandt de
                        betalingsmuligheder, der er tilgængelige for dit køb.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-3 rounded-2xl bg-[#f8f6f1] p-4 text-sm text-stone-600">
                  <MapPin className="mt-0.5 h-5 w-5 flex-none text-[#b79a3d]" />

                  <p>
                    DAO-fragten beregnes ud fra den pakkeklasse,
                    sælger valgte på annoncen. Din valgte pakkeshop,
                    fragtdata og pris gemmes på ordren ved checkout.
                  </p>
                </div>
              </section>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
};

function Field({
  label,
  value,
  onChange,
  autoComplete,
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
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-[#d4af37] disabled:cursor-not-allowed disabled:bg-stone-50"
      />
    </label>
  );
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toLocaleString("da-DK", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatWeight(weightGrams: number) {
  if (weightGrams < 1000) {
    return `Op til ${weightGrams} g`;
  }

  const kilograms = weightGrams / 1000;

  return `Op til ${kilograms.toLocaleString("da-DK", {
    maximumFractionDigits: 2,
  })} kg`;
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between text-stone-600">
      <span>{label}</span>
      <span>
        {value.toLocaleString("da-DK", {
          minimumFractionDigits: value % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        })}{" "}
        kr.
      </span>
    </div>
  );
}