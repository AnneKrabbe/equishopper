"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Percent,
  Search,
  ShieldAlert,
  Tag,
  UserRound,
  Users,
} from "lucide-react";

import Header from "@/components/home/Header";
import { supabase } from "@/lib/supabase";

type CampaignUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
};

type Campaign = {
  id: string;
  name: string;
  user_id: string | null;
  fee_bps: number;
  priority: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user: CampaignUser | null;
};

type SearchUser = CampaignUser;
type CampaignType = "general" | "individual";

export default function AdminCampaignsPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [campaignType, setCampaignType] =
    useState<CampaignType>("general");
  const [name, setName] = useState("");
  const [feePercent, setFeePercent] = useState("2");
  const [startsOn, setStartsOn] = useState(todayInputValue());
  const [endsOn, setEndsOn] = useState("");
  const [priority, setPriority] = useState("0");

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] =
    useState<SearchUser | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    if (
      campaignType !== "individual" ||
      selectedUser ||
      userQuery.trim().length < 2
    ) {
      setUserResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      void searchUsers(userQuery);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [userQuery, campaignType, selectedUser]);

  async function initialize() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/login?redirect=/admin/kampagner");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        setAuthorized(false);
        setErrorMessage("Du har ikke adgang til adminområdet.");
        return;
      }

      setAuthorized(true);
      await loadCampaigns();
    } catch (error) {
      console.error("Admin-kampagner kunne ikke indlæses:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kampagnerne kunne ikke indlæses."
      );
    } finally {
      setLoading(false);
    }
  }

  async function getAccessToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error("Din session er udløbet. Log ind igen.");
    }

    return session.access_token;
  }

  async function loadCampaigns() {
    const token = await getAccessToken();

    const response = await fetch("/api/admin/seller-fees", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const result = (await response.json()) as {
      campaigns?: Campaign[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(result.error ?? "Kampagnerne kunne ikke hentes.");
    }

    setCampaigns(result.campaigns ?? []);
  }

  async function searchUsers(query: string) {
    try {
      setSearchingUsers(true);

      const token = await getAccessToken();
      const params = new URLSearchParams({
        userSearch: query.trim(),
      });

      const response = await fetch(
        `/api/admin/seller-fees?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result = (await response.json()) as {
        users?: SearchUser[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Brugersøgningen fejlede.");
      }

      setUserResults(result.users ?? []);
    } catch (error) {
      console.error("Brugersøgning fejlede:", error);
      setUserResults([]);
    } finally {
      setSearchingUsers(false);
    }
  }

  async function createCampaign(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const parsedFee = Number(
        feePercent.replace(",", ".")
      );
      const parsedPriority = Number(priority);

      if (!name.trim()) {
        throw new Error("Angiv et navn til kampagnen.");
      }

      if (
        !Number.isFinite(parsedFee) ||
        parsedFee < 0 ||
        parsedFee > 100
      ) {
        throw new Error("Angiv et gyldigt sælgergebyr.");
      }

      if (!startsOn) {
        throw new Error("Vælg kampagnens startdato.");
      }

      if (
        campaignType === "individual" &&
        !selectedUser
      ) {
        throw new Error("Vælg den bruger kampagnen skal gælde for.");
      }

      const startsAt = localDateStartToIso(startsOn);

      const endsAt = endsOn
        ? localDateAfterToIso(endsOn)
        : null;

      const token = await getAccessToken();

      const response = await fetch("/api/admin/seller-fees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          userId:
            campaignType === "individual"
              ? selectedUser?.id ?? null
              : null,
          feePercent: parsedFee,
          priority:
            Number.isInteger(parsedPriority)
              ? parsedPriority
              : 0,
          startsAt,
          endsAt,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ?? "Kampagnen kunne ikke oprettes."
        );
      }

      setSuccessMessage("Kampagnen er oprettet.");
      resetForm();
      await loadCampaigns();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kampagnen kunne ikke oprettes."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCampaign(campaign: Campaign) {
    try {
      setErrorMessage("");
      setSuccessMessage("");

      const token = await getAccessToken();

      const response = await fetch("/api/admin/seller-fees", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: campaign.id,
          isActive: !campaign.is_active,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ?? "Kampagnen kunne ikke opdateres."
        );
      }

      setSuccessMessage(
        campaign.is_active
          ? "Kampagnen er deaktiveret."
          : "Kampagnen er aktiveret."
      );

      await loadCampaigns();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kampagnen kunne ikke opdateres."
      );
    }
  }

  function resetForm() {
    setName("");
    setFeePercent("2");
    setStartsOn(todayInputValue());
    setEndsOn("");
    setPriority("0");
    setSelectedUser(null);
    setUserQuery("");
    setUserResults([]);
  }

  const activeCount = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.is_active &&
          getCampaignState(campaign) === "active"
      ).length,
    [campaigns]
  );

  const futureCount = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.is_active &&
          getCampaignState(campaign) === "future"
      ).length,
    [campaigns]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5ee]">
        <Header />
        <div className="flex min-h-[70vh] items-center justify-center pt-24">
          <Loader2 className="h-9 w-9 animate-spin text-[#063f32]" />
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#f8f5ee]">
        <Header />
        <section className="mx-auto max-w-2xl px-5 pb-20 pt-36">
          <div className="rounded-[30px] border border-red-200 bg-white p-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto h-12 w-12 text-red-600" />
            <h1 className="mt-5 font-serif text-3xl font-bold text-[#063f32]">
              Ingen adgang
            </h1>
            <p className="mt-3 text-stone-600">
              {errorMessage || "Du har ikke adgang til adminområdet."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5ee]">
      <Header />

      <section className="bg-[#063f32] px-4 pb-14 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
            Administration
          </p>

          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-serif text-4xl font-bold text-white sm:text-5xl">
                Kampagner & gebyrer
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-white/65">
                Administrér Equishoppers sælgergebyr og opret generelle
                eller individuelle kampagner.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/tvister"
                className="rounded-full border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Tvister
              </Link>
              <Link
                href="/admin/kampagner"
                className="rounded-full bg-[#d4af37] px-4 py-2.5 text-sm font-semibold text-[#063f32]"
              >
                Kampagner
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          {(errorMessage || successMessage) && (
            <div
              className={`mb-6 rounded-2xl border p-4 text-sm ${
                errorMessage
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {errorMessage || successMessage}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Standardgebyr"
              value="2 %"
              icon={<Percent className="h-5 w-5" />}
            />
            <SummaryCard
              label="Aktive kampagner"
              value={String(activeCount)}
              icon={<Tag className="h-5 w-5" />}
            />
            <SummaryCard
              label="Kommende"
              value={String(futureCount)}
              icon={<CalendarDays className="h-5 w-5" />}
            />
          </div>

          <div className="mt-7 grid gap-7 lg:grid-cols-[0.92fr_1.08fr]">
            <form
              onSubmit={createCampaign}
              className="rounded-[28px] border border-[#e7e1d7] bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b79a3d]">
                    Ny kampagne
                  </p>
                  <h2 className="mt-2 font-serif text-3xl font-bold text-[#063f32]">
                    Opret sælgerkampagne
                  </h2>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#edf5f0] text-[#0b5a47]">
                  <Tag className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-[#f5f3ee] p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCampaignType("general");
                    setSelectedUser(null);
                    setUserQuery("");
                  }}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    campaignType === "general"
                      ? "bg-white text-[#063f32] shadow-sm"
                      : "text-stone-500"
                  }`}
                >
                  <Users className="mx-auto mb-1.5 h-4 w-4" />
                  Generel
                </button>

                <button
                  type="button"
                  onClick={() => setCampaignType("individual")}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    campaignType === "individual"
                      ? "bg-white text-[#063f32] shadow-sm"
                      : "text-stone-500"
                  }`}
                >
                  <UserRound className="mx-auto mb-1.5 h-4 w-4" />
                  Individuel
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <Field label="Kampagnenavn">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={
                      campaignType === "general"
                        ? "Fx Sensommerkampagne"
                        : "Fx VIP-kampagne"
                    }
                    className={inputClass}
                  />
                </Field>

                {campaignType === "individual" && (
                  <Field label="Bruger">
                    {selectedUser ? (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#b9d5c8] bg-[#edf5f0] p-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#063f32]">
                            {formatUserName(selectedUser)}
                          </p>
                          <p className="mt-1 truncate text-sm text-stone-500">
                            {selectedUser.email ?? "Ingen mail"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(null);
                            setUserQuery("");
                          }}
                          className="text-sm font-semibold text-[#0b5a47] underline"
                        >
                          Skift
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-stone-400" />
                        <input
                          value={userQuery}
                          onChange={(event) =>
                            setUserQuery(event.target.value)
                          }
                          placeholder="Søg navn, brugernavn eller mail..."
                          className={`${inputClass} pl-11`}
                        />

                        {(searchingUsers ||
                          userResults.length > 0 ||
                          userQuery.trim().length >= 2) && (
                          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-64 overflow-y-auto rounded-2xl border border-[#e7e1d7] bg-white p-2 shadow-xl">
                            {searchingUsers ? (
                              <div className="flex items-center gap-2 px-3 py-3 text-sm text-stone-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Søger...
                              </div>
                            ) : userResults.length === 0 ? (
                              <p className="px-3 py-3 text-sm text-stone-500">
                                Ingen brugere fundet.
                              </p>
                            ) : (
                              userResults.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setUserResults([]);
                                    setUserQuery("");
                                  }}
                                  className="w-full rounded-xl px-3 py-3 text-left transition hover:bg-[#f5f3ee]"
                                >
                                  <p className="font-semibold text-[#063f32]">
                                    {formatUserName(user)}
                                  </p>
                                  <p className="mt-1 text-sm text-stone-500">
                                    {user.email ?? "Ingen mail"}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Field>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sælgergebyr">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={feePercent}
                        onChange={(event) =>
                          setFeePercent(event.target.value)
                        }
                        className={`${inputClass} pr-12`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-stone-400">
                        %
                      </span>
                    </div>
                  </Field>

                  <Field label="Prioritet">
                    <input
                      type="number"
                      step="1"
                      value={priority}
                      onChange={(event) =>
                        setPriority(event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Starter">
                    <input
                      type="date"
                      value={startsOn}
                      onChange={(event) =>
                        setStartsOn(event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Sidste dag (valgfri)">
                    <input
                      type="date"
                      value={endsOn}
                      onChange={(event) =>
                        setEndsOn(event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <p className="rounded-2xl bg-[#fbfaf7] p-4 text-sm leading-6 text-stone-600">
                  {campaignType === "individual"
                    ? "Denne sats gælder kun den valgte bruger og har automatisk forrang over generelle kampagner."
                    : "Denne sats gælder alle sælgere, medmindre en bruger har en individuel kampagne."}
                </p>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#063f32] px-6 py-3.5 font-semibold text-white transition hover:bg-[#052f26] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {saving ? "Opretter..." : "Opret kampagne"}
                </button>
              </div>
            </form>

            <section className="rounded-[28px] border border-[#e7e1d7] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b79a3d]">
                  Oversigt
                </p>
                <h2 className="mt-2 font-serif text-3xl font-bold text-[#063f32]">
                  Kampagner
                </h2>
              </div>

              {campaigns.length === 0 ? (
                <div className="py-14 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-[#0b5a47]" />
                  <p className="mt-4 font-semibold text-[#063f32]">
                    Ingen kampagner endnu
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {campaigns.map((campaign) => {
                    const state = getCampaignState(campaign);

                    return (
                      <article
                        key={campaign.id}
                        className="rounded-2xl border border-[#e7e1d7] p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge
                                state={state}
                                isActive={campaign.is_active}
                              />
                              <span className="rounded-full bg-[#fbf6e8] px-2.5 py-1 text-xs font-semibold text-[#8a6c13]">
                                {campaign.user_id
                                  ? "Individuel"
                                  : "Generel"}
                              </span>
                            </div>

                            <h3 className="mt-3 font-serif text-xl font-bold text-[#063f32]">
                              {campaign.name}
                            </h3>

                            {campaign.user && (
                              <p className="mt-1 text-sm text-stone-500">
                                {formatUserName(campaign.user)}
                                {campaign.user.email
                                  ? ` · ${campaign.user.email}`
                                  : ""}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 sm:text-right">
                            <p className="font-serif text-3xl font-bold text-[#063f32]">
                              {formatFee(campaign.fee_bps)}
                            </p>
                            <p className="text-xs text-stone-400">
                              sælgergebyr
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 rounded-xl bg-[#fbfaf7] p-3 text-sm text-stone-600 sm:grid-cols-2">
                          <span>
                            Fra {formatDate(campaign.starts_at)}
                          </span>
                          <span>
                            {campaign.ends_at
                              ? `Til ${formatEndDate(campaign.ends_at)}`
                              : "Ingen slutdato"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => void toggleCampaign(campaign)}
                          className={`mt-4 text-sm font-semibold underline ${
                            campaign.is_active
                              ? "text-red-600"
                              : "text-[#0b5a47]"
                          }`}
                        >
                          {campaign.is_active
                            ? "Deaktivér kampagne"
                            : "Aktivér kampagne"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

const inputClass =
  "w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-[#063f32] outline-none transition placeholder:text-stone-400 focus:border-[#0b5a47] focus:ring-4 focus:ring-[#0b5a47]/10";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#063f32]">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[#e7e1d7] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="mt-2 font-serif text-3xl font-bold text-[#063f32]">
            {value}
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf5f0] text-[#0b5a47]">
          {icon}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({
  state,
  isActive,
}: {
  state: "active" | "future" | "expired";
  isActive: boolean;
}) {
  if (!isActive) {
    return (
      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
        Deaktiveret
      </span>
    );
  }

  const label =
    state === "active"
      ? "Aktiv"
      : state === "future"
        ? "Kommende"
        : "Udløbet";

  const classes =
    state === "active"
      ? "bg-emerald-50 text-emerald-800"
      : state === "future"
        ? "bg-blue-50 text-blue-800"
        : "bg-stone-100 text-stone-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function getCampaignState(
  campaign: Campaign
): "active" | "future" | "expired" {
  const now = Date.now();
  const start = new Date(campaign.starts_at).getTime();
  const end = campaign.ends_at
    ? new Date(campaign.ends_at).getTime()
    : null;

  if (start > now) return "future";
  if (end !== null && end <= now) return "expired";
  return "active";
}

function formatUserName(user: CampaignUser) {
  if (user.full_name?.trim()) return user.full_name.trim();
  if (user.username?.trim()) return `@${user.username.trim()}`;
  return user.email ?? "Bruger";
}

function formatFee(bps: number) {
  return `${(bps / 100).toLocaleString("da-DK", {
    minimumFractionDigits: bps % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} %`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatEndDate(value: string) {
  const date = new Date(value);
  date.setDate(date.getDate() - 1);

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
  }).format(date);
}

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateStartToIso(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function localDateAfterToIso(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}