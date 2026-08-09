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
  listing: {
    id: string;
    title: string;
    price: number;
    seller_id: string;
    shipping_available: boolean | null;
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

const BUYER_PROTECTION_PERCENTAGE = 0.03;
const BUYER_PROTECTION_FIXED_FEE = 5;

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

  useEffect(() => {
    void loadCart();
  }, []);

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
          listing:listings (
            id,
            title,
            price,
            seller_id,
            shipping_available,
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

      if (
        validRows.some(
          (row) => row.listing?.shipping_available === false,
        )
      ) {
        setShippingMethod("pickup");
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
        (sum, item) => sum + Number(item.listing?.price ?? 0),
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

    return roundCurrency(
      items.reduce((sum, item) => {
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

        return sum + product.price_amount / 100;
      }, 0),
    );
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
                                  listing.shipping_product.price_amount / 100,
                                )}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm font-medium text-amber-700">
                              Fragt er ikke konfigureret for denne annonce
                            </p>
                          )}

                          <p className="mt-3 font-semibold text-stone-900">
                            {Number(
                              listing.price,
                            ).toLocaleString("da-DK")}{" "}
                            kr.
                          </p>
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
                      submitting
                        ? "cursor-not-allowed opacity-60"
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
                      disabled={submitting}
                      onChange={() =>
                        setShippingMethod("pickup")
                      }
                      className="mr-3"
                    />

                    <span className="font-semibold text-[#063f32]">
                      Afhentning
                    </span>

                    <span className="mt-1 block pl-6 text-sm text-stone-500">
                      0 kr. – adresse aftales efter ordren
                    </span>
                  </label>
                </div>

                {shippingMethod === "shipping" && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
                      hasShippingUnavailableItem)
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

                <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-stone-500">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-[#0b5a47]" />
                  <p>
                    Du sendes videre til Stripe, hvor betalingen
                    gennemføres sikkert.
                  </p>
                </div>

                <div className="mt-5 flex gap-3 rounded-2xl bg-[#f8f6f1] p-4 text-sm text-stone-600">
                  <MapPin className="mt-0.5 h-5 w-5 flex-none text-[#b79a3d]" />

                  <p>
                    DAO-fragten beregnes ud fra den pakkeklasse,
                    sælger valgte på annoncen. Fragtdata og pris
                    gemmes som et snapshot på ordren ved checkout.
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