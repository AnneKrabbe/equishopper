"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/home/Header";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";

const categories = {
  "Til hesten": {
    Hestepleje: [
      "Strigler og børster",
      "Strigletasker og -kasser",
      "Pelspleje",
      "Man- og halepleje",
      "Hovpleje",
      "Førstehjælp, sår og kløe",
      "Terapiprodukter",
      "Insekter",
    ],
    Rideudstyr: [
      "Sadler",
      "Underlag og pads",
      "Gamacher",
      "Bandager og -underlag",
      "Klokker og sko",
      "Hutter",
      "Gjorde og tilbehør",
      "Stigbøjler og stigremme",
      "Trenser, tøjler og tilbehør",
      "Bid",
      "Grimer og træktove",
      "Pleje af læder og udstyr",
      "Stævneudstyr og transport",
      "Piske",
      "Longering og træning",
      "Fluebeskyttelse",
    ],
    Dækkener: [
      "Regndækken",
      "Overgangsdækken",
      "Vinterdækken",
      "Linere",
      "Halse",
      "Stalddækken",
      "Fleece- og ulddækken",
      "Coolerdækken",
      "Lændedækken",
      "Insekt- og eksemdækken",
    ],
    "Hestefoder og tilskud": [
      "Fuldfoder",
      "Mash",
      "Tilskud, vitaminer og mineraler",
      "Godbidder",
    ],
  },

  "Til rytteren": {
    "Til rytteren": [
      "Ridehjelme",
      "Ridebukser og tights",
      "Ridestøvler",
      "T-shirts",
      "Bluser og trøjer",
      "Jakker og frakker",
      "Veste",
      "Stævnetøj",
      "Strømper",
      "Handsker",
      "Huer og pandebånd",
      "Accessories",
    ],
  },

  "Til stalden": {
    "Til stalden": [
      "Baljer",
      "Hegnstilbehør",
      "Hønet og slowfeedere",
      "Krybber og sliksten",
      "Legetøj",
      "Opbinding",
      "Redskaber",
      "Strøelse",
      "Staldinventar",
    ],
  },
} as const;

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

const sizeTypeBySubcategory: Record<string, string> = {
  "Grimer og træktove": "grime",
  Gamacher: "gamacher",
  "Underlag og pads": "underlag",
  Ridehjelme: "ridehjelm",
  Regndækken: "dækken",
  Overgangsdækken: "dækken",
  Vinterdækken: "dækken",
  Stalddækken: "dækken",
  "Fleece- og ulddækken": "dækken",
  Coolerdækken: "dækken",
  Lændedækken: "dækken",
  "Insekt- og eksemdækken": "dækken",
  Linere: "liner",
  Halse: "hals",
  "Gjorde og tilbehør": "gjord",
  Bid: "bid",
  "Ridebukser og tights": "ridebukser",
  Sadler: "sadel",
  "Bluser og trøjer": "dametøj",
"Jakker og frakker": "dametøj",
"T-shirts": "dametøj",
"Veste": "dametøj",
"Stævnejakker": "dametøj",
  Ridestøvler: "ridestøvler",
  Handsker: "handsker",
  Strømper: "strømper",
  Hutter: "hutter",
  "Bandager og -underlag": "bandager",
  "Klokker og sko": "klokker",
  "Trenser, tøjler og tilbehør": "trense",
  Piske: "pisk",
};

type MainCategory = keyof typeof categories;

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
  const [receipt, setReceipt] = useState(false);

  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [activePreviewImage, setActivePreviewImage] = useState(0);

  const imagePreviews = useMemo(
    () => images.map((image) => URL.createObjectURL(image)),
    [images]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

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
    async function fetchSizes() {
      setSize("");

      if (!subcategory) {
        setSizeOptions([]);
        return;
      }

let sizeType = sizeTypeBySubcategory[subcategory];

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

  const groups =
    mainCategory === "Til hesten"
      ? Object.keys(categories["Til hesten"])
      : [];

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
    ["Fragt muligt", shippingAvailable ? "Ja" : "Nej"],
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

  function handleImages(files: FileList | null) {
    if (!files) return;

    const selectedImages = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 10);

    setImages(selectedImages);
    setActivePreviewImage(0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

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

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setMessage("Du skal være logget ind for at oprette en annonce.");
      return;
    }

    setIsSubmitting(true);

    try {
      const categoryValue =
        mainCategory === "Til hesten" ? groupName : mainCategory;

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
          location: location.trim() || null,
          shipping_available: shippingAvailable,
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

      for (let index = 0; index < images.length; index += 1) {
        const file = images[index];
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
             <h2 className="mb-4 font-serif text-[30px] leading-tight text-[#063f32] md:text-3xl">
                Billeder
              </h2>

              <label
                htmlFor="listing-images"
                className="block cursor-pointer rounded-[24px] border border-dashed border-[#d4af37]/75 bg-white p-6 transition hover:bg-[#fffdf8]"
              >
                <div className="text-center">
                  <p className="font-medium text-[#063f32]">
                    Klik for at vælge billeder
                  </p>

                  <p className="mt-2 text-sm text-stone-500">
                    Upload op til 10 billeder.
                  </p>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={preview}
                        className="relative aspect-square overflow-hidden rounded-2xl bg-[#f1ece2]"
                      >
                        <img
                          src={preview}
                          alt={`Valgt billede ${index + 1}`}
                          className="h-full w-full object-cover"
                        />

                        {index === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-[#063f32] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                            Forside
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </label>

              <input
                id="listing-images"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(event) => handleImages(event.target.files)}
              />
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
            </section>

            {message && (
              <p className="mt-7 rounded-2xl bg-[#f3efe7] p-4 text-sm leading-6 text-[#063f32]">
                {message}
              </p>
            )}

            <div className="mt-9 flex flex-col items-start gap-4 md:flex-row md:items-center">
             <button
  type="submit"
  disabled={isSubmitting}
  className="w-full rounded-full bg-[#063f32] px-9 py-4 font-medium text-white transition hover:bg-[#052f26] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
>
              
                {isSubmitting ? "Opretter annonce..." : "Opret annonce"}
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
              <div className="relative overflow-hidden rounded-[32px] bg-[#f1ece2] shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
                <div className="absolute right-5 top-5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[#d4af37] shadow-sm">
                  <HeartIconOutline className="h-7 w-7" />
                </div>

                {imagePreviews[activePreviewImage] ? (
                  <img
                    src={imagePreviews[activePreviewImage]}
                    alt="Forhåndsvisning"
                    className="h-[420px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[420px] items-center justify-center">
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
                        className="h-full w-full object-cover"
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

function getSubcategories(
  mainCategory: string,
  groupName: string
): string[] {
  if (mainCategory === "Til hesten") {
    if (!groupName) return [];

    const items =
      categories["Til hesten"][
        groupName as keyof (typeof categories)["Til hesten"]
      ];

    return items ? [...items] : [];
  }

  if (mainCategory === "Til rytteren") {
    return [...categories["Til rytteren"]["Til rytteren"]];
  }

  if (mainCategory === "Til stalden") {
    return [...categories["Til stalden"]["Til stalden"]];
  }

  return [];
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
  return (
    <div className="relative">
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] pr-11 text-[15px] text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 disabled:cursor-not-allowed disabled:bg-[#f5f2ec] disabled:text-stone-400"
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
            options.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(option)}
                className="block w-full rounded-xl px-4 py-3 text-left text-sm text-[#063f32] transition hover:bg-[#f5f1e8]"
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