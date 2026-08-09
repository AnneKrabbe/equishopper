"use client";

import {
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";
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

type ListingImage = {
  id: string;
  image_url: string;
  sort_order: number | null;
};

type ExistingImageItem = {
  kind: "existing";
  key: string;
  id: string;
  image_url: string;
};

type NewImageItem = {
  kind: "new";
  key: string;
  file: File;
  preview_url: string;
};

type ImageItem = ExistingImageItem | NewImageItem;

type ListingRecord = {
  id: string;
  seller_id: string;
  title: string;
  price: number;
  main_category: string | null;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  size: string | null;
  color: string | null;
  condition: string | null;
  location: string | null;
  postal_code: string | null;
  city: string | null;
  shipping_available: boolean | null;
  receipt: boolean | null;
  description: string | null;
  listing_images: ListingImage[] | null;
};

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mainCategory, setMainCategory] = useState("");
  const [groupName, setGroupName] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [shippingAvailable, setShippingAvailable] = useState(true);
  const [receipt, setReceipt] = useState(false);
  const [description, setDescription] = useState("");

  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [removedImages, setRemovedImages] = useState<ExistingImageItem[]>([]);
  const [activePreviewImage, setActivePreviewImage] = useState(0);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setLoadError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          router.replace(`/login?redirect=/listing/${id}/rediger`);
          return;
        }

        const [
          { data: listingData, error: listingError },
          { data: brandsData, error: brandsError },
        ] = await Promise.all([
          supabase
            .from("listings")
            .select(`
              id,
              seller_id,
              title,
              price,
              main_category,
              category,
              subcategory,
              brand,
              size,
              color,
              condition,
              location,
              postal_code,
              city,
              shipping_available,
              receipt,
              description,
              listing_images (
                id,
                image_url,
                sort_order
              )
            `)
            .eq("id", id)
            .eq("seller_id", user.id)
            .maybeSingle(),
          supabase.from("brands").select("name").order("name"),
        ]);

        if (listingError) throw listingError;

        if (!listingData) {
          throw new Error(
            "Annoncen findes ikke, eller du har ikke adgang til at redigere den."
          );
        }

        if (brandsError) {
          console.error("Kunne ikke hente mærker:", brandsError);
        }

        const listing = listingData as ListingRecord;

        setTitle(listing.title ?? "");
        setPrice(String(listing.price ?? ""));
        setMainCategory(listing.main_category ?? "");
        setGroupName(
          listing.main_category === "Til hesten"
            ? listing.category ?? ""
            : ""
        );
        setSubcategory(listing.subcategory ?? "");
        setBrand(listing.brand ?? "");
        setSize(listing.size ?? "");
        setColor(listing.color ?? "");
        setCondition(listing.condition ?? "");
        setLocation(
          listing.postal_code ??
            listing.city ??
            listing.location ??
            ""
        );
        setShippingAvailable(listing.shipping_available ?? true);
        setReceipt(listing.receipt ?? false);
        setDescription(listing.description ?? "");

        const sortedImages = [...(listing.listing_images ?? [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );

        setImageItems(
          sortedImages.map((image) => ({
            kind: "existing" as const,
            key: `existing-${image.id}`,
            id: image.id,
            image_url: image.image_url,
          }))
        );

        if (brandsData) {
          setBrandOptions(brandsData.map((item) => item.name));
        }
      } catch (error) {
        console.error("Kunne ikke hente annoncen:", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Annoncen kunne ikke hentes."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [id, router]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    async function fetchSizes() {
      if (!subcategory) {
        setSizeOptions([]);
        return;
      }

      const sizeType = sizeTypeBySubcategory[subcategory];

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

    void fetchSizes();
  }, [subcategory]);

  const groups = getCategoryGroups(mainCategory);
  const subcategories = getSubcategories(mainCategory, groupName);

  const previewDetails = useMemo(
    () => [
      ["Mærke", brand || "-"],
      ["Størrelse", size || "-"],
      ["Farve", color || "-"],
      ["Stand", condition || "-"],
      ["Lokation", location || "-"],
      [
        "Kategori",
        [mainCategory, groupName, subcategory]
          .filter(Boolean)
          .join(" · ") || "-",
      ],
      ["Fragt muligt", shippingAvailable ? "Ja" : "Nej"],
      ["Kvittering", receipt ? "Ja" : "Nej"],
    ],
    [
      brand,
      size,
      color,
      condition,
      location,
      mainCategory,
      groupName,
      subcategory,
      shippingAvailable,
      receipt,
    ]
  );

  function handleMainCategoryChange(value: string) {
    setMainCategory(value);
    setGroupName("");
    setSubcategory("");
    setSize("");
    setSizeOptions([]);
  }


  function getImageUrl(item: ImageItem) {
    return item.kind === "existing" ? item.image_url : item.preview_url;
  }

  function handleNewImages(files: FileList | null) {
    if (!files) return;

    const availableSlots = Math.max(0, 10 - imageItems.length);

    if (availableSlots === 0) {
      setMessage("Du kan højst have 10 billeder på en annonce.");
      return;
    }

    const selectedFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, availableSlots);

    const newItems: NewImageItem[] = selectedFiles.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);

      return {
        kind: "new",
        key: `new-${Date.now()}-${index}-${file.name}`,
        file,
        preview_url: previewUrl,
      };
    });

    setImageItems((current) => [...current, ...newItems]);
    setMessage("");
  }

  function removeImage(index: number) {
    setImageItems((current) => {
      const item = current[index];

      if (!item) return current;

      if (item.kind === "existing") {
        setRemovedImages((removed) => [...removed, item]);
      } else {
        URL.revokeObjectURL(item.preview_url);
        previewUrlsRef.current = previewUrlsRef.current.filter(
          (url) => url !== item.preview_url
        );
      }

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

    if (!title.trim()) {
      setMessage("Skriv en titel.");
      return;
    }

    if (!price || Number(price) < 0) {
      setMessage("Indtast en gyldig pris.");
      return;
    }

    if (!mainCategory) {
      setMessage("Vælg en hovedkategori.");
      return;
    }

    if (mainCategory === "Til hesten" && !groupName) {
      setMessage("Vælg en gruppe.");
      return;
    }

    if (!subcategory) {
      setMessage("Vælg en underkategori.");
      return;
    }

    if (!brand.trim()) {
      setMessage("Vælg eller skriv et mærke.");
      return;
    }

    if (!condition) {
      setMessage("Vælg varens stand.");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Du skal være logget ind.");

      const categoryValue =
        mainCategory === "Til hesten" ? groupName : mainCategory;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("postal_code, city, latitude, longitude")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Kunne ikke hente profilens lokation:", profileError);
      }

      const { data: updatedListing, error: updateError } = await supabase
        .from("listings")
        .update({
          title: title.trim(),
          price: Number(price),
          main_category: mainCategory,
          category: categoryValue || null,
          subcategory,
          brand: brand.trim(),
          size: size || null,
          color: color || null,
          condition,
          location:
            profile?.city ||
            profile?.postal_code ||
            location.trim() ||
            null,
          postal_code: profile?.postal_code || location.trim() || null,
          city: profile?.city || null,
          latitude: profile?.latitude ?? null,
          longitude: profile?.longitude ?? null,
          shipping_available: shippingAvailable,
          receipt,
          description: description.trim() || null,
        })
        .eq("id", id)
        .eq("seller_id", user.id)
        .select("id")
        .maybeSingle();

      if (updateError) throw updateError;

      if (!updatedListing) {
        throw new Error(
          "Annoncen kunne ikke opdateres. Kontrollér at du ejer annoncen."
        );
      }

      if (removedImages.length > 0) {
        const removedIds = removedImages.map((image) => image.id);

        const { error: deleteRowsError } = await supabase
          .from("listing_images")
          .delete()
          .in("id", removedIds)
          .eq("listing_id", id);

        if (deleteRowsError) throw deleteRowsError;

        const storagePaths = removedImages
          .map((image) => getStoragePath(image.image_url))
          .filter((path): path is string => Boolean(path));

        if (storagePaths.length > 0) {
          const { error: storageDeleteError } = await supabase.storage
            .from("listing-images")
            .remove(storagePaths);

          if (storageDeleteError) {
            console.error(
              "Billedrækkerne blev slettet, men enkelte filer kunne ikke fjernes:",
              storageDeleteError
            );
          }
        }
      }

      const savedImages: ExistingImageItem[] = [];

      for (let index = 0; index < imageItems.length; index += 1) {
        const item = imageItems[index];

        if (item.kind === "existing") {
          const { error: sortError } = await supabase
            .from("listing_images")
            .update({ sort_order: index })
            .eq("id", item.id)
            .eq("listing_id", id);

          if (sortError) throw sortError;

          savedImages.push(item);
          continue;
        }

        const extension =
          item.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
          "jpg";

        const filePath = `${id}/${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, item.file);

        if (uploadError) {
          throw new Error(`Et nyt billede kunne ikke uploades: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(uploadData.path);

        const { data: insertedImage, error: insertImageError } = await supabase
          .from("listing_images")
          .insert({
            listing_id: id,
            image_url: publicUrlData.publicUrl,
            sort_order: index,
          })
          .select("id, image_url")
          .single();

        if (insertImageError || !insertedImage) {
          throw new Error(
            insertImageError?.message ||
              "Billedet blev uploadet, men kunne ikke knyttes til annoncen."
          );
        }

        savedImages.push({
          kind: "existing",
          key: `existing-${insertedImage.id}`,
          id: insertedImage.id,
          image_url: insertedImage.image_url,
        });
      }

      setImageItems(savedImages);
      setRemovedImages([]);

      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];

      router.push(`/listing/${id}`);
      router.refresh();
    } catch (error) {
      console.error("Kunne ikke gemme annoncen:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Der opstod en ukendt fejl."
      );
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f6f1]">
        <Header />

        <div className="flex min-h-screen items-center justify-center px-6 pt-24">
          <div className="flex items-center gap-3 text-[#063f32]">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Henter annonce...</span>
          </div>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-[#f8f6f1]">
        <Header />

        <div className="mx-auto max-w-3xl px-4 pb-20 pt-32 md:px-8 md:pt-36">
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-7">
            <h1 className="font-serif text-3xl text-[#063f32]">
              Annoncen kunne ikke åbnes
            </h1>

            <p className="mt-4 text-sm leading-6 text-red-700">
              {loadError}
            </p>

            <Link
              href="/mine-annoncer"
              className="mt-6 inline-flex rounded-full bg-[#063f32] px-6 py-3 font-medium text-white"
            >
              Tilbage til Mine annoncer
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const previewImage = imageItems[activePreviewImage]
    ? getImageUrl(imageItems[activePreviewImage])
    : null;

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <Header />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-32 md:px-8 md:pb-20 md:pt-36">
        <div className="mb-10">
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-[#b79a3d]">
            Din annonce
          </p>

          <h1 className="font-serif text-[42px] leading-[0.95] text-[#063f32] md:text-6xl">
            Rediger annonce
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600 md:text-lg">
            Ret oplysningerne og gem dine ændringer.
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
                      className={inputClassName}
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
                        className={`${inputClassName} pr-14`}
                      />

                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                        kr.
                      </span>
                    </div>
                  </Field>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Hovedkategori" required>
                    <select
                      required
                      value={mainCategory}
                      onChange={(event) =>
                        handleMainCategoryChange(event.target.value)
                      }
                      className={inputClassName}
                    >
                      <option value="">Vælg hovedkategori</option>
                      <option value="Til hesten">Til hesten</option>
                      <option value="Til rytteren">Til rytteren</option>
                      <option value="Til stalden">Til stalden</option>
                    </select>
                  </Field>

                  {mainCategory === "Til hesten" && (
                    <Field label="Gruppe" required>
                      <select
                        required
                        value={groupName}
                        onChange={(event) => {
                          setGroupName(event.target.value);
                          setSubcategory("");
                          setSize("");
                        }}
                        className={inputClassName}
                      >
                        <option value="">Vælg gruppe</option>

                        {groups.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Underkategori" required>
                    <select
                      required
                      value={subcategory}
                      disabled={
                        mainCategory === "Til hesten"
                          ? !groupName
                          : !mainCategory
                      }
                      onChange={(event) => {
                        setSubcategory(event.target.value);
                        setSize("");
                      }}
                      className={inputClassName}
                    >
                      <option value="">Vælg underkategori</option>

                      {subcategories
                        .slice()
                        .sort((a, b) => a.localeCompare(b, "da"))
                        .map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                    </select>
                  </Field>

                  <Field label="Mærke" required>
                    <>
                      <input
                        required
                        list="edit-brand-options"
                        value={brand}
                        onChange={(event) => setBrand(event.target.value)}
                        className={inputClassName}
                        placeholder="Vælg eller skriv mærke"
                      />

                      <datalist id="edit-brand-options">
                        {brandOptions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </>
                  </Field>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <Field label="Størrelse">
                    <select
                      value={size}
                      onChange={(event) => setSize(event.target.value)}
                      disabled={!subcategory || sizeOptions.length === 0}
                      className={inputClassName}
                    >
                      <option value="">
                        {sizeOptions.length === 0
                          ? "Ingen størrelser til kategorien"
                          : "Vælg størrelse"}
                      </option>

                      {size &&
                        !sizeOptions.includes(size) && (
                          <option value={size}>{size}</option>
                        )}

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
                      className={inputClassName}
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
                      className={inputClassName}
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
                    className={inputClassName}
                    placeholder="Fx 2000"
                  />
                </Field>

                <Field label="Beskrivelse" required>
                  <textarea
                    required
                    rows={7}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className={`${inputClassName} min-h-[180px] resize-none leading-7`}
                  />
                </Field>
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
                    rækkefølgen.
                  </p>
                </div>

                <span className="text-sm font-medium text-[#063f32]">
                  {imageItems.length} / 10 billeder
                </span>
              </div>

              <label
                htmlFor="edit-listing-images"
                className={`mt-5 flex cursor-pointer items-center justify-center gap-3 rounded-[24px] border border-dashed border-[#d4af37]/75 bg-white px-6 py-7 text-center transition hover:bg-[#fffdf8] ${
                  imageItems.length >= 10 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <ImagePlus className="h-6 w-6 text-[#b79a3d]" />

                <span>
                  <span className="block font-medium text-[#063f32]">
                    Tilføj flere billeder
                  </span>

                  <span className="mt-1 block text-sm text-stone-500">
                    Du kan vælge flere billeder på én gang.
                  </span>
                </span>
              </label>

              <input
                id="edit-listing-images"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={imageItems.length >= 10}
                onChange={(event) => {
                  handleNewImages(event.target.files);
                  event.currentTarget.value = "";
                }}
              />

              {imageItems.length > 0 ? (
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {imageItems.map((item, index) => (
                    <div
                      key={item.key}
                      className={`overflow-hidden rounded-[22px] border-2 bg-white ${
                        activePreviewImage === index
                          ? "border-[#d4af37]"
                          : "border-[#eadfcb]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActivePreviewImage(index)}
                        className="relative block aspect-square w-full overflow-hidden bg-[#f1ece2]"
                      >
                        <img
                          src={getImageUrl(item)}
                          alt={`Annoncebillede ${index + 1}`}
                          className="h-full w-full object-cover"
                        />

                        {index === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-[#063f32] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                            Forside
                          </span>
                        )}

                        {item.kind === "new" && (
                          <span className="absolute right-2 top-2 rounded-full bg-[#d4af37] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#063f32]">
                            Nyt
                          </span>
                        )}
                      </button>

                      <div className="grid grid-cols-3 gap-1 p-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveImage(index, -1)}
                          className="flex h-10 items-center justify-center rounded-xl text-[#063f32] transition hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-25"
                          aria-label="Flyt billede til venstre"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="flex h-10 items-center justify-center rounded-xl text-red-700 transition hover:bg-red-50"
                          aria-label="Slet billede"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          disabled={index === imageItems.length - 1}
                          onClick={() => moveImage(index, 1)}
                          className="flex h-10 items-center justify-center rounded-xl text-[#063f32] transition hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-25"
                          aria-label="Flyt billede til højre"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[22px] border border-[#eadfcb] bg-white px-5 py-8 text-center text-sm text-stone-500">
                  Annoncen har ingen billeder endnu.
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
            </section>

            {message && (
              <p className="mt-7 rounded-2xl bg-[#f3efe7] p-4 text-sm leading-6 text-[#063f32]">
                {message}
              </p>
            )}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#063f32] px-9 py-4 font-medium text-white transition hover:bg-[#052f26] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}

                {isSubmitting ? "Gemmer..." : "Gem ændringer"}
              </button>

              <Link
                href={`/listing/${id}`}
                className="flex w-full items-center justify-center rounded-full border border-[#d9ccb4] px-7 py-4 font-medium text-[#063f32] transition hover:bg-white sm:w-auto"
              >
                Annuller
              </Link>
            </div>
          </form>

          <aside className="hidden lg:sticky lg:top-32 lg:block lg:self-start">
            <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[#b79a3d]">
              Forhåndsvisning
            </p>

            <div className="space-y-5">
              <div className="relative overflow-hidden rounded-[32px] bg-[#f1ece2] shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
                <div className="absolute right-5 top-5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[#d4af37] shadow-sm">
                  <HeartIconOutline className="h-7 w-7" />
                </div>

                {previewImage ? (
                  <img
                    src={previewImage}
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
              </div>

              {imageItems.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {imageItems.map((item, index) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActivePreviewImage(index)}
                      className={`h-20 w-20 flex-none overflow-hidden rounded-2xl border ${
                        activePreviewImage === index
                          ? "border-[#d4af37]"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={getImageUrl(item)}
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
                  {description || "Ingen beskrivelse."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[#ded4c2] bg-white px-4 py-[14px] text-[16px] text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/15 disabled:cursor-not-allowed disabled:bg-[#f5f2ec] disabled:text-stone-400";

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


function getStoragePath(publicUrl: string) {
  const marker = "/storage/v1/object/public/listing-images/";
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) return null;

  const encodedPath = publicUrl.slice(markerIndex + marker.length);

  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}