"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/home/Header";
import ListingCarousel from "@/components/home/ListingCarousel";
import ContactSellerButton from "@/components/listings/ContactSellerButton";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  ShoppingCart,
  Loader2,
  X,
} from "lucide-react";

type ListingImage = {
  image_url: string;
  sort_order: number;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  brand: string | null;
  size: string | null;
  color: string | null;
  condition: string | null;
  location: string | null;
  main_category: string | null;
  subcategory: string | null;
  shipping_available: boolean | null;
  receipt: boolean | null;
  description: string | null;
  view_count: number | null;
  seller_id: string | null;
  favorite_count: number | null;
  is_we_love: boolean | null;
  status: string | null;
  reserved_by: string | null;
  listing_images?: ListingImage[];
};

type SellerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  city: string | null;
  bio: string | null;
  average_rating: number | null;
  review_count: number | null;
  created_at: string | null;
};

export default function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const [offerError, setOfferError] = useState("");

  const [buyingNow, setBuyingNow] = useState(false);
  const [buyError, setBuyError] = useState("");

  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerProfile, setSellerProfile] =
    useState<SellerProfile | null>(null);

  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);

  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    async function fetchListing() {
      const { error: viewError } = await supabase.rpc(
        "increment_listing_view_count",
        {
          listing_id_input: id,
        }
      );

      if (viewError) {
        console.log("Kunne ikke opdatere visninger:", viewError);
      }

      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          seller_id,
          favorite_count,
          title,
          price,
          brand,
          size,
          color,
          condition,
          location,
          main_category,
          subcategory,
          shipping_available,
          receipt,
          description,
          view_count,
          is_we_love,
          status,
          reserved_by,
          listing_images (
            image_url,
            sort_order
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.log("Fejl ved hentning af annonce:", error);
        return;
      }

      if (!data) return;

      const currentListing = data as Listing;

      setListing(currentListing);

      if (currentListing.main_category) {
        const { data: related, error: relatedError } = await supabase
          .from("listings")
          .select(`
            id,
            seller_id,
            favorite_count,
            title,
            price,
            brand,
            size,
            is_we_love,
            listing_images (
              image_url,
              sort_order
            )
          `)
          .eq("main_category", currentListing.main_category)
          .neq("id", currentListing.id)
          .order("favorite_count", { ascending: false })
          .limit(12);

        if (relatedError) {
          console.log(
            "Fejl ved hentning af relaterede annoncer:",
            relatedError
          );
        }

        if (related) {
          setRelatedListings(related as Listing[]);
        }
      }

      if (currentListing.seller_id) {
        const [
          { data: profile, error: profileError },
          { data: sellerItems, error: sellerItemsError },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              avatar_url,
              username,
              city,
              bio,
              average_rating,
              review_count,
              created_at
            `)
            .eq("id", currentListing.seller_id)
            .maybeSingle(),

          supabase
            .from("listings")
            .select(`
              id,
              seller_id,
              favorite_count,
              title,
              price,
              brand,
              size,
              is_we_love,
              listing_images (
                image_url,
                sort_order
              )
            `)
            .eq("seller_id", currentListing.seller_id)
            .neq("id", currentListing.id)
            .order("created_at", { ascending: false })
            .limit(12),
        ]);

        if (profileError) {
          console.log("Fejl ved hentning af sælgerprofil:", profileError);
        }

        if (profile) {
          setSellerProfile(profile as SellerProfile);
        }

        if (sellerItemsError) {
          console.log(
            "Fejl ved hentning af sælgers annoncer:",
            sellerItemsError
          );
        }

        if (sellerItems) {
          setSellerListings(sellerItems as Listing[]);
        }
      }

      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        const { data: favoriteData, error: favoriteError } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", userData.user.id)
          .eq("listing_id", id)
          .maybeSingle();

        if (favoriteError) {
          console.log("Fejl ved kontrol af favorit:", favoriteError);
        }

        setIsFavorite(Boolean(favoriteData));
      }
    }

    fetchListing();
  }, [id]);

  useEffect(() => {
    if (!galleryOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setGalleryOpen(false);
      }

      if (event.key === "ArrowLeft") {
        showPreviousImage();
      }

      if (event.key === "ArrowRight") {
        showNextImage();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [galleryOpen, activeImage]);

  if (!listing) {
    return (
      <main className="min-h-screen bg-[#f8f6f1]">
       <Header />

        <div className="mx-auto max-w-6xl px-6 pt-32">
          <p className="text-[#063f32]">Indlæser annonce...</p>
        </div>
      </main>
    );
  }

  const images = [...(listing.listing_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const sellerDisplayName =
    sellerProfile?.full_name?.trim() ||
    sellerProfile?.username?.trim() ||
    "Sælger";

  const sellerInitials = getInitials(sellerDisplayName);

  const sellerLocation =
    sellerProfile?.city?.trim() || listing.location || "Danmark";

  const sellerReviewCount = sellerProfile?.review_count ?? 0;
  const sellerRating = Number(sellerProfile?.average_rating ?? 0);

  const sellerProfileHref = sellerProfile
    ? `/profile/${sellerProfile.username || sellerProfile.id}`
    : "#";

  const categoryHref = listing.main_category
    ? `/category/${createSlug(listing.main_category)}`
    : "/";

  const details = [
    ["Mærke", listing.brand],
    ["Størrelse", listing.size],
    ["Farve", listing.color],
    ["Stand", listing.condition],
    [
      "Kategori",
      [listing.main_category, listing.subcategory]
        .filter(Boolean)
        .join(" · "),
    ],
    ["Fragt muligt", listing.shipping_available ? "Ja" : "Nej"],
    ["Kvittering", listing.receipt ? "Ja" : "Nej"],
  ];

  function showPreviousImage() {
    if (images.length === 0) return;

    setActiveImage((previous) =>
      previous === 0 ? images.length - 1 : previous - 1
    );

    setZoom(1);
  }

  function showNextImage() {
    if (images.length === 0) return;

    setActiveImage((previous) =>
      previous === images.length - 1 ? 0 : previous + 1
    );

    setZoom(1);
  }

  function selectImage(index: number) {
    setActiveImage(index);
    setZoom(1);
  }

  function openGallery() {
    if (images.length === 0) return;

    setZoom(1);
    setGalleryOpen(true);
  }

  async function toggleFavorite() {
  const currentListing = listing;

  if (!currentListing) return;

  const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("Du skal være logget ind for at gemme favoritter.");
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userData.user.id)
        .eq("listing_id", listing.id);

      if (error) {
        alert("Fejl ved fjernelse af favorit: " + error.message);
        return;
      }

      const { error: countError } = await supabase.rpc(
        "decrement_favorite_count",
        {
          listing_id_input: currentListing.id,
        }
      );

      if (countError) {
        console.log("Kunne ikke opdatere favoritantal:", countError);
      }

      setIsFavorite(false);

      setListing((current) =>
        current
          ? {
              ...current,
              favorite_count: Math.max(
                0,
                (current.favorite_count ?? 1) - 1
              ),
            }
          : current
      );

      return;
    }

    const { error } = await supabase.from("favorites").insert({
      user_id: userData.user.id,
      listing_id: currentListing.id,
    });

    if (error) {
      alert("Fejl ved favorit: " + error.message);
      return;
    }

    const { error: countError } = await supabase.rpc(
      "increment_favorite_count",
      {
        listing_id_input: currentListing.id,
      }
    );

    if (countError) {
      console.log("Kunne ikke opdatere favoritantal:", countError);
    }

    setIsFavorite(true);

    setListing((current) =>
      current
        ? {
            ...current,
            favorite_count: (current.favorite_count ?? 0) + 1,
          }
        : current
    );
  }


  async function handleBuyNow() {
    if (!listing || !listing.seller_id || buyingNow) return;

    try {
      setBuyingNow(true);
      setBuyError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.push(`/login?redirect=/listing/${listing.id}`);
        return;
      }

      if (user.id === listing.seller_id) {
        throw new Error("Du kan ikke købe din egen annonce.");
      }

      if (
        listing.reserved_by ||
        (listing.status && listing.status.toLowerCase() !== "active")
      ) {
        throw new Error("Varen er ikke længere tilgængelig.");
      }

      const { error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        listing_id: listing.id,
      });

      if (error && error.code !== "23505") {
        throw error;
      }

      window.dispatchEvent(new Event("equishopper-cart-changed"));
      router.push("/kurv");
    } catch (error) {
      console.error("Kunne ikke lægge varen i kurven:", error);
      setBuyError(
        error instanceof Error
          ? error.message
          : "Varen kunne ikke lægges i kurven."
      );
    } finally {
      setBuyingNow(false);
    }
  }


  async function triggerNewOfferEmail({
    conversationId,
    offerId,
  }: {
    conversationId: string;
    offerId: string;
  }) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error(
          "Budmail kunne ikke sendes: mangler gyldig session.",
          sessionError,
        );
        return;
      }

      const response = await fetch("/api/chat/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "new-offer",
          conversationId,
          offerId,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        console.error(
          "Budmail kunne ikke sendes:",
          result?.error || `HTTP ${response.status}`,
        );
      }
    } catch (error) {
      /*
       * Buddet er allerede oprettet i databasen.
       * En mailfejl må derfor ikke få selve buddet til at fejle.
       */
      console.error("Budmail fejlede:", error);
    }
  }

  async function handleSendOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!listing || !listing.seller_id || sendingOffer) return;

    const normalizedAmount = offerAmount
      .replace(/\./g, "")
      .replace(",", ".");

    const amount = Number(normalizedAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setOfferError("Indtast et gyldigt bud.");
      return;
    }

    try {
      setSendingOffer(true);
      setOfferError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.push("/login");
        return;
      }

      if (user.id === listing.seller_id) {
        throw new Error("Du kan ikke sende et bud på din egen annonce.");
      }

      const { data: existingConversation, error: searchError } =
        await supabase
          .from("conversations")
          .select("id")
          .eq("listing_id", listing.id)
          .eq("buyer_id", user.id)
          .eq("seller_id", listing.seller_id)
          .maybeSingle();

      if (searchError) throw searchError;

      let conversationId = existingConversation?.id ?? null;

      if (!conversationId) {
        const { data: newConversation, error: insertConversationError } =
          await supabase
            .from("conversations")
            .insert({
              listing_id: listing.id,
              buyer_id: user.id,
              seller_id: listing.seller_id,
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (insertConversationError) throw insertConversationError;

        conversationId = newConversation.id;
      }

      const body = offerMessage.trim()
        ? `Bud på ${amount.toLocaleString("da-DK")} kr.\n\n${offerMessage.trim()}`
        : `Bud på ${amount.toLocaleString("da-DK")} kr.`;

      const { data: newMessage, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body,
          message_type: "offer",
        })
        .select("id")
        .single();

      if (messageError) throw messageError;

      const { data: newOffer, error: offerError } = await supabase
        .from("offers")
        .insert({
          listing_id: listing.id,
          conversation_id: conversationId,
          buyer_id: user.id,
          seller_id: listing.seller_id,
          amount,
          message: offerMessage.trim() || null,
          status: "pending",
          message_id: newMessage.id,
          parent_offer_id: null,
        })
        .select("id")
        .single();

      if (offerError || !newOffer) {
        await supabase.from("messages").delete().eq("id", newMessage.id);

        throw (
          offerError ??
          new Error("Buddet blev oprettet, men offer-id kunne ikke hentes.")
        );
      }

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      await triggerNewOfferEmail({
        conversationId,
        offerId: newOffer.id,
      });

      setOfferModalOpen(false);
      setOfferAmount("");
      setOfferMessage("");

      router.push(`/beskeder/${conversationId}`);
    } catch (error) {
      console.error("Kunne ikke sende bud:", error);
      setOfferError(
        error instanceof Error ? error.message : "Buddet kunne ikke sendes."
      );
    } finally {
      setSendingOffer(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
   {!galleryOpen && <Header />}

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 md:px-8 md:pt-36">
        {/* BRØDKRUMMER */}
        <div className="mb-7 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-stone-500">
          <Link href="/" className="transition hover:text-[#063f32]">
            Forside
          </Link>

          <span className="mx-2">/</span>

          {listing.main_category && (
            <>
              <Link
                href={categoryHref}
                className="transition hover:text-[#063f32]"
              >
                {listing.main_category}
              </Link>

              <span className="mx-2">/</span>
            </>
          )}

          <span className="text-stone-700">{listing.title}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_390px]">
          {/* VENSTRE KOLONNE */}
          <div className="min-w-0">
            {/* BILLEDGALLERI */}
            <section>
              <div className="relative overflow-hidden rounded-[28px] bg-[#f1ece2] shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
                {listing.is_we_love && (
                  <div className="absolute left-5 top-5 z-20 rounded-full bg-[#d4af37] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#063f32]">
                    We Love
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-label={
                    isFavorite ? "Fjern fra favoritter" : "Gem som favorit"
                  }
                  className="absolute right-5 top-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#d4af37] shadow-sm backdrop-blur-sm transition hover:scale-105 hover:bg-white"
                >
                  {isFavorite ? (
                    <HeartIconSolid className="h-6 w-6" />
                  ) : (
                    <HeartIconOutline className="h-6 w-6" />
                  )}
                </button>

                {images[activeImage] ? (
                  <button
                    type="button"
                    onClick={openGallery}
                    aria-label="Åbn billedet i fuld størrelse"
                    className="group block w-full cursor-zoom-in"
                  >
                    <img
                      src={images[activeImage].image_url}
                      alt={listing.title}
                      className="h-[390px] w-full object-cover transition duration-500 group-hover:scale-[1.015] md:h-[540px]"
                    />

                    <span className="absolute bottom-5 right-5 z-20 flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
                      <Maximize2 className="h-4 w-4" />
                      Se stort
                    </span>
                  </button>
                ) : (
                  <div className="flex h-[390px] items-center justify-center md:h-[540px]">
                    <img
                      src="/images/equishopper-grey-logo.png"
                      alt=""
                      className="h-32 opacity-40"
                    />
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={showPreviousImage}
                      aria-label="Forrige billede"
                      className="absolute left-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#063f32] shadow-sm transition hover:scale-105 hover:bg-white"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={showNextImage}
                      aria-label="Næste billede"
                      className="absolute right-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#063f32] shadow-sm transition hover:scale-105 hover:bg-white"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 gap-2 rounded-full bg-black/30 px-3 py-2 backdrop-blur-sm">
                      {images.map((image, index) => (
                        <button
                          key={image.image_url}
                          type="button"
                          onClick={() => selectImage(index)}
                          aria-label={`Vis billede ${index + 1}`}
                          className={`h-2 w-2 rounded-full transition ${
                            activeImage === index
                              ? "scale-125 bg-[#d4af37]"
                              : "bg-white/70 hover:bg-white"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <button
                      key={image.image_url}
                      type="button"
                      onClick={() => selectImage(index)}
                      aria-label={`Vis miniature ${index + 1}`}
                      className={`h-20 w-20 flex-none overflow-hidden rounded-[14px] border-2 transition md:h-24 md:w-24 ${
                        activeImage === index
                          ? "scale-[1.02] border-[#d4af37] shadow-sm"
                          : "border-transparent opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={image.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* BESKRIVELSE */}
            <section className="mt-7 rounded-[26px] border border-[#eadfcb] bg-[#fbfaf7] p-6 shadow-[0_14px_36px_rgba(0,0,0,0.045)] md:p-7">
              <h2 className="mb-4 font-serif text-[28px] text-[#063f32]">
                Beskrivelse
              </h2>

              <p className="whitespace-pre-wrap text-base leading-7 text-stone-700">
                {listing.description || "Ingen beskrivelse."}
              </p>
            </section>
          </div>

{/* HØJRE KOLONNE */}
<aside className="self-start lg:sticky lg:top-28">
  <div className="rounded-[28px] border border-[#eadfcb] bg-[#fbfaf7] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-serif text-4xl leading-[1.08] text-[#063f32]">
          {listing.title}
        </h1>

        {listing.subcategory && (
          <p className="mt-2 text-base text-[#063f32]/80">
            {listing.subcategory}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={toggleFavorite}
        aria-label={
          isFavorite ? "Fjern fra favoritter" : "Gem som favorit"
        }
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-[#eadfcb] bg-white text-[#d4af37] transition hover:scale-105 hover:border-[#d4af37]"
      >
        {isFavorite ? (
          <HeartIconSolid className="h-6 w-6" />
        ) : (
          <HeartIconOutline className="h-6 w-6" />
        )}
      </button>
    </div>

    <p className="mt-6 text-3xl font-semibold text-black">
      {listing.price.toLocaleString("da-DK")} kr.
    </p>

    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
      <span>{listing.view_count ?? 0} visninger</span>

      <span className="flex items-center gap-1.5">
        <HeartIconSolid className="h-4 w-4 text-[#d4af37]" />
        {listing.favorite_count ?? 0} favoritter
      </span>
    </div>

    <div className="my-6 grid gap-3 border-y border-[#eadfcb] py-5 text-[15px]">
      {details.map(([label, value]) => (
        <div
          key={label}
          className="flex items-start justify-between gap-5"
        >
          <span className="text-stone-500">{label}</span>

          <span className="max-w-[58%] text-right font-semibold text-[#063f32]">
            {value || "-"}
          </span>
        </div>
      ))}
    </div>

    <div className="space-y-3">
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={
          buyingNow ||
          Boolean(listing.reserved_by) ||
          Boolean(
            listing.status &&
              listing.status.toLowerCase() !== "active"
          )
        }
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3.5 font-semibold text-[#063f32] transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {buyingNow ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ShoppingCart className="h-5 w-5" />
        )}

        {buyingNow
          ? "Lægger i kurven..."
          : listing.reserved_by ||
              (listing.status &&
                listing.status.toLowerCase() !== "active")
            ? "Varen er reserveret"
            : "Køb nu"}
      </button>

      {buyError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {buyError}
        </div>
      )}

      {listing.seller_id && (
        <ContactSellerButton
          listingId={listing.id}
          sellerId={listing.seller_id}
        />
      )}

      <button
        type="button"
        onClick={() => {
          setOfferError("");
          setOfferAmount("");
          setOfferMessage("");
          setOfferModalOpen(true);
        }}
        className="w-full rounded-full border border-[#d4af37] px-6 py-3.5 font-medium text-[#063f32] transition hover:bg-[#f4ead0]"
      >
        Send bud
      </button>
    </div>

    {/* SÆLGERKORT */}
    <div className="mt-6 rounded-[22px] border border-[#eadfcb] bg-white p-5 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.25em] text-[#b79a3d]">
        Sælger
      </p>

      <div className="mt-4 flex items-center gap-4">
        {sellerProfile?.avatar_url ? (
          <img
            src={sellerProfile.avatar_url}
            alt={sellerDisplayName}
            className="h-14 w-14 flex-none rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[#063f32] font-semibold text-[#d4af37]">
            {sellerInitials}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate font-serif text-xl text-[#063f32]">
            {sellerDisplayName}
          </p>

          <p className="mt-0.5 text-sm text-stone-500">
            {sellerLocation}
          </p>
        </div>
      </div>

      {sellerProfile?.bio && (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-stone-600">
          {sellerProfile.bio}
        </p>
      )}

      <div className="mt-5 space-y-3 border-t border-[#eadfcb] pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-stone-500">Lokation</span>

          <span className="text-right font-semibold text-[#063f32]">
            {sellerLocation}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-stone-500">Anmeldelser</span>

          <span className="text-right font-semibold text-[#063f32]">
            {sellerReviewCount > 0
              ? `★ ${sellerRating.toFixed(1)} (${sellerReviewCount})`
              : "★ Ny sælger"}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-stone-500">Medlem siden</span>

          <span className="text-right font-semibold text-[#063f32]">
            {formatMemberSince(sellerProfile?.created_at)}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-stone-500">Aktive annoncer</span>

          <span className="text-right font-semibold text-[#063f32]">
            {sellerListings.length + 1}
          </span>
        </div>
      </div>

      {sellerProfile ? (
        <Link
          href={sellerProfileHref}
          className="mt-5 block w-full rounded-full border border-[#d4af37] px-5 py-3 text-center text-sm font-medium text-[#063f32] transition hover:bg-[#f4ead0]"
        >
          Se sælgers profil
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-5 w-full cursor-not-allowed rounded-full border border-stone-200 px-5 py-3 text-sm font-medium text-stone-400"
        >
          Profil ikke tilgængelig
        </button>
      )}
    </div>

    {/* TRYGHED */}
    <div className="mt-5 rounded-[22px] bg-white p-5 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.25em] text-[#b79a3d]">
        Tryg handel
      </p>

      <p className="mt-3 text-sm leading-6 text-stone-600">
        Pengene holdes sikkert, indtil varen er modtaget. Chat med sælger
        og aftal fragt direkte i Equishopper.
      </p>
    </div>
  </div>
</aside>
</div>
</div>

{/* RELATEREDE ANNONCER */}
{relatedListings.length > 0 && (
  <section className="mx-auto mt-10 max-w-6xl">
    <ListingCarousel
      title="Flere annoncer til dig"
      href={categoryHref}
      listings={relatedListings}
      favorites={[]}
      toggleFavorite={() => {}}
    />
  </section>
)}

{sellerListings.length > 0 && (
  <section className="mx-auto mt-12 max-w-6xl pb-20">
    <ListingCarousel
      title={`Andre annoncer fra ${sellerDisplayName}`}
      href={sellerProfileHref}
      listings={sellerListings}
      favorites={[]}
      toggleFavorite={() => {}}
    />
  </section>
)}


{/* BUD-MODAL */}
{offerModalOpen && (
  <div
    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
    onClick={() => {
      if (!sendingOffer) setOfferModalOpen(false);
    }}
  >
    <div
      className="w-full max-w-md rounded-[28px] border border-[#eadfcb] bg-[#fbfaf7] p-6 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#b79a3d]">
            Send bud
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[#063f32]">
            {listing.title}
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Annoncepris: {listing.price.toLocaleString("da-DK")} kr.
          </p>
        </div>

        <button
          type="button"
          disabled={sendingOffer}
          onClick={() => setOfferModalOpen(false)}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-[#063f32] shadow-sm transition hover:bg-stone-100 disabled:opacity-50"
          aria-label="Luk"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSendOffer} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="offerAmount"
            className="mb-2 block text-sm font-medium text-[#063f32]"
          >
            Dit bud
          </label>

          <div className="relative">
            <input
              id="offerAmount"
              type="text"
              inputMode="decimal"
              value={offerAmount}
              onChange={(event) => setOfferAmount(event.target.value)}
              placeholder="Fx 3.500"
              autoFocus
              className="w-full rounded-2xl border border-[#d9ccb4] bg-white px-4 py-3.5 pr-14 text-lg text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#063f32] focus:ring-2 focus:ring-[#063f32]/10"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-500">
              kr.
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="offerMessage"
            className="mb-2 block text-sm font-medium text-[#063f32]"
          >
            Besked til sælger
            <span className="ml-1 font-normal text-stone-400">(valgfri)</span>
          </label>

          <textarea
            id="offerMessage"
            rows={4}
            maxLength={1000}
            value={offerMessage}
            onChange={(event) => setOfferMessage(event.target.value)}
            placeholder="Skriv eventuelt en kort besked..."
            className="w-full resize-none rounded-2xl border border-[#d9ccb4] bg-white px-4 py-3.5 text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#063f32] focus:ring-2 focus:ring-[#063f32]/10"
          />
        </div>

        {offerError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {offerError}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={sendingOffer}
            onClick={() => setOfferModalOpen(false)}
            className="flex-1 rounded-full border border-[#d9ccb4] px-5 py-3.5 font-medium text-[#063f32] transition hover:bg-white disabled:opacity-50"
          >
            Annuller
          </button>

          <button
            type="submit"
            disabled={sendingOffer || !offerAmount.trim()}
            className="flex-1 rounded-full bg-[#063f32] px-5 py-3.5 font-medium text-white transition hover:bg-[#052f26] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendingOffer ? "Sender..." : "Send bud"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* FULLSCREEN-GALLERI */}
{galleryOpen && images[activeImage] && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
    onClick={() => setGalleryOpen(false)}
  >
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setGalleryOpen(false)}
        aria-label="Luk galleri"
        className="fixed right-5 top-24 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#063f32] shadow-xl transition hover:scale-105 hover:bg-[#f8f6f1] md:right-7 md:top-7"
      >
        <X className="h-7 w-7" />
      </button>

      <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm md:top-7">
        <button
          type="button"
          onClick={() =>
            setZoom((current) => Math.max(1, current - 0.25))
          }
          aria-label="Zoom ud"
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
        >
          <Minus className="h-5 w-5" />
        </button>

        <span className="min-w-14 text-center text-xs font-medium">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={() =>
            setZoom((current) => Math.min(3, current + 0.25))
          }
          aria-label="Zoom ind"
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
        >
          <Plus className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setZoom(1)}
          aria-label="Nulstil zoom"
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={showPreviousImage}
            aria-label="Forrige billede"
            className="absolute left-3 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 md:left-7"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          <button
            type="button"
            onClick={showNextImage}
            aria-label="Næste billede"
            className="absolute right-3 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 md:right-7"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </>
      )}

      <div className="flex h-full w-full items-center justify-center overflow-auto p-6 pt-24 md:p-20">
        <img
          src={images[activeImage].image_url}
          alt={listing.title}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom})`,
          }}
          draggable={false}
          onDoubleClick={() =>
            setZoom((current) => (current === 1 ? 2 : 1))
          }
        />
      </div>

      <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/15 px-4 py-2 text-xs text-white backdrop-blur-sm">
        {activeImage + 1} / {images.length}
      </div>
    </div>
  </div>
)}
</main>
);
}

function getInitials(name: string) {
  const words = name
    .replace(/@.*$/, "")
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "S";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatMemberSince(
  createdAt: string | null | undefined
) {
  if (!createdAt) return "-";

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("da-DK", {
    month: "long",
    year: "numeric",
  });
}