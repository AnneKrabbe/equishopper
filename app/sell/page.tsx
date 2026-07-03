"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
};

const conditions = [
  "Som ny",
  "Meget god stand",
  "God men brugt",
  "Tydelige brugsspor",
  "Defekt",
];

const sizeTypeBySubcategory: Record<string, string> = {
  "Grimer og træktove": "grime",
  "Gamacher": "gamacher",
  "Underlag og pads": "underlag",
  "Ridehjelme": "ridehjelm",
  "Regndækken": "dækken",
  "Overgangsdækken": "dækken",
  "Vinterdækken": "dækken",
  "Stalddækken": "dækken",
  "Fleece- og ulddækken": "dækken",
  "Coolerdækken": "dækken",
  "Lændedækken": "dækken",
  "Insekt- og eksemdækken": "dækken",
  "Linere": "liner",
  "Halse": "hals",
  "Gjorde og tilbehør": "gjord",
  "Bid": "bid",
  "Ridebukser og tights": "ridebukser",
  "Sadler": "sadel",
  "Ridestøvler": "ridestøvler",
  "Handsker": "handsker",
  "Strømper": "strømper",
  "Hutter": "hutter",
  "Bandager og -underlag": "bandager",
  "Klokker og sko": "klokker",
  "Trenser, tøjler og tilbehør": "trense",
  "Piske": "pisk",
};

export default function SellPage() {
  const [mainCategory, setMainCategory] = useState("");
  const [groupName, setGroupName] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [title, setTitle] = useState("");
const [price, setPrice] = useState("");
const [brand, setBrand] = useState("");
const [brandSearch, setBrandSearch] = useState("");
const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
const [customBrand, setCustomBrand] = useState("");
const [size, setSize] = useState("");
const [color, setColor] = useState("");
const [condition, setCondition] = useState("");
const [location, setLocation] = useState("");
const [shippingAvailable, setShippingAvailable] = useState("");
const [receipt, setReceipt] = useState("");
const [description, setDescription] = useState("");
const [message, setMessage] = useState("");
const [sizeOptions, setSizeOptions] = useState<string[]>([]);
const [brandOptions, setBrandOptions] = useState<string[]>([]);
const [images, setImages] = useState<File[]>([]);

useEffect(() => {
  async function fetchSizes() {
    if (!subcategory) {
      setSizeOptions([]);
      return;
    }

    const sizeType =
      sizeTypeBySubcategory[subcategory];

    if (!sizeType) {
      setSizeOptions([]);
      return;
    }


const { data, error } = await supabase
  .from("sizes")
  .select("name")
  .eq("type", sizeType)
  .order("sort_order");

if (!error && data) {
  setSizeOptions(data.map((item) => item.name));
}
  }

  fetchSizes();
}, [subcategory]);

useEffect(() => {
  async function fetchBrands() {
    const { data, error } = await supabase
      .from("brands")
      .select("name")
      .order("name");

    if (!error && data) {
      setBrandOptions(data.map((item) => item.name));
    }
  }

  fetchBrands();
}, []);

  const groups =
  mainCategory === "Til hesten"
    ? Object.keys(categories["Til hesten"])
    : [];

const subcategories =
  mainCategory === "Til hesten" && groupName
    ? categories["Til hesten"][
        groupName as keyof typeof categories["Til hesten"]
      ] || []
    : mainCategory === "Til rytteren"
      ? categories["Til rytteren"]["Til rytteren"]
      : mainCategory === "Til stalden"
        ? categories["Til stalden"]["Til stalden"]
        : [];

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    setMessage("Du skal være logget ind for at oprette en annonce.");
    return;
  }
  const { data, error } = await supabase
  .from("listings")
  .insert({
    seller_id: userData.user.id,
    title,
    price: Number(price),
    main_category: mainCategory,
    category: groupName,
    subcategory,
    brand,
    size,
    color,
    condition,
    location,
    shipping_available: shippingAvailable === "Ja",
    receipt: receipt === "Ja",
    description,
  })
  .select()
  .single();
  
  if (error) {
    setMessage("Der skete en fejl: " + error.message);
    return;
  }
  if (images.length > 0 && data?.id) {
  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    const fileExt = file.name.split(".").pop();
const filePath = `${data.id}/${Date.now()}-${i}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(filePath, file);

    if (uploadError) {
      setMessage("Annoncen blev oprettet, men billedet kunne ikke uploades: " + uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("listing-images")
      .getPublicUrl(uploadData.path);

 const { error: imageInsertError } = await supabase
  .from("listing_images")
  .insert({
    listing_id: data.id,
    image_url: publicUrlData.publicUrl,
    sort_order: i,
  });

if (imageInsertError) {
  setMessage(
    "Annoncen blev oprettet, men billed-URL kunne ikke gemmes: " +
      imageInsertError.message
  );
  return;
}
  }
}
  setMessage("Din annonce er oprettet!");
}

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow">
        <h1 className="mb-2 text-4xl font-bold">Opret annonce</h1>
        <p className="mb-8 text-stone-600">
          Sælg dit brugte rideudstyr til andre ryttere.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">


          <input
  className="w-full rounded-2xl border px-5 py-4"
  placeholder="Titel"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
/>
<input
  className="w-full rounded-2xl border px-5 py-4"
  placeholder="Pris"
  type="number"
  value={price}
  onChange={(e) => setPrice(e.target.value)}
/>

          <select
            className="w-full rounded-2xl border px-5 py-4"
            value={mainCategory}
            onChange={(e) => {
              setMainCategory(e.target.value);
              setGroupName("");
              setSubcategory("");
            }}
          >
            <option value="">Vælg hovedkategori</option>
            {Object.keys(categories).map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>

          {mainCategory === "Til hesten" && (
  <select
    className="w-full rounded-2xl border px-5 py-4"
    value={groupName}
    onChange={(e) => {
      setGroupName(e.target.value);
      setSubcategory("");
    }}
    disabled={!mainCategory}
  >
    <option value="">Vælg gruppe</option>
    {groups.map((group) => (
      <option key={group}>{group}</option>
    ))}
  </select>
)}

          <select
            className="w-full rounded-2xl border px-5 py-4"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            disabled={
  mainCategory === "Til hesten"
    ? !groupName
    : !mainCategory
}
          >
            <option value="">Vælg underkategori</option>
            {subcategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

 <div className="relative">
  <input
    value={brandSearch}
    onChange={(e) => {
      setBrandSearch(e.target.value);
      setBrand("");
      setShowBrandSuggestions(true);
    }}
    onFocus={() => setShowBrandSuggestions(true)}
    placeholder="Søg efter mærke"
    className="w-full rounded-2xl border px-5 py-4"
  />

  {showBrandSuggestions && (
    <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border bg-white shadow">

{brandOptions
  .filter((option) =>
    brandSearch
      ? option.toLowerCase().startsWith(brandSearch.toLowerCase())
      : true
  )
  .sort((a, b) => {
    if (a === "Andet") return 1;
    if (b === "Andet") return -1;
    return a.localeCompare(b);
  })
  .map((option) => (

          <button
            key={option}
            type="button"
            onClick={() => {
              setBrand(option);
              setBrandSearch(option);
              setShowBrandSuggestions(false);
            }}
            className="block w-full px-5 py-3 text-left hover:bg-stone-100"
          >
            {option}
          </button>
        ))}
    </div>
  )}
</div>

{brand === "Andet" && (
  <input
    value={customBrand}
    onChange={(e) => setCustomBrand(e.target.value)}
    placeholder="Skriv mærke"
    className="w-full rounded-2xl border px-5 py-4"
  />
)}

<select
  value={size}
  onChange={(e) => setSize(e.target.value)}
  className="w-full rounded-2xl border px-5 py-4"
>
  <option value="">Vælg størrelse</option>

  {sizeOptions.map((option) => (
    <option key={option} value={option}>
      {option}
    </option>
  ))}
</select>

<select
  value={color}
  onChange={(e) => setColor(e.target.value)}
  className="w-full rounded-2xl border px-5 py-4"
>
  <option value="">Vælg farve</option>
  <option>Sort</option>
  <option>Brun</option>
  <option>Mørkebrun</option>
  <option>Cognac</option>
  <option>Hvid</option>
  <option>Grå</option>
  <option>Navy</option>
  <option>Blå</option>
  <option>Bordeaux</option>
  <option>Grøn</option>
  <option>Beige</option>
  <option>Lyserød</option>
  <option>Sølv</option>
  <option>Guld</option>
  <option>Flerfarvet</option>
  <option>Andet</option>
</select>

   <textarea
  placeholder="Beskrivelse"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  className="w-full rounded-3xl border p-6 min-h-[150px]"
/>

<input
  type="text"
  placeholder="Postnummer"
  value={location}
  onChange={(e) => setLocation(e.target.value)}
  className="w-full rounded-full border p-6"
/>


<select
  value={condition}
  onChange={(e) => setCondition(e.target.value)}
  className="w-full rounded-full border p-6"
>
  <option value="">Vælg stand</option>
  <option>Som ny</option>
  <option>Meget god stand</option>
  <option>God men brugt</option>
  <option>Tydelige brugsspor</option>
  <option>Defekt</option>
</select>


<select
  value={shippingAvailable}
  onChange={(e) => setShippingAvailable(e.target.value)}
  className="w-full rounded-full border p-6"
>
  <option value="">Fragt muligt?</option>
  <option>Ja</option>
  <option>Nej</option>
</select>

<select
  value={receipt}
  onChange={(e) => setReceipt(e.target.value)}
  className="w-full rounded-2xl border px-5 py-4"
>
  <option value="">Kvittering</option>
  <option>Ja</option>
  <option>Nej</option>
</select>

  <div className="space-y-3">
  <label
    htmlFor="images"
    className="block w-full cursor-pointer rounded-2xl border border-dashed px-5 py-6 text-center hover:bg-stone-50"
  >
    📷 Tilføj billeder
{images.length > 0 && (
  <div>
    <div className="mt-2 text-sm text-stone-500">
      {images.length} billede(r) valgt
    </div>

    <div className="mt-4 grid grid-cols-3 gap-3">
      {images.map((image, index) => (
        <img
          key={index}
          src={URL.createObjectURL(image)}
          alt=""
          className="h-28 w-full rounded-2xl object-cover"
        />
      ))}
    </div>
  </div>
)}
  </label>

  <input
    id="images"
    type="file"
    multiple
    accept="image/*"
    className="hidden"
    onChange={(e) => {
      if (e.target.files) {
        setImages(Array.from(e.target.files).slice(0, 10));
      }
    }}
  />
</div>

<button
  type="submit"
  className="w-full rounded-full bg-black py-4 text-lg font-medium text-white"
>
  Opret annonce
</button>

{message && (
  <p className="rounded-2xl bg-stone-100 p-4 text-sm">
    {message}
  </p>
)}

</form>
</div>
</main>
);
}