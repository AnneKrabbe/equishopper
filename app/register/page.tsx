"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

type LocationVisibility = "hidden" | "city" | "approximate";

type RegisterForm = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  locationVisibility: LocationVisibility;
  acceptedTerms: boolean;
};

type DawaAddress = {
  x?: number;
  y?: number;
  postnr?: string;
  postnrnavn?: string;
};

const initialForm: RegisterForm = {
  fullName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  locationVisibility: "approximate",
  acceptedTerms: false,
};

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField<K extends keyof RegisterForm>(
    field: K,
    value: RegisterForm[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
  }

  function handleAvatarSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setErrorMessage("");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Profilbilledet skal være JPG, PNG eller WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Profilbilledet må højst fylde 5 MB.");
      event.target.value = "";
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function findCoordinates() {
    const address = form.address.trim();
    const postalCode = form.postalCode.trim();
    const city = form.city.trim();

    const response = await fetch(
      `https://api.dataforsyningen.dk/adresser?q=${encodeURIComponent(
        `${address}, ${postalCode} ${city}`
      )}&struktur=mini&per_side=1`
    );

    if (!response.ok) {
      throw new Error("Adresseopslaget kunne ikke gennemføres.");
    }

    const results = (await response.json()) as DawaAddress[];
    const match = results[0];

    if (!match || typeof match.x !== "number" || typeof match.y !== "number") {
      throw new Error(
        "Adressen blev ikke fundet. Kontrollér adresse, postnummer og by."
      );
    }

    return {
      latitude: match.y,
      longitude: match.x,
      postalCode: match.postnr ?? postalCode,
      city: match.postnrnavn ?? city,
    };
  }

  async function uploadAvatar(userId: string) {
    if (!avatarFile) return null;

    const extension = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: avatarFile.type,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      const fullName = form.fullName.trim();
      const email = form.email.trim().toLowerCase();
      const username = form.username
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

      if (!fullName) throw new Error("Du skal indtaste dit fulde navn.");
      if (!username) throw new Error("Du skal vælge et brugernavn.");

      if (!/^[a-z0-9æøå_-]+$/i.test(username)) {
        throw new Error(
          "Brugernavnet må kun indeholde bogstaver, tal, bindestreg og underscore."
        );
      }

      if (!email) throw new Error("Du skal indtaste din emailadresse.");

      if (form.password.length < 8) {
        throw new Error("Adgangskoden skal være på mindst 8 tegn.");
      }

      if (form.password !== form.confirmPassword) {
        throw new Error("De to adgangskoder er ikke ens.");
      }

      if (!form.acceptedTerms) {
        throw new Error("Du skal acceptere handelsbetingelserne.");
      }

      if (!/^\d{4}$/.test(form.postalCode.trim())) {
        throw new Error("Postnummeret skal bestå af fire tal.");
      }

      const location = await findCoordinates();

      const profileMetadata = {
        full_name: fullName,
        username,
        phone: form.phone.trim() || null,
        address: form.address.trim(),
        postal_code: location.postalCode,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
        location_visibility: form.locationVisibility,
      };

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: profileMetadata,
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Brugeren kunne ikke oprettes.");

      // Hvis emailbekræftelse er slået fra, findes der straks en session,
      // og profilen samt profilbilledet kan gemmes direkte fra klienten.
      if (data.session) {
        const avatarUrl = await uploadAvatar(data.user.id);

        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            ...profileMetadata,
            avatar_url: avatarUrl,
          },
          { onConflict: "id" }
        );

        if (profileError) {
          if (profileError.code === "23505") {
            throw new Error("Brugernavnet er allerede taget.");
          }
          throw profileError;
        }

        router.replace("/");
        router.refresh();
        return;
      }

      // Ved emailbekræftelse oprettes profilrækken via databasen ud fra
      // user_metadata. Se den tilhørende SQL-trigger.
      const query = new URLSearchParams({ email });

      if (avatarFile) query.set("avatar", "pending");

      router.replace(`/check-email?${query.toString()}`);
    } catch (error) {
      console.error("Kunne ikke oprette bruger:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Brugeren kunne ikke oprettes."
      );
    } finally {
      setSaving(false);
    }
  }

  const initials =
    form.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "E";

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f5ee]">
        <section className="bg-[#063f32] px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#d4af37]">
              Bliv en del af Equishopper
            </p>

            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Opret din bruger
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Udfyld dine oplysninger, så du er klar til at købe og sælge.
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto w-full max-w-4xl">
            <form onSubmit={handleRegister} className="space-y-6">
              <section className="overflow-hidden rounded-[30px] border border-[#e7e1d7] bg-white shadow-[0_18px_60px_rgba(35,45,40,0.07)]">
                <div className="bg-gradient-to-br from-[#f2f6f1] to-white p-6 sm:p-8">
                  <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
                    <div className="relative shrink-0 self-start sm:self-auto">
                      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[6px] border-white bg-[#dce7de] shadow-xl sm:h-40 sm:w-40">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Forhåndsvisning af profilbillede"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl font-bold text-[#063f32]">
                            {initials}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        aria-label="Vælg profilbillede"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-1 right-1 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#063f32] text-white shadow-lg transition hover:scale-105 hover:bg-[#0b5a47]"
                      >
                        <CameraIcon />
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarSelection}
                        className="hidden"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d4af37]">
                        Din profil
                      </p>

                      <h2 className="mt-2 font-serif text-3xl font-bold text-[#063f32]">
                        {form.fullName || "Dit navn"}
                      </h2>

                      <p className="mt-1 text-[#0b5a47]">
                        {form.username
                          ? `@${form.username}`
                          : "Vælg et brugernavn"}
                      </p>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#0b5a47] px-5 py-2.5 text-sm font-semibold text-[#063f32] transition hover:bg-[#edf4ef]"
                      >
                        <CameraIcon />
                        Vælg profilbillede
                      </button>

                      <p className="mt-3 text-sm text-stone-500">
                        Valgfrit. JPG, PNG eller WebP, højst 5 MB.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <FormSection title="Kontooplysninger">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Fulde navn" required>
                    <input
                      required
                      type="text"
                      autoComplete="name"
                      value={form.fullName}
                      onChange={(event) =>
                        updateField("fullName", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Brugernavn" required>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone-400">
                        @
                      </span>

                      <input
                        required
                        type="text"
                        autoComplete="username"
                        value={form.username}
                        onChange={(event) =>
                          updateField("username", event.target.value)
                        }
                        className={`${inputClassName} pl-9`}
                      />
                    </div>
                  </FormField>

                  <FormField
                    label="Email"
                    required
                    className="sm:col-span-2"
                  >
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Adgangskode" required>
                    <input
                      required
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(event) =>
                        updateField("password", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Gentag adgangskode" required>
                    <input
                      required
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(event) =>
                        updateField("confirmPassword", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField
                    label="Telefonnummer"
                    className="sm:col-span-2"
                  >
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                      placeholder="+45 12 34 56 78"
                      className={inputClassName}
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection
                title="Adresse og lokation"
                description="Din præcise adresse vises ikke offentligt. Den bruges til at beregne afstand til annoncer."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Adresse"
                    required
                    className="sm:col-span-2"
                  >
                    <input
                      required
                      type="text"
                      autoComplete="street-address"
                      value={form.address}
                      onChange={(event) =>
                        updateField("address", event.target.value)
                      }
                      placeholder="Ridevej 12"
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="Postnummer" required>
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={4}
                      value={form.postalCode}
                      onChange={(event) =>
                        updateField(
                          "postalCode",
                          event.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField label="By" required>
                    <input
                      required
                      type="text"
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={(event) =>
                        updateField("city", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection
                title="Privatliv og synlighed"
                description="Vælg, hvordan din lokation skal vises for andre."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <PrivacyOption
                    value="approximate"
                    selected={form.locationVisibility}
                    title="Omtrentligt område"
                    description="Vis et omtrentligt område uden at vise din adresse."
                    icon={<TargetIcon />}
                    onChange={(value) =>
                      updateField("locationVisibility", value)
                    }
                  />

                  <PrivacyOption
                    value="city"
                    selected={form.locationVisibility}
                    title="Kun by"
                    description="Andre brugere kan se den by, du bor i."
                    icon={<BuildingIcon />}
                    onChange={(value) =>
                      updateField("locationVisibility", value)
                    }
                  />

                  <PrivacyOption
                    value="hidden"
                    selected={form.locationVisibility}
                    title="Skjul lokation"
                    description="Din lokation bliver ikke vist offentligt."
                    icon={<HiddenIcon />}
                    onChange={(value) =>
                      updateField("locationVisibility", value)
                    }
                  />
                </div>
              </FormSection>

              <section className="rounded-[26px] border border-[#e7e1d7] bg-white p-5 shadow-[0_16px_50px_rgba(35,45,40,0.06)] sm:p-6">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    required
                    type="checkbox"
                    checked={form.acceptedTerms}
                    onChange={(event) =>
                      updateField("acceptedTerms", event.target.checked)
                    }
                    className="mt-1 h-5 w-5 rounded border-stone-300 text-[#063f32] accent-[#063f32] focus:ring-[#0b5a47]"
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
  og har læst{" "}
  <Link
    href="/privatlivspolitik"
    target="_blank"
    rel="noopener noreferrer"
    className="font-semibold text-[#063f32] underline decoration-[#d4af37] underline-offset-4 transition hover:text-[#0b5a47]"
  >
    privatlivspolitikken
  </Link>
  .
</span>

                </label>
              </section>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 rounded-[26px] border border-[#e7e1d7] bg-white p-4 shadow-[0_16px_50px_rgba(35,45,40,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 transition hover:bg-stone-50"
                >
                  Tilbage til login
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-w-52 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-8 py-3.5 font-semibold text-[#063f32] shadow-lg shadow-[#063f32]/10 transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserPlusIcon />
                  {saving ? "Opretter bruger..." : "Opret bruger"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10";

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.06)] sm:p-8">
      <div className="mb-7">
        <h2 className="font-serif text-2xl font-bold text-[#063f32]">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

type FormFieldProps = {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

function FormField({
  label,
  required,
  className = "",
  children,
}: FormFieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-stone-700">
        {label}
        {required && <span className="ml-1 text-[#0b5a47]">*</span>}
      </span>
      {children}
    </label>
  );
}

type PrivacyOptionProps = {
  value: LocationVisibility;
  selected: LocationVisibility;
  title: string;
  description: string;
  icon: ReactNode;
  onChange: (value: LocationVisibility) => void;
};

function PrivacyOption({
  value,
  selected,
  title,
  description,
  icon,
  onChange,
}: PrivacyOptionProps) {
  const active = value === selected;

  return (
    <label
      className={`relative flex cursor-pointer flex-col rounded-2xl border p-5 transition ${
        active
          ? "border-[#0b5a47] bg-[#f0f6f1] shadow-sm"
          : "border-stone-200 bg-white hover:border-[#0b5a47]/40"
      }`}
    >
      <input
        type="radio"
        name="locationVisibility"
        value={value}
        checked={active}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            active ? "bg-[#063f32] text-white" : "bg-stone-100 text-stone-600"
          }`}
        >
          {icon}
        </span>
        <span
          className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
            active ? "border-[#0b5a47]" : "border-stone-300"
          }`}
        >
          {active && <span className="h-2.5 w-2.5 rounded-full bg-[#0b5a47]" />}
        </span>
      </div>
      <span className="mt-5 font-semibold text-[#063f32]">{title}</span>
      <span className="mt-2 text-sm leading-6 text-stone-500">{description}</span>
    </label>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c.7-4.2 3-6.3 7-6.3 2.2 0 3.9.6 5.1 1.9M18 8v6M15 11h6" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 21V5l7-3v19M12 8h7v13M2 21h20" />
      <path d="M8 7h1M8 11h1M8 15h1M15 11h1M15 15h1" />
    </svg>
  );
}

function HiddenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
      <path d="M9.4 5.2A11.5 11.5 0 0 1 12 5c5 0 8.6 4.4 9 5-.3.5-1.6 2.1-3.5 3.4M6.2 6.2C4.4 7.3 3.3 8.8 3 10c.4.8 3.8 5 9 5 .8 0 1.6-.1 2.3-.3" />
    </svg>
  );
}