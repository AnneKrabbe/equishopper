"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/home/Header";
import StripeConnectCard from "@/components/profile/StripeConnectCard";
import { supabase } from "@/lib/supabase";

type ProfileForm = {
  fullName: string;
  username: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
};

type ProfileData = {
  id: string;
  full_name: string | null;
  username: string | null;
  stripe_account_id: string | null;
  stripe_details_submitted: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  location_visibility: string | null;
  phone_verified: boolean | null;
  identity_verified: boolean | null;
  average_rating: number | null;
  review_count: number | null;
  completed_sales: number | null;
  completed_purchases: number | null;
  role: "user" | "admin" | null;
  created_at: string | null;
};

type DawaAddress = {
  x?: number;
  y?: number;
  postnr?: string;
  postnrnavn?: string;
};

type NotificationType =
  | "seller_action_required"
  | "order_shipped"
  | "ready_for_pickup"
  | "order_completed";

type ProfileNotification = {
  id: string;
  order_id: string | null;
  notification_type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

const initialForm: ProfileForm = {
  fullName: "",
  username: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
};

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [locationFound, setLocationFound] = useState(false);

  const [notifications, setNotifications] = useState<ProfileNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [markingNotifications, setMarkingNotifications] = useState(false);
  const [activeDisputeCount, setActiveDisputeCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        if (!mounted) {
          return;
        }

        setUserId(user.id);
        setEmail(user.email ?? "");
        setEmailVerified(!!user.email_confirmed_at);
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            username,
            avatar_url,
            phone,
            address,
            postal_code,
            city,
            latitude,
            longitude,
            location_visibility,
            phone_verified,
            identity_verified,
            average_rating,
            review_count,
            completed_sales,
            completed_purchases,
          role,
            stripe_account_id,
            stripe_details_submitted,
            stripe_charges_enabled,
            stripe_payouts_enabled,
            created_at
          `)
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        const profileData = data as ProfileData | null;

        setProfile(profileData);
        setAvatarUrl(profileData?.avatar_url ?? null);

        setLocationFound(
          typeof profileData?.latitude === "number" &&
            typeof profileData?.longitude === "number"
        );

        setForm({
          fullName:
            profileData?.full_name ??
            user.user_metadata?.full_name ??
            "",

          username: profileData?.username ?? "",

          phone: profileData?.phone ?? "",

          address:
            profileData?.address ??
            user.user_metadata?.address ??
            "",

          postalCode:
            profileData?.postal_code ??
            user.user_metadata?.postal_code ??
            "",

          city:
            profileData?.city ??
            user.user_metadata?.city ??
            "",
        });

        const { data: notificationData, error: notificationError } =
          await supabase
            .from("notifications")
            .select(`
              id,
              order_id,
              notification_type,
              title,
              message,
              href,
              read_at,
              created_at
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(12);

        if (notificationError) {
          throw notificationError;
        }

        const { count: disputeCount, error: disputeCountError } =
          await supabase
            .from("disputes")
            .select("id", {
              count: "exact",
              head: true,
            })
            .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
            .in("status", [
              "open",
              "awaiting_buyer",
              "awaiting_seller",
              "under_review",
            ]);

        if (disputeCountError) {
          throw disputeCountError;
        }

        if (mounted) {
          setNotifications(
            (notificationData ?? []) as ProfileNotification[]
          );
          setActiveDisputeCount(disputeCount ?? 0);
        }
      } catch (error) {
        console.error("Kunne ikke hente profil:", error);

        if (mounted) {
          setErrorMessage(
            "Din profil kunne ikke indlæses. Prøv at genindlæse siden."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setNotificationsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;

      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [router]);

  async function markNotificationRead(
    notification: ProfileNotification
  ) {
    if (!notification.read_at) {
      const { error } = await supabase.rpc(
        "mark_notification_read",
        {
          p_notification_id: notification.id,
        }
      );

      if (error) {
        console.error("Kunne ikke markere notifikation som læst:", error);
      } else {
        const readAt = new Date().toISOString();

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, read_at: readAt }
              : item
          )
        );
      }
    }

    if (notification.href) {
      router.push(notification.href);
    }
  }

  async function markAllNotificationsRead() {
    if (markingNotifications) {
      return;
    }

    setMarkingNotifications(true);

    try {
      const { error } = await supabase.rpc(
        "mark_all_notifications_read"
      );

      if (error) {
        throw error;
      }

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? readAt,
        }))
      );
    } catch (error) {
      console.error(
        "Kunne ikke markere alle notifikationer som læst:",
        error
      );

      setErrorMessage(
        "Notifikationerne kunne ikke markeres som læst."
      );
    } finally {
      setMarkingNotifications(false);
    }
  }

  function updateField<K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccessMessage("");

    if (
      field === "address" ||
      field === "postalCode" ||
      field === "city"
    ) {
      setLocationFound(false);
    }
  }

  function handleAvatarSelection(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage(
        "Profilbilledet skal være JPG, PNG eller WebP."
      );
      event.target.value = "";
      return;
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      setErrorMessage(
        "Profilbilledet må højst fylde 5 MB."
      );
      event.target.value = "";
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setAvatarFile(file);
    setAvatarPreview(previewUrl);
  }

  async function uploadAvatar() {
    if (!avatarFile || !userId) {
      return avatarUrl;
    }

    setUploadingAvatar(true);

    try {
      const extension =
        avatarFile.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      return publicUrl;
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function findCoordinates() {
    const address = form.address.trim();
    const postalCode = form.postalCode.trim();
    const city = form.city.trim();

    if (!address || !postalCode || !city) {
      throw new Error(
        "Adresse, postnummer og by skal være udfyldt."
      );
    }

    const searchText =
      `${address}, ${postalCode} ${city}`;

    const response = await fetch(
      `https://api.dataforsyningen.dk/adresser?q=${encodeURIComponent(
        searchText
      )}&struktur=mini&per_side=1`
    );

    if (!response.ok) {
      throw new Error(
        "Adresseopslaget kunne ikke gennemføres."
      );
    }

    const results =
      (await response.json()) as DawaAddress[];

    const match = results[0];

    if (
      !match ||
      typeof match.x !== "number" ||
      typeof match.y !== "number"
    ) {
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

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!userId) {
      setErrorMessage(
        "Du skal være logget ind for at gemme profilen."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const fullName = form.fullName.trim();

      const username = form.username
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

      if (!fullName) {
        throw new Error(
          "Du skal indtaste dit fulde navn."
        );
      }

      if (!username) {
        throw new Error(
          "Du skal vælge et brugernavn."
        );
      }

      if (!/^[a-z0-9æøå_-]+$/i.test(username)) {
        throw new Error(
          "Brugernavnet må kun indeholde bogstaver, tal, bindestreg og underscore."
        );
      }

      if (!/^\d{4}$/.test(form.postalCode.trim())) {
        throw new Error(
          "Postnummeret skal bestå af fire tal."
        );
      }

      const location = await findCoordinates();
      const newAvatarUrl = await uploadAvatar();

      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            full_name: fullName,
            username,
            avatar_url: newAvatarUrl,
            phone: form.phone.trim() || null,
            address: form.address.trim(),
            postal_code: location.postalCode,
            city: location.city,
            latitude: location.latitude,
            longitude: location.longitude,
            location_visibility: "city",
          },
          {
            onConflict: "id",
          }
        )
        .select(`
          id,
          full_name,
          username,
          avatar_url,
          phone,
          address,
          postal_code,
          city,
          latitude,
          longitude,
          location_visibility,
          phone_verified,
          identity_verified,
          average_rating,
          review_count,
          completed_sales,
          completed_purchases,
            role,
            stripe_account_id,
            stripe_details_submitted,
            stripe_charges_enabled,
            stripe_payouts_enabled,
          created_at
        `)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "Brugernavnet er allerede taget."
          );
        }

        throw error;
      }

      setProfile(data as ProfileData);
      setAvatarUrl(newAvatarUrl ?? null);
      setAvatarFile(null);

      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }

      setAvatarPreview(null);
      setLocationFound(true);

      setForm((current) => ({
        ...current,
        fullName,
        username,
        postalCode: location.postalCode,
        city: location.city,
      }));

      setSuccessMessage(
        "Dine profiloplysninger er gemt."
      );
    } catch (error) {
      console.error("Kunne ikke gemme profil:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Profilen kunne ikke gemmes."
      );
    } finally {
      setSaving(false);
    }
  }

  const displayedAvatar = avatarPreview || avatarUrl;

  const initials =
    form.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "E";

  const memberSince = profile?.created_at
    ? new Intl.DateTimeFormat("da-DK", {
        month: "long",
        year: "numeric",
      }).format(new Date(profile.created_at))
    : "—";

  const unreadNotifications = notifications.filter(
    (notification) => !notification.read_at
  );

  const buyerNotificationCount = unreadNotifications.filter(
    (notification) =>
      notification.notification_type === "order_shipped" ||
      notification.notification_type === "ready_for_pickup"
  ).length;

  const sellerNotificationCount = unreadNotifications.filter(
    (notification) =>
      notification.notification_type === "seller_action_required" ||
      notification.notification_type === "order_completed"
  ).length;

  if (loading) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#f8f5ee]">
          <section className="bg-[#063f32] px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
            <div className="mx-auto w-full max-w-4xl animate-pulse">
              <div className="h-4 w-40 rounded-full bg-white/15" />
              <div className="mt-6 h-16 max-w-xl rounded-2xl bg-white/15" />
              <div className="mt-6 h-6 max-w-2xl rounded-xl bg-white/10" />
            </div>
          </section>

          <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
            <div className="mx-auto w-full max-w-4xl animate-pulse">
              <div className="h-64 rounded-[30px] bg-white" />

              <div className="mt-6 space-y-6">
                <div className="h-80 rounded-[30px] bg-white" />
                <div className="h-96 rounded-[30px] bg-white" />
              </div>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f5ee]">
        <section className="bg-[#063f32] px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#d4af37]">
              Din konto
            </p>

            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Min profil
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              Administrer dine oplysninger, notifikationer, køb, salg og privatliv.
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto w-full max-w-4xl">
            <form
              onSubmit={handleSave}
              className="min-w-0 space-y-6"
            >
              <section
                id="profil"
                className="scroll-mt-32 overflow-hidden rounded-[30px] border border-[#e7e1d7] bg-white shadow-[0_18px_60px_rgba(35,45,40,0.07)]"
              >
                <div className="relative bg-gradient-to-br from-[#f2f6f1] to-white p-6 sm:p-8">
                  <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
                    <div className="relative shrink-0 self-start sm:self-auto">
                      <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-[6px] border-white bg-[#dce7de] shadow-xl sm:h-40 sm:w-40">
                        {displayedAvatar ? (
                          <img
                            src={displayedAvatar}
                            alt="Dit profilbillede"
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
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
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
                      <h2 className="truncate font-serif text-3xl font-bold text-[#063f32]">
                        {form.fullName || "Dit navn"}
                      </h2>

                      <p className="mt-1 text-[#0b5a47]">
                        {form.username
                          ? `@${form.username}`
                          : "Vælg et brugernavn"}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                        <VerificationStatus
                          verified={
                            profile?.phone_verified ?? false
                          }
                          label="Telefon"
                        />
                        <VerificationStatus
                          verified={emailVerified}
                          label="Mail"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#0b5a47] px-5 py-2.5 text-sm font-semibold text-[#063f32] transition hover:bg-[#edf4ef]"
                      >
                        <CameraIcon />
                        Skift profilbillede
                      </button>

                      {avatarFile && (
                        <p className="mt-3 text-sm text-[#0b5a47]">
                          Nyt billede valgt. Det uploades,
                          når du gemmer ændringerne.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.06)] sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5a47]">
                      Din konto
                    </p>
                  </div>

                  {unreadNotifications.length > 0 && (
                    <p className="text-sm font-medium text-stone-500">
                      {unreadNotifications.length} ulæst
                      {unreadNotifications.length === 1 ? "" : "e"} notifikation
                      {unreadNotifications.length === 1 ? "" : "er"}
                    </p>
                  )}
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <DashboardLink
                    href="/mine-ordrer"
                    title="Mine ordrer"
                    description="Følg dine køb og bekræft modtagelse."
                    icon={<PackageIcon />}
                    badge={buyerNotificationCount}
                  />

                  <DashboardLink
                    href="/profil/tvister"
                    title="Mine tvister"
                    description="Følg dine åbne og afsluttede tvistsager."
                    icon={<DisputeIcon />}
                    badge={activeDisputeCount}
                  />

                  {profile?.role === "admin" && (
                    <DashboardLink
                      href="/admin/tvister"
                      title="Adminboard"
                      description="Behandl tvister og administrer åbne sager."
                      icon={<AdminIcon />}
                    />
                  )}

                  <DashboardLink
                    href="/salg"
                    title="Mine salg"
                    description="Se nye salg, og gør ordrer klar."
                    icon={<ShopIcon />}
                    badge={sellerNotificationCount}
                  />

                  <DashboardLink
                    href="/favorites"
                    title="Favoritter"
                    description="Se de annoncer, du har gemt."
                    icon={<HeartIcon />}
                  />

                  <DashboardLink
                    href="/mine-annoncer"
                    title="Mine annoncer"
                    description="Administrer dine aktive annoncer."
                    icon={<ListIcon />}
                  />

                  <DashboardLink
                    href="/sell"
                    title="Opret annonce"
                    description="Sæt nyt udstyr til salg."
                    icon={<PlusIcon />}
                  />

                  <DashboardLink
                    href="#profil"
                    title="Profiloplysninger"
                    description="Rediger navn, adresse og lokation."
                    icon={<UserIcon />}
                  />
                </div>
              </section>

              <StripeConnectCard
                connected={Boolean(profile?.stripe_account_id)}
                detailsSubmitted={
                  profile?.stripe_details_submitted ?? false
                }
                payoutsEnabled={
                  profile?.stripe_payouts_enabled ?? false
                }
              />

              <section className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.06)] sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5a47]">
                      Notifikationer
                    </p>
                  </div>

                  {unreadNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      disabled={markingNotifications}
                      className="self-start rounded-full border border-[#0b5a47] px-4 py-2 text-sm font-semibold text-[#063f32] transition hover:bg-[#edf4ef] disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                    >
                      {markingNotifications
                        ? "Markerer..."
                        : "Markér alle som læst"}
                    </button>
                  )}
                </div>

                <div className="mt-6">
                  {notificationsLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((item) => (
                        <div
                          key={item}
                          className="h-24 animate-pulse rounded-2xl bg-stone-100"
                        />
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-stone-300 bg-[#faf9f6] px-5 py-10 text-center">
                      <BellIcon className="mx-auto h-7 w-7 text-stone-400" />
                      <p className="mt-3 font-semibold text-[#063f32]">
                        Ingen notifikationer endnu
                      </p>
                      <p className="mt-1 text-sm text-stone-500">
                        Nye køb, salg og leveringsopdateringer vises her.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() =>
                            markNotificationRead(notification)
                          }
                          className={`flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-[#f6f8f4] sm:px-5 ${
                            notification.read_at
                              ? "bg-white"
                              : "bg-[#f0f6f1]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              notification.read_at
                                ? "bg-stone-100 text-stone-500"
                                : "bg-[#063f32] text-white"
                            }`}
                          >
                            <NotificationIcon
                              type={notification.notification_type}
                            />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span className="font-semibold text-[#063f32]">
                                {notification.title}
                              </span>

                              {!notification.read_at && (
                                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                              )}
                            </span>

                            <span className="mt-1 block text-sm leading-6 text-stone-600">
                              {notification.message}
                            </span>

                            <span className="mt-2 block text-xs font-medium text-stone-400">
                              {formatNotificationDate(
                                notification.created_at
                              )}
                            </span>
                          </span>

                          {notification.href && (
                            <span className="mt-3 shrink-0 text-[#0b5a47]">
                              <ArrowRightIcon />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <FormSection title="Personlige oplysninger">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Fulde navn"
                    required
                  >
                    <input
                      required
                      type="text"
                      autoComplete="name"
                      value={form.fullName}
                      onChange={(event) =>
                        updateField(
                          "fullName",
                          event.target.value
                        )
                      }
                      className={inputClassName}
                    />
                  </FormField>

                  <FormField
                    label="Brugernavn"
                    required
                  >
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
                          updateField(
                            "username",
                            event.target.value
                          )
                        }
                        className={`${inputClassName} pl-9`}
                      />
                    </div>
                  </FormField>

                  <FormField
                    label="Email"
                    hint="Emailadressen administreres via din konto."
                    className="sm:col-span-2"
                  >
                    <input
                      readOnly
                      type="email"
                      value={email}
                      className={`${inputClassName} cursor-not-allowed bg-stone-100 text-stone-500`}
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
                        updateField(
                          "phone",
                          event.target.value
                        )
                      }
                      placeholder="+45 12 34 56 78"
                      className={inputClassName}
                    />
                  </FormField>
                </div>
              </FormSection>

              <section
                id="adresse"
                className="scroll-mt-32"
              >
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
                          updateField(
                            "address",
                            event.target.value
                          )
                        }
                        placeholder="Ridevej 12"
                        className={inputClassName}
                      />
                    </FormField>

                    <FormField
                      label="Postnummer"
                      required
                    >
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
                            event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 4)
                          )
                        }
                        className={inputClassName}
                      />
                    </FormField>

                    <FormField
                      label="By"
                      required
                    >
                      <input
                        required
                        type="text"
                        autoComplete="address-level2"
                        value={form.city}
                        onChange={(event) =>
                          updateField(
                            "city",
                            event.target.value
                          )
                        }
                        className={inputClassName}
                      />
                    </FormField>
                  </div>

                  <div
                    className={`mt-6 flex items-start gap-4 rounded-2xl border p-4 ${
                      locationFound
                        ? "border-[#cbdccb] bg-[#f0f6f1]"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 ${
                        locationFound
                          ? "text-[#063f32]"
                          : "text-amber-700"
                      }`}
                    >
                      <LocationIcon />
                    </div>

                    <div>
                      <p
                        className={`font-semibold ${
                          locationFound
                            ? "text-[#063f32]"
                            : "text-amber-900"
                        }`}
                      >
                        {locationFound
                          ? "Lokation fundet"
                          : "Lokation opdateres ved gem"}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        {locationFound
                          ? "Din lokation kan nu bruges til at vise relevante annoncer i nærheden."
                          : "Når du gemmer, kontrollerer vi adressen og finder dens koordinater."}
                      </p>
                    </div>
                  </div>
                </FormSection>
              </section>

              <section
                id="statistik"
                className="scroll-mt-32"
              >
                <FormSection title="Din statistik">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatCard
                      value={
                        profile?.average_rating
                          ? Number(
                              profile.average_rating
                            ).toFixed(1)
                          : "—"
                      }
                      label="Bedømmelse"
                    />

                    <StatCard
                      value={String(
                        profile?.review_count ?? 0
                      )}
                      label="Anmeldelser"
                    />

                    <StatCard
                      value={String(
                        profile?.completed_sales ?? 0
                      )}
                      label="Gennemførte salg"
                    />

                    <StatCard
                      value={String(
                        profile?.completed_purchases ??
                          0
                      )}
                      label="Gennemførte køb"
                    />
                  </div>

                  <p className="mt-5 text-sm text-stone-500">
                    Medlem siden {memberSince}
                  </p>
                </FormSection>
              </section>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="rounded-2xl border border-[#cbdccb] bg-[#f0f6f1] p-4 text-sm font-medium text-[#063f32]"
                >
                  {successMessage}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 rounded-[26px] border border-[#e7e1d7] bg-white p-4 shadow-[0_16px_50px_rgba(35,45,40,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 transition hover:bg-stone-50"
                >
                  Annuller
                </button>

                <button
                  type="submit"
                  disabled={saving || uploadingAvatar}
                  className="inline-flex min-w-52 items-center justify-center gap-2 rounded-full bg-[#d4af37] px-8 py-3.5 font-semibold text-[#063f32] shadow-lg shadow-[#063f32]/10 transition hover:bg-[#e1c05a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SaveIcon />

                  {saving || uploadingAvatar
                    ? "Gemmer ændringer..."
                    : "Gem ændringer"}
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

type DashboardLinkProps = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  badge?: number;
};

function DashboardLink({
  href,
  title,
  description,
  icon,
  badge = 0,
}: DashboardLinkProps) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl border border-stone-200 bg-[#faf9f6] p-5 transition hover:-translate-y-0.5 hover:border-[#0b5a47]/40 hover:bg-white hover:shadow-lg"
    >
      {badge > 0 && (
        <span className="absolute right-4 top-4 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow-sm">
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7efe8] text-[#063f32] transition group-hover:bg-[#063f32] group-hover:text-white">
        {icon}
      </span>

      <span className="mt-5 flex items-center justify-between gap-3">
        <span className="font-semibold text-[#063f32]">
          {title}
        </span>

        <span className="text-[#0b5a47] transition group-hover:translate-x-1">
          <ArrowRightIcon />
        </span>
      </span>

      <span className="mt-2 block text-sm leading-6 text-stone-500">
        {description}
      </span>
    </Link>
  );
}

function formatNotificationDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function NotificationIcon({
  type,
}: {
  type: NotificationType;
}) {
  if (type === "seller_action_required") {
    return <ShopIcon />;
  }

  if (type === "order_shipped") {
    return <TruckIcon />;
  }

  if (type === "ready_for_pickup") {
    return <PackageIcon />;
  }

  return <CheckIcon />;
}

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

function FormSection({
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section className="rounded-[30px] border border-[#e7e1d7] bg-white p-6 shadow-[0_18px_60px_rgba(35,45,40,0.06)] sm:p-8">
      <div className="mb-7">
        <h2 className="font-serif text-2xl font-bold text-[#063f32]">
          {title}
        </h2>

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
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

function FormField({
  label,
  hint,
  required,
  className = "",
  children,
}: FormFieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-stone-700">
        {label}
        {required && (
          <span className="ml-1 text-[#0b5a47]">
            *
          </span>
        )}
      </span>

      {children}

      {hint && (
        <span className="mt-2 block text-xs text-stone-500">
          {hint}
        </span>
      )}
    </label>
  );
}


type VerificationStatusProps = {
  verified: boolean;
  label: string;
};

function VerificationStatus({
  verified,
  label,
}: VerificationStatusProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm ${
        verified
          ? "text-[#0b5a47]"
          : "text-stone-500"
      }`}
    >
      <ShieldIcon />

      {verified
        ? `${label} verificeret`
        : `${label} ikke verificeret`}
    </span>
  );
}

type StatCardProps = {
  value: string;
  label: string;
};

function StatCard({
  value,
  label,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-[#faf9f6] p-5">
      <p className="font-serif text-3xl font-bold text-[#063f32]">
        {value}
      </p>

      <p className="mt-2 text-sm text-stone-500">
        {label}
      </p>
    </div>
  );
}

function PackageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7M12 11v10" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 9v11h16V9M3 9l2-5h14l2 5" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20.8 5.7a5.5 5.5 0 0 0-7.8 0L12 6.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r=".5" fill="currentColor" />
      <circle cx="3.5" cy="12" r=".5" fill="currentColor" />
      <circle cx="3.5" cy="18" r=".5" fill="currentColor" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BellIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 5h11v11H3V5ZM14 9h4l3 4v3h-7V9Z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16.5 8.5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4.3 3.5-6.5 8-6.5s7.2 2.2 8 6.5" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 5 6v5c0 4.8 2.7 8.3 7 10 4.3-1.7 7-5.2 7-10V6l-7-3Z" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </svg>
  );
}

function DisputeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 5 6v5c0 4.8 2.7 8.3 7 10 4.3-1.7 7-5.2 7-10V6l-7-3Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3 5 6v5c0 4.8 2.7 8.3 7 10 4.3-1.7 7-5.2 7-10V6l-7-3Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 3h12l2 2v16H5V3Z" />
      <path d="M8 3v6h8V3M8 21v-7h8v7" />
    </svg>
  );
}