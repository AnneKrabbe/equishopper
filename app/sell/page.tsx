"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";
import Header from "@/components/home/Header";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";

import {
  getCategoryGroups,
  getSubcategories,
} from "@/lib/listingCategories";

import { sizeTypeBySubcategory } from "@/lib/listingSizes";

const conditions = [
  "Som ny",
  "Meget god stand",
  "God men brugt",
  "Tydelige brugsspor",
  "Defekt",
];

const colors = [
  "Sort",
  "Brun",
  "Hvid",
  "Grå",
  "Blå",
  "Grøn",
  "Beige",
  "Bordeaux",
  "Rød",
  "Orange",
  "Gul",
  "Lyserød",
  "Lilla",
  "Sølv",
  "Guld",
  "Andet",
];

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type ShippingProduct = {
  id: string;
  carrier: string;
  product_code: string;
  name: string;
  description: string | null;
  package_group: string;
  min_weight_grams: number;
  max_weight_grams: number;
  max_length_cm: number | string;
  max_width_cm: number | string;
  max_height_cm: number | string;
  max_girth_plus_length_cm: number | string | null;
  size_rule_text: string | null;
  price_amount: number;
  currency: string;
  vat_included: boolean;
  outbound_enabled: boolean;
  return_enabled: boolean;
  delivery_method: string;
  sort_order: number;
};

export default function SellPage() {
  const [mainCategory, setMainCategory] = useState("");
  const [groupName, setGroupName] = useState("");

  const [subcategory, setSubcategory] = useState("");
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [showSubcategorySuggestions, setShowSubcategorySuggestions] =
    useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");

  const [brand, setBrand] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);

  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [condition, setCondition] = useState("");
  const [whipType, setWhipType] = useState("");
  const [location, setLocation] = useState("");

  const [shippingAvailable, setShippingAvailable] = useState(true);
  const [shippingProducts, setShippingProducts] = useState<ShippingProduct[]>([]);
  const [shippingProductsLoading, setShippingProductsLoading] = useState(true);
  const [selectedShippingProductId, setSelectedShippingProductId] =
    useState("");
  const [receipt, setReceipt] = useState(false);

  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(true);

  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [activePreviewImage, setActivePreviewImage] = useState(0);
  const previewUrlsRef = useRef<string[]>([]);

  const imagePreviews = useMemo(
    () => imageItems.map((item) => item.previewUrl),
    [imageItems]
  );

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkStripeStatus() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          if (mounted) {
            setStripeReady(false);
          }

          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(`
            stripe_account_id,
            stripe_details_submitted,
            stripe_payouts_enabled
          `)
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }

        if (mounted) {
          setStripeReady(
            Boolean(
              data?.stripe_account_id &&
                data?.stripe_details_submitted &&
                data?.stripe_payouts_enabled
            )
          );
        }
      } catch (error) {
        console.error("Kunne ikke kontrollere Stripe-status:", error);

        if (mounted) {
          setStripeReady(false);
          setMessage(
            "Din Stripe-status kunne ikke kontrolleres. Prøv at genindlæse siden."
          );
        }
      } finally {
        if (mounted) {
          setStripeLoading(false);
        }
      }
    }

    void checkStripeStatus();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    async function fetchBrands() {
      const { data, error } = await supabase
        .from("brands")
        .select("name")
        .order("name");

      if (error) {
        console.error("Kunne ikke hente mærker:", error);
        return;
      }

      if (data) {
        const names = data.map((item) => item.name);

        setBrandOptions(
          names.includes("Andet") ? names : [...names, "Andet"]
        );
      }
    }

    fetchBrands();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchShippingProducts() {
      try {
        setShippingProductsLoading(true);

        const { data, error } = await supabase
          .from("shipping_products")
          .select(`
            id,
            carrier,
            product_code,
            name,
            description,
            package_group,
            min_weight_grams,
            max_weight_grams,
            max_length_cm,
            max_width_cm,
            max_height_cm,
            max_girth_plus_length_cm,
            size_rule_text,
            price_amount,
            currency,
            vat_included,
            outbound_enabled,
            return_enabled,
            delivery_method,
            sort_order
          `)
          .eq("active", true)
          .eq("outbound_enabled", true)
          .eq("carrier", "dao")
          .order("sort_order", { ascending: true });

        if (error) {
          throw error;
        }

        if (!mounted) return;

        const products = (data ?? []) as ShippingProduct[];
        setShippingProducts(products);

        if (
          shippingAvailable &&
          !selectedShippingProductId &&
          products.length > 0
        ) {
          setSelectedShippingProductId(products[0].id);
        }
      } catch (error) {
        console.error("Kunne ikke hente fragtprodukter:", error);

        if (mounted) {
          setShippingProducts([]);
          setMessage(
            "Fragtmulighederne kunne ikke hentes. Prøv at genindlæse siden.",
          );
        }
      } finally {
        if (mounted) {
          setShippingProductsLoading(false);
        }
      }
    }

    void fetchShippingProducts();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shippingAvailable) {
      setSelectedShippingProductId("");
      return;
    }

    if (
      !selectedShippingProductId &&
      shippingProducts.length > 0
    ) {
      setSelectedShippingProductId(shippingProducts[0].id);
    }
  }, [
    shippingAvailable,
    shippingProducts,
    selectedShippingProductId,
  ]);

  useEffect(() => {
    async function fetchSizes() {
      setSize("");

      if (!subcategory) {
        setSizeOptions([]);
        return;
      }

let sizeType = sizeTypeBySubcategory[subcategory];

/*
 * Underlag og pads skal bruge de samme størrelser i tommer
 * som de egentlige sadelkategorier – ikke Pony/Cob/Full.
 *
 * Vi finder derfor ALLE size-typer, der bruges på rigtige
 * sadelkategorier, men udelukker underlag/pads/tilbehør,
 * og henter størrelserne direkte fra disse typer.
 */
if (subcategory.trim().toLowerCase() === "underlag og pads") {
  const saddleSizeTypes = Array.from(
    new Set(
      Object.entries(sizeTypeBySubcategory)
        .filter(([categoryName]) => {
          const normalized = categoryName.toLowerCase();

          return (
            normalized.includes("sadel") &&
            !normalized.includes("underlag") &&
            !normalized.includes("pad") &&
            !normalized.includes("tilbehør")
          );
        })
        .map(([, type]) => type)
        .filter(Boolean),
    ),
  );

  if (saddleSizeTypes.length > 0) {
    const { data, error } = await supabase
      .from("sizes")
      .select("name, type, sort_order")
      .in("type", saddleSizeTypes)
      .order("sort_order");

    if (error) {
      console.error(
        "Kunne ikke hente sadelstørrelser til underlag og pads:",
        error,
      );
      setSizeOptions([]);
      return;
    }

    const inchSizes = Array.from(
      new Set(
        (data ?? [])
          .map((item) => item.name)
          .filter(Boolean),
      ),
    );

    setSizeOptions(inchSizes);
    return;
  }
}

if (subcategory === "Piske") {
  if (!whipType) {
    setSizeOptions([]);
    return;
  }

  if (whipType === "Dressurpisk") {
    sizeType = "dressurpisk_længde";
  }

  if (whipType === "Springpisk") {
    sizeType = "spingpisk_længde";
  }

  if (whipType === "Longepisk") {
    sizeType = "longepisk_længde";
  }
}

if (!sizeType) {
  setSizeOptions([]);
  return;
}

      const { data, error } = await supabase
        .from("sizes")
        .select("name")
        .eq("type", sizeType)
        .order("sort_order");

      if (error) {
        console.error("Kunne ikke hente størrelser:", error);
        setSizeOptions([]);
        return;
      }

      setSizeOptions(data?.map((item) => item.name) ?? []);
    }

    fetchSizes();
  }, [subcategory, whipType]);

  const groups = getCategoryGroups(mainCategory);

  const subcategories = getSubcategories(mainCategory, groupName);

const filteredSubcategories =
  subcategory && subcategorySearch === subcategory
    ? [...subcategories].sort((a, b) => a.localeCompare(b, "da"))
    : subcategories
        .filter((option) =>
          option
            .toLowerCase()
            .startsWith(subcategorySearch.trim().toLowerCase())
        )
        .sort((a, b) => a.localeCompare(b, "da"));

const filteredBrands = brandOptions
  .filter((option) =>
    option
      .toLowerCase()
      .startsWith(brandSearch.trim().toLowerCase())
  )
  .sort((a, b) => {
    if (a === "Andet") return 1;
    if (b === "Andet") return -1;

    return a.localeCompare(b, "da");
  });
  
  const finalBrand =
    brand === "Andet"
      ? customBrand.trim()
      : brand || brandSearch.trim();

  const selectedShippingProduct = useMemo(
    () =>
      shippingProducts.find(
        (product) => product.id === selectedShippingProductId,
      ) ?? null,
    [shippingProducts, selectedShippingProductId],
  );

  const previewDetails = [
    ["Mærke", finalBrand || "-"],
    ["Størrelse", size || "-"],
    ["Farve", color || "-"],
    ["Stand", condition || "-"],
    ["Lokation", location || "-"],
    [
      "Kategori",
      [mainCategory, groupName, subcategory].filter(Boolean).join(" · ") || "-",
    ],
    [
      "Fragt",
      shippingAvailable
        ? selectedShippingProduct
          ? `${selectedShippingProduct.name} · ${formatShippingPrice(
              selectedShippingProduct.price_amount,
              selectedShippingProduct.currency,
            )}`
          : "Vælg pakkestørrelse"
        : "Kun afhentning",
    ],
    ["Kvittering", receipt ? "Ja" : "Nej"],
  ];

function handleMainCategoryChange(newCategory: string) {
  setMainCategory(newCategory);
  setGroupName("");
  setSubcategory("");
  setSubcategorySearch("");
  setShowSubcategorySuggestions(false);
  setSize("");
  setSizeOptions([]);
  setWhipType("");
}

function resetCategoryFields(newMainCategory: string) {
  console.log("Ny hovedkategori:", newMainCategory);

  setMainCategory(newMainCategory);
  setGroupName("");
  setSubcategory("");
  setSubcategorySearch("");
  setShowSubcategorySuggestions(false);
  setSize("");
  setSizeOptions([]);
  setWhipType("");
}


  function selectSubcategory(option: string) {
    setSubcategory(option);
    setSubcategorySearch(option);
    setShowSubcategorySuggestions(false);
  }

  function selectBrand(option: string) {
    setBrand(option);
    setBrandSearch(option);
    setCustomBrand("");
    setShowBrandSuggestions(false);
  }

  async function handleImages(files: FileList | null) {
    if (!files) return;

    const availableSlots = Math.max(0, 10 - imageItems.length);

    if (availableSlots === 0) {
      setMessage("Du kan højst uploade 10 billeder.");
      return;
    }

    const sourceFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, availableSlots);

    if (sourceFiles.length === 0) {
      setMessage("Vælg mindst ét gyldigt billede.");
      return;
    }

    setIsProcessingImages(true);
    setMessage("");

    try {
      const selectedImages = await Promise.all(
        sourceFiles.map(async (file) => {
          const preparedFile = await prepareListingImage(file);
          const previewUrl = URL.createObjectURL(preparedFile);

          previewUrlsRef.current.push(previewUrl);

          return {
            id: crypto.randomUUID(),
            file: preparedFile,
            previewUrl,
          };
        }),
      );

      setImageItems((current) => [
        ...current,
        ...selectedImages,
      ]);
    } catch (error) {
      console.error("Billederne kunne ikke klargøres:", error);

      setMessage(
        "Et eller flere billeder kunne ikke behandles. Prøv igen med JPG, PNG eller WebP.",
      );
    } finally {
      setIsProcessingImages(false);
    }
  }

  function removeImage(index: number) {
    setImageItems((current) => {
      const item = current[index];

      if (!item) return current;

      URL.revokeObjectURL(item.previewUrl);
      previewUrlsRef.current = previewUrlsRef.current.filter(
        (url) => url !== item.previewUrl
      );

      const next = current.filter((_, itemIndex) => itemIndex !== index);

      setActivePreviewImage((activeIndex) => {
        if (next.length === 0) return 0;
        if (activeIndex > index) return activeIndex - 1;
        if (activeIndex >= next.length) return next.length - 1;
        return activeIndex;
      });

      return next;
    });
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= imageItems.length) return;

    setImageItems((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });

    setActivePreviewImage((activeIndex) => {
      if (activeIndex === index) return nextIndex;
      if (activeIndex === nextIndex) return index;
      return activeIndex;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (stripeLoading) {
      setMessage("Din Stripe-status kontrolleres stadig. Vent et øjeblik.");
      return;
    }

    if (!stripeReady) {
      setMessage(
        "Du skal forbinde og færdiggøre din Stripe-konto, før du kan oprette en annonce."
      );
      return;
    }

    if (!subcategory) {
      setMessage("Vælg en underkategori.");
      return;
    }

    if (mainCategory === "Til hesten" && !groupName) {
      setMessage("Vælg en gruppe.");
      return;
    }

    if (!finalBrand) {
      setMessage("Vælg eller skriv et mærke.");
      return;
    }

    if (!condition) {
      setMessage("Vælg varens stand.");
      return;
    }

    if (shippingAvailable) {
      if (shippingProductsLoading) {
        setMessage(
          "Fragtmulighederne hentes stadig. Vent et øjeblik.",
        );
        return;
      }

      if (!selectedShippingProductId) {
        setMessage(
          "Vælg den pakkestørrelse, varen skal sendes i.",
        );
        return;
      }

      if (!selectedShippingProduct) {
        setMessage(
          "Den valgte pakkestørrelse er ikke længere tilgængelig. Vælg en anden.",
        );
        return;
      }
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setMessage("Du skal være logget ind for at oprette en annonce.");
      return;
    }

    setIsSubmitting(true);

    try {
      const categoryValue =
        mainCategory === "Til hesten" ? groupName : mainCategory;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
          postal_code,
          city,
          latitude,
          longitude,
          stripe_account_id,
          stripe_details_submitted,
          stripe_payouts_enabled
        `)
        .eq("id", userData.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error(
          "Din profil kunne ikke hentes. Prøv at genindlæse siden."
        );
      }

      const currentStripeReady = Boolean(
        profile.stripe_account_id &&
          profile.stripe_details_submitted &&
          profile.stripe_payouts_enabled
      );

      if (!currentStripeReady) {
        setStripeReady(false);

        throw new Error(
          "Du skal færdiggøre din Stripe-konto, før annoncen kan oprettes."
        );
      }

const { data: listing, error } = await supabase
  .from("listings")
  .insert({
    seller_id: userData.user.id,
    title: title.trim(),
    price: Number(price),
    main_category: mainCategory,
    category: categoryValue || null,
    subcategory,
    brand: finalBrand,
    size: size || null,
    color: color || null,
    condition,

    location:
      profile?.city ||
      profile?.postal_code ||
      location.trim() ||
      null,

    postal_code: profile?.postal_code || null,
    city: profile?.city || null,
    latitude: profile?.latitude ?? null,
    longitude: profile?.longitude ?? null,

    shipping_available: shippingAvailable,
    shipping_product_id:
      shippingAvailable && selectedShippingProduct
        ? selectedShippingProduct.id
        : null,
    receipt,
    description: description.trim() || null,
    favorite_count: 0,
    view_count: 0,
    is_we_love: false,
  })
  .select("id")
  .single();

      if (error || !listing) {
        throw new Error(error?.message || "Annoncen kunne ikke oprettes.");
      }

      for (let index = 0; index < imageItems.length; index += 1) {
        const file = imageItems[index].file;
        const fileExtension = file.name.split(".").pop() || "jpg";

        const safeExtension = fileExtension
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        const filePath = `${listing.id}/${Date.now()}-${index}.${safeExtension}`;

        const { data: uploadData, error: uploadError } =
          await supabase.storage
            .from("listing-images")
            .upload(filePath, file);

        if (uploadError) {
          throw new Error(
            `Annoncen blev oprettet, men et billede kunne ikke uploades: ${uploadError.message}`
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(uploadData.path);

        const { error: imageError } = await supabase
          .from("listing_images")
          .insert({
            listing_id: listing.id,
            image_url: publicUrlData.publicUrl,
            sort_order: index,
          });

        if (imageError) {
          throw new Error(
            `Billedet blev uploadet, men kunne ikke knyttes til annoncen: ${imageError.message}`
          );
        }
      }

      window.location.href = `/listing/${listing.id}`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Der opstod en ukendt fejl.";

      setMessage(errorMessage);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

<div className="mx-auto max-w-7xl px-4 pb-16 pt-32 md:px-8 md:pb-20 md:pt-36">
        <div className="mb-10">
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-[#b79a3d]">
            Sælg på Equishopper
          </p>

         <h1 className="font-serif text-[42px] leading-[0.95] text-[#063f32] md:text-6xl">
            Opret annonce
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600 md:text-lg">
            Lav en annonce med gode billeder og præcise oplysninger om
            varen.
          </p>

          {stripeLoading ? (
            <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600 shadow-sm">
              Kontrollerer din Stripe-konto...
            </div>
          ) : !stripeReady ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-amber-900">
                Forbind din Stripe-konto
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">
                Du skal have en godkendt Stripe-konto, før du kan offentliggøre
                en annonce. Stripe bruges til sikker udbetaling, når din vare
                bliver solgt.
              </p>

              <a
                href="/profil"
                className="mt-4 inline-flex rounded-full bg-[#d4af37] px-5 py-3 font-semibold text-[#063f32] transition hover:bg-[#e1c05a]"
              >
                Gå til Stripe-onboarding
              </a>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-900">
                Din Stripe-konto er klar til udbetaling
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                Du kan nu oprette og offentliggøre annoncer.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[26px] border border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-[0_14px_35px_rgba(0,0,0,0.05)] md:rounded-[32px] md:p-9"
          >
            <section>
             <h2 className="mb-5 font-serif text-[32px] leading-tight text-[#063f32] md:text-3xl">
                Grundoplysninger
              </h2>

              <div className="grid gap-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Titel" required>
                    <input
                      required
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                     className="w-full rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] text-[16px] text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15"
                      placeholder="Fx Amerigo Siena dressursadel"
                    />
                  </Field>

                  <Field label="Pris" required>
                    <div className="relative">
                      <input
                        required
                        min="0"
                        type="number"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        className="w-full rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] text-[16px] text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15"
                        placeholder="Fx 16500"
                      />

                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                        kr.
                      </span>
                    </div>
                  </Field>
                </div>

<div className="grid gap-5 md:grid-cols-2">

  <Field label="Hovedkategori" required>
  <div className="relative">
    <select
      required
      value={mainCategory}
      onChange={(event) => {

  setMainCategory(event.currentTarget.value);
}}
      className="w-full appearance-none rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] pr-11 text-[16px] text-[#063f32] outline-none transition focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15"
    >
      <option value="">Vælg hovedkategori</option>
      <option value="Til hesten">Til hesten</option>
      <option value="Til rytteren">Til rytteren</option>
      <option value="Til stalden">Til stalden</option>
    </select>

    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#063f32]"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
</Field>


  {mainCategory === "Til hesten" && (
    <Field label="Gruppe" required>
      <div className="relative">
        <select
          required
          value={groupName}
          onChange={(event) => {
            setGroupName(event.target.value);
            setSubcategory("");
            setSubcategorySearch("");
            setSize("");
          }}
          className="w-full appearance-none rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] pr-11 text-[16px] text-[#063f32] outline-none transition focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15"
        >
          <option value="">Vælg gruppe</option>

          {groups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>

        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#063f32]"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Field>
  )}
</div>
             
             <div className="grid gap-5 md:grid-cols-2">
  <Field label="Underkategori" required>
    <Autocomplete
      value={subcategorySearch}
      options={filteredSubcategories}
      placeholder="Søg eller vælg underkategori"
      disabled={
        mainCategory === "Til hesten"
          ? !groupName
          : !mainCategory
      }
      isOpen={showSubcategorySuggestions}
      onOpenChange={setShowSubcategorySuggestions}
      onChange={(value) => {
        setSubcategorySearch(value);
        setSubcategory("");
      }}
      onSelect={selectSubcategory}
      emptyText="Ingen underkategorier matcher søgningen."
    />
  </Field>

  <Field label="Mærke" required>
    <Autocomplete
      value={brandSearch}
      options={filteredBrands}
      placeholder="Søg eller vælg mærke"
      isOpen={showBrandSuggestions}
      onOpenChange={setShowBrandSuggestions}
      onChange={(value) => {
        setBrandSearch(value);
        setBrand("");
        setCustomBrand("");
      }}
      onSelect={selectBrand}
      emptyText="Ingen mærker matcher søgningen."
    />
  </Field>
</div>

{brand === "Andet" && (
  <Field label="Skriv mærke" required>
    <input
      required
      value={customBrand}
      onChange={(event) => setCustomBrand(event.target.value)}
      placeholder="Skriv mærkets navn"
    />
  </Field>
)}

 <div
  className={`grid gap-5 ${
    subcategory === "Piske"
      ? "md:grid-cols-4"
      : "md:grid-cols-3"
  }`}
>
  {subcategory === "Piske" && (
    <Field label="Type pisk" required>
      <select
        required
        value={whipType}
        onChange={(event) => {
          setWhipType(event.target.value);
          setSize("");
        }}
        className="w-full appearance-none rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] text-[16px] text-[#063f32] outline-none transition focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 disabled:cursor-not-allowed disabled:bg-[#f5f2ec] disabled:text-stone-400"
      >
        <option value="">Vælg type pisk</option>
        <option value="Dressurpisk">Dressurpisk</option>
        <option value="Springpisk">Springpisk</option>
        <option value="Longepisk">Longepisk</option>
      </select>
    </Field>
  )}

  <Field label={subcategory === "Piske" ? "Længde" : "Størrelse"}>
    <select
      value={size}
      onChange={(event) => setSize(event.target.value)}
     className="w-full appearance-none rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] text-[16px] text-[#063f32] outline-none transition focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 disabled:cursor-not-allowed disabled:bg-[#f5f2ec] disabled:text-stone-400"
      disabled={
        !subcategory ||
        (subcategory === "Piske" && !whipType) ||
        sizeOptions.length === 0
      }
    >
      <option value="">
        {!subcategory
          ? "Vælg først underkategori"
          : subcategory === "Piske" && !whipType
            ? "Vælg først type pisk"
            : sizeOptions.length === 0
              ? "Ingen størrelser til kategorien"
              : subcategory === "Piske"
                ? "Vælg længde"
                : "Vælg størrelse"}
      </option>

      {sizeOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </Field>

  <Field label="Farve">
    <select
      value={color}
      onChange={(event) => setColor(event.target.value)}
      className="w-full appearance-none rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] text-[16px] text-[#063f32] outline-none transition focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 disabled:cursor-not-allowed disabled:bg-[#f5f2ec] disabled:text-stone-400"
    >
      <option value="">Vælg farve</option>

      {colors.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </Field>

  <Field label="Stand" required>
    <select
      required
      value={condition}
      onChange={(event) => setCondition(event.target.value)}
      className="w-full appearance-none rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] text-[16px] text-[#063f32] outline-none transition focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 disabled:cursor-not-allowed disabled:bg-[#f5f2ec] disabled:text-stone-400"
    >
      <option value="">Vælg stand</option>

      {conditions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </Field>
</div>


                <Field label="Postnummer" required>
                  <input
                    required
                    inputMode="numeric"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="w-full rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] text-[16px] text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15"
                    placeholder="Fx 2000"
                  />
                </Field>

       <div className="w-full">
  <Field label="Beskrivelse" required>
    <textarea
      required
      rows={7}
      value={description}
      onChange={(event) => setDescription(event.target.value)}
      className="w-full min-h-[180px] resize-none rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] text-[16px] leading-7 text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15"
      placeholder="Beskriv stand, brug, størrelse, mål og eventuelle brugsspor..."
    />
  </Field>
</div>
              </div>
            </section>

            <section className="mt-9">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-serif text-[30px] leading-tight text-[#063f32] md:text-3xl">
                    Billeder
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Første billede bruges som forside. Brug pilene til at ændre
                    rækkefølgen før annoncen oprettes.
                  </p>
                </div>

                <span className="text-sm font-medium text-[#063f32]">
                  {isProcessingImages
                    ? "Klargør billeder..."
                    : `${imageItems.length} / 10 billeder`}
                </span>
              </div>

              <label
                htmlFor="listing-images"
                className={`mt-5 flex cursor-pointer items-center justify-center rounded-[24px] border border-dashed border-[#d4af37]/75 bg-white px-6 py-7 text-center transition hover:bg-[#fffdf8] ${
                  imageItems.length >= 10 || isProcessingImages
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                <span>
                  <span className="block font-medium text-[#063f32]">
                    Klik for at vælge billeder
                  </span>

                  <span className="mt-2 block text-sm text-stone-500">
                    Du kan vælge flere billeder ad gangen. De klargøres i høj kvalitet og tilpasses et ensartet 4:5-format uden at skære varen af.
                  </span>
                </span>
              </label>

              <input
                id="listing-images"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={
                  imageItems.length >= 10 ||
                  isProcessingImages
                }
                onChange={(event) => {
                  handleImages(event.target.files);
                  event.currentTarget.value = "";
                }}
              />

              {imageItems.length > 0 ? (
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {imageItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`overflow-hidden rounded-[22px] border-2 bg-white ${
                        activePreviewImage === index
                          ? "border-[#d4af37]"
                          : "border-[#eadfcb]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActivePreviewImage(index)}
                        className="relative block aspect-[4/5] w-full overflow-hidden bg-[#f1ece2]"
                      >
                        <img
                          src={item.previewUrl}
                          alt={`Valgt billede ${index + 1}`}
                          className="h-full w-full object-contain"
                        />

                        {index === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-[#063f32] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                            Forside
                          </span>
                        )}
                      </button>

                      <div className="grid grid-cols-3 gap-1 p-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveImage(index, -1)}
                          className="flex h-10 items-center justify-center rounded-xl text-lg text-[#063f32] transition hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-25"
                          aria-label="Flyt billede til venstre"
                        >
                          ←
                        </button>

                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="flex h-10 items-center justify-center rounded-xl text-red-700 transition hover:bg-red-50"
                          aria-label="Fjern billede"
                        >
                          Slet
                        </button>

                        <button
                          type="button"
                          disabled={index === imageItems.length - 1}
                          onClick={() => moveImage(index, 1)}
                          className="flex h-10 items-center justify-center rounded-xl text-lg text-[#063f32] transition hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-25"
                          aria-label="Flyt billede til højre"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[22px] border border-[#eadfcb] bg-white px-5 py-8 text-center text-sm text-stone-500">
                  Du har ikke valgt nogen billeder endnu.
                </div>
              )}
            </section>

            <section className="mt-9">
              <h2 className="mb-4 font-serif text-[30px] leading-tight text-[#063f32] md:text-3xl">
                Yderligere oplysninger
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <ChoiceCard
                  title="Fragt muligt"
                  description="Køberen kan få varen sendt"
                  checked={shippingAvailable}
                  onChange={setShippingAvailable}
                />

                <ChoiceCard
                  title="Kvittering haves"
                  description="Jeg har kvittering på varen"
                  checked={receipt}
                  onChange={setReceipt}
                />
              </div>

              {shippingAvailable && (
                <div className="mt-7">
                  <div className="rounded-[24px] border border-[#eadfcb] bg-white p-5 md:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-serif text-2xl text-[#063f32]">
                          Vælg pakkestørrelse
                        </h3>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                          Vælg efter pakkens samlede vægt, når varen er
                          forsvarligt pakket ind. DAO tillader maks. 80 cm
                          længde og omkreds + længde på maks. 240 cm.
                          Er du i tvivl om vægten, så vælg den større klasse.
                        </p>
                      </div>

                      <span className="inline-flex w-fit rounded-full bg-[#edf5f0] px-3 py-1.5 text-xs font-semibold text-[#0b5a47]">
                        DAO
                      </span>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                      <span className="font-semibold">
                        Pakker over 15 kg:
                      </span>{" "}
                      Fragt via Equishopper er ikke muligt. Vælg i så fald
                      “Fragt muligt” fra, og aftal afhentning med køber.
                    </div>

                    {shippingProductsLoading ? (
                      <div className="mt-5 rounded-2xl border border-dashed border-[#d4af37]/60 bg-[#fffdf8] px-5 py-8 text-center text-sm text-stone-600">
                        Henter pakkestørrelser...
                      </div>
                    ) : shippingProducts.length === 0 ? (
                      <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-5 text-sm text-red-700">
                        Der er ingen aktive fragtprodukter. Prøv at
                        genindlæse siden.
                      </div>
                    ) : (
                      <ShippingProductSelector
                        products={shippingProducts}
                        selectedId={selectedShippingProductId}
                        onChange={setSelectedShippingProductId}
                      />
                    )}
                  </div>
                </div>
              )}
            </section>

            {message && (
              <p className="mt-7 rounded-2xl bg-[#f3efe7] p-4 text-sm leading-6 text-[#063f32]">
                {message}
              </p>
            )}

            <div className="mt-9 flex flex-col items-start gap-4 md:flex-row md:items-center">
             <button
  type="submit"
  disabled={
    isSubmitting ||
    isProcessingImages ||
    stripeLoading ||
    !stripeReady
  }
  className="inline-flex w-full shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#063f32] px-9 py-4 font-medium text-white transition hover:bg-[#052f26] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
>
              
                {isSubmitting
                  ? "Opretter annonce..."
                  : isProcessingImages
                    ? "Klargør billeder..."
                    : stripeLoading
                    ? "Kontrollerer Stripe..."
                    : !stripeReady
                      ? "Stripe-konto mangler"
                      : "Opret annonce"}
              </button>

              <p className="max-w-lg text-sm leading-6 text-stone-500">
                Ved at oprette annoncen accepterer du vores{" "}
                <a
                  href="/terms"
                  className="text-[#b79a3d] underline underline-offset-4"
                >
                  handelsbetingelser
                </a>
                .
              </p>
            </div>
          </form>

          {/* PREVIEW I SAMME STIL SOM ANNONCESIDEN */}
         <aside className="hidden lg:sticky lg:top-32 lg:block lg:self-start">
            <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[#b79a3d]">
              Forhåndsvisning
            </p>

            <div className="space-y-5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-[#f1ece2] shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
                <div className="absolute right-5 top-5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[#d4af37] shadow-sm">
                  <HeartIconOutline className="h-7 w-7" />
                </div>

                {imagePreviews[activePreviewImage] ? (
                  <img
                    src={imagePreviews[activePreviewImage]}
                    alt="Forhåndsvisning"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <img
                      src="/images/equishopper-grey-logo.png"
                      alt=""
                      className="h-28 opacity-35"
                    />
                  </div>
                )}

                {imagePreviews.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActivePreviewImage((previous) =>
                          previous === 0
                            ? imagePreviews.length - 1
                            : previous - 1
                        )
                      }
                      className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#063f32] shadow"
                      aria-label="Forrige billede"
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActivePreviewImage((previous) =>
                          previous === imagePreviews.length - 1
                            ? 0
                            : previous + 1
                        )
                      }
                      className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#063f32] shadow"
                      aria-label="Næste billede"
                    >
                      →
                    </button>
                  </>
                )}
              </div>

              {imagePreviews.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {imagePreviews.map((preview, index) => (
                    <button
                      key={preview}
                      type="button"
                      onClick={() => setActivePreviewImage(index)}
                      className={`h-20 w-20 flex-none overflow-hidden rounded-2xl border ${
                        activePreviewImage === index
                          ? "border-[#d4af37]"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={preview}
                        alt=""
                        className="h-full w-full object-contain bg-[#f1ece2]"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-[32px] border border-[#eadfcb] bg-[#fbfaf7] p-7 shadow-[0_18px_45px_rgba(0,0,0,0.06)]">
                <h2 className="font-serif text-4xl leading-tight text-[#063f32]">
                  {title || "Din annoncetitel"}
                </h2>

                {subcategory && (
                  <p className="mt-2 text-lg text-[#063f32]">
                    {subcategory}
                  </p>
                )}

                <p className="mt-7 text-3xl font-semibold text-black">
                  {price
                    ? `${Number(price).toLocaleString("da-DK")} kr.`
                    : "0 kr."}
                </p>

                <div className="my-7 grid gap-4 border-y border-[#eadfcb] py-6 text-[15px]">
                  {previewDetails.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-5"
                    >
                      <span className="text-stone-500">{label}</span>

                      <span className="max-w-[65%] text-right font-semibold text-[#063f32]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="w-full rounded-full bg-[#063f32] px-6 py-4 font-medium text-white"
                >
                  Kontakt sælger
                </button>

                <button
                  type="button"
                  className="mt-3 w-full rounded-full border border-[#d4af37] px-6 py-4 font-medium text-[#063f32]"
                >
                  Send bud
                </button>
              </div>

              <div className="rounded-[32px] border border-[#eadfcb] bg-[#fbfaf7] p-7">
                <h2 className="mb-4 font-serif text-3xl text-[#063f32]">
                  Beskrivelse
                </h2>

                <p className="whitespace-pre-wrap text-[16px] leading-7 text-stone-700">
                  {description ||
                    "Din beskrivelse vises her, når du begynder at skrive."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx global>{`
  .input {
    display: block;
    width: 100%;
    min-height: 52px;
    border: 1px solid #ded4c2;
    border-radius: 16px;
    background: white;
    padding: 12px 14px;
    font-size: 16px;
    color: #063f32;
    outline: none;
    transition: 180ms ease;
  }

  .input:focus {
    border-color: #d4af37;
    box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
  }

  .input:disabled {
    cursor: not-allowed;
    background: #f5f2ec;
    color: #a8a29e;
  }

  .input::placeholder {
    color: #a8a29e;
  }

  textarea.input {
    min-height: 160px;
  }
`}</style>
    </main>
  );
}

const LISTING_IMAGE_WIDTH = 1800;
const LISTING_IMAGE_HEIGHT = 2250;
const LISTING_IMAGE_QUALITY = 0.94;

async function prepareListingImage(
  sourceFile: File,
): Promise<File> {
  const image = await loadImageSource(sourceFile);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = LISTING_IMAGE_WIDTH;
    canvas.height = LISTING_IMAGE_HEIGHT;

    const context = canvas.getContext("2d", {
      alpha: false,
    });

    if (!context) {
      throw new Error(
        "Browseren kunne ikke oprette billedcanvas.",
      );
    }

    context.fillStyle = "#f1ece2";
    context.fillRect(
      0,
      0,
      LISTING_IMAGE_WIDTH,
      LISTING_IMAGE_HEIGHT,
    );

    const scale = Math.min(
      LISTING_IMAGE_WIDTH / image.width,
      LISTING_IMAGE_HEIGHT / image.height,
    );

    const drawWidth = Math.max(
      1,
      Math.round(image.width * scale),
    );
    const drawHeight = Math.max(
      1,
      Math.round(image.height * scale),
    );

    const drawX = Math.round(
      (LISTING_IMAGE_WIDTH - drawWidth) / 2,
    );
    const drawY = Math.round(
      (LISTING_IMAGE_HEIGHT - drawHeight) / 2,
    );

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.drawImage(
      image.source,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );

    const blob = await canvasToBlob(
      canvas,
      "image/webp",
      LISTING_IMAGE_QUALITY,
    );

    const baseName =
      sourceFile.name.replace(/\.[^.]+$/, "") ||
      "annoncebillede";

    return new File(
      [blob],
      `${baseName}.webp`,
      {
        type: "image/webp",
        lastModified: Date.now(),
      },
    );
  } finally {
    image.close();
  }
}

async function loadImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);

    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const imageElement =
      await loadHtmlImage(objectUrl);

    return {
      source: imageElement,
      width: imageElement.naturalWidth,
      height: imageElement.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function loadHtmlImage(
  source: string,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error("Billedet kunne ikke indlæses."),
      );

    image.src = source;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(
          new Error("Billedet kunne ikke gemmes."),
        );
      },
      type,
      quality,
    );
  });
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#063f32]">
        {label}
        {required && <span className="ml-1 text-[#b79a3d]">*</span>}
      </span>

      {children}
    </label>
  );
}

function Autocomplete({
  value,
  options,
  placeholder,
  disabled = false,
  isOpen,
  onOpenChange,
  onChange,
  onSelect,
  emptyText,
}: {
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  emptyText: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [options, isOpen]);

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      onOpenChange(true);

      setActiveIndex((current) =>
        Math.min(current + 1, Math.max(0, options.length - 1)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      onOpenChange(true);

      setActiveIndex((current) =>
        Math.max(0, current - 1),
      );
      return;
    }

    if (event.key === "Enter") {
      if (!isOpen || options.length === 0) {
        return;
      }

      event.preventDefault();

      const option =
        options[activeIndex] ?? options[0];

      if (option) {
        onSelect(option);
        onOpenChange(false);
      }

      return;
    }

    if (event.key === "Escape") {
      onOpenChange(false);
    }
  }

  return (
    <div className="relative">
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] pr-11 text-[15px] text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 disabled:cursor-not-allowed disabled:bg-[#f5f2ec] disabled:text-stone-400"
        onKeyDown={handleKeyDown}
        onFocus={() => onOpenChange(true)}
        onChange={(event) => {
          onChange(event.target.value);
          onOpenChange(true);
        }}
        onBlur={() => {
          window.setTimeout(() => onOpenChange(false), 150);
        }}
      />

      <button
        type="button"
        disabled={disabled}
        aria-label="Åbn valgmuligheder"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onOpenChange(!isOpen)}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#063f32] disabled:text-stone-300"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-[#eadfcb] bg-white p-2 shadow-[0_16px_35px_rgba(0,0,0,0.12)]">
          {options.length > 0 ? (
            options.map((option, index) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => onSelect(option)}
                className={`block w-full rounded-xl px-4 py-3 text-left text-sm text-[#063f32] transition ${
                  activeIndex === index
                    ? "bg-[#f5f1e8]"
                    : "hover:bg-[#f5f1e8]"
                }`}
              >
                {option}
              </button>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-stone-500">
              {emptyText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ShippingProductSelector({
  products,
  selectedId,
  onChange,
}: {
  products: ShippingProduct[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {products.map((product) => {
        const selected = product.id === selectedId;

        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onChange(product.id)}
            aria-pressed={selected}
            className={`rounded-[22px] border p-4 text-left transition ${
              selected
                ? "border-[#d4af37] bg-[#fffdf8] shadow-[0_10px_26px_rgba(212,175,55,0.13)]"
                : "border-[#eadfcb] bg-white hover:border-[#d4af37]/70"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border ${
                  selected
                    ? "border-[#0b5a47] bg-[#0b5a47]"
                    : "border-stone-300 bg-white"
                }`}
              >
                {selected && (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-[#063f32]">
                    {product.name}
                  </p>

                  <p className="font-semibold text-[#8a6c13]">
                    {formatShippingPrice(
                      product.price_amount,
                      product.currency,
                    )}
                  </p>
                </div>

                <div className="mt-3 text-sm text-stone-600">
                  <ShippingFact
                    label="Vægt"
                    value={formatWeight(product.max_weight_grams)}
                  />
                </div>

                {product.description && (
                  <p className="mt-3 text-xs leading-5 text-stone-500">
                    {product.description}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ShippingFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-stone-500">{label}</span>
      <span className="text-right font-medium text-[#063f32]">
        {value}
      </span>
    </div>
  );
}

function formatShippingPrice(
  amount: number,
  currency: string,
) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount / 100));
}

function formatWeight(weightGrams: number) {
  if (weightGrams % 1000 === 0) {
    return `${weightGrams / 1000} kg`;
  }

  return `${(weightGrams / 1000).toLocaleString("da-DK", {
    maximumFractionDigits: 2,
  })} kg`;
}

function formatDimension(value: number | string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return String(value);
  }

  return parsed.toLocaleString("da-DK", {
    maximumFractionDigits: 2,
  });
}

function ChoiceCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 transition ${
        checked
          ? "border-[#d4af37] bg-[#fffdf8]"
          : "border-[#eadfcb] bg-white"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />

      <span>
        <span className="block font-medium text-[#063f32]">
          {title}
        </span>

        <span className="mt-1 block text-sm leading-5 text-stone-500">
          {description}
        </span>
      </span>
    </label>
  );
}