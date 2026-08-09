"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartIcon } from "@heroicons/react/24/solid";
import {
  Bell,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  UserRound,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/home/NotificationBell";

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
};

export default function Header() {
  const router = useRouter();

  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        setUser(currentUser);

        if (!currentUser) {
          setFullName("");
          setAvatarUrl(null);
          setAuthLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (error) {
          console.error("Kunne ikke hente profil til header:", error);
        }

        if (!mounted) {
          return;
        }

        const profile = data as ProfileSummary | null;

        setFullName(
          profile?.full_name ??
            currentUser.user_metadata?.full_name ??
            ""
        );

        setAvatarUrl(profile?.avatar_url ?? null);
      } catch (error) {
        console.error("Kunne ikke hente bruger:", error);
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Kunne ikke logge ud:", error);
      return;
    }

    setProfileMenuOpen(false);
    setUser(null);
    setFullName("");
    setAvatarUrl(null);

    router.push("/login");
    router.refresh();
  }

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") ||
    user?.email?.charAt(0).toUpperCase() ||
    "E";

  return (
    <header className="fixed top-0 z-[9999] w-full bg-[#063f32]/95 backdrop-blur">
      <input
        id="mobile-menu-toggle"
        type="checkbox"
        className="peer hidden"
      />

      <div className="mx-auto flex h-20 max-w-[1800px] items-center justify-between px-4 md:h-24 md:px-8">
        <Link href="/" aria-label="Gå til forsiden">
          <img
            src="/images/equishopper-logo.png"
            alt="Equishopper"
            className="h-24 w-24 translate-y-5 md:h-24 md:w-24 md:translate-y-6"
          />
        </Link>

        <nav className="hidden gap-10 text-sm uppercase tracking-[0.18em] text-[#d4af37] md:flex">
          <Link
            href="/"
            className="transition hover:text-white"
          >
            Forside
          </Link>

          <Link
            href="/annoncer"
            className="transition hover:text-white"
          >
            Annoncer
          </Link>

          <Link
            href="/"
            className="transition hover:text-white"
          >
            Nyheder
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/favorites"
            aria-label="Favoritter"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37] transition hover:bg-[#d4af37]/10"
          >
            <HeartIcon className="h-6 w-6 text-[#d4af37]" />
          </Link>

          {!authLoading && user && (
            <NotificationBell user={user} />
          )}

          {!authLoading && user ? (
            <div
              ref={profileMenuRef}
              className="relative"
            >
              <button
                type="button"
                aria-label="Åbn profilmenu"
                aria-expanded={profileMenuOpen}
                onClick={() =>
                  setProfileMenuOpen((current) => !current)
                }
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#d4af37] bg-[#d4af37] text-sm font-bold text-[#063f32] shadow-sm transition hover:scale-105"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || "Profilbillede"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
                  <div className="border-b border-stone-200 px-5 py-4">
                    <p className="truncate font-semibold text-[#063f32]">
                      {fullName || "Din profil"}
                    </p>

                    <p className="mt-1 truncate text-sm text-stone-500">
                      {user.email}
                    </p>
                  </div>

                  <div className="p-2">
                    <ProfileMenuLink
                      href="/profil"
                      label="Min profil"
                      icon={<UserRound size={19} />}
                      onClick={() => setProfileMenuOpen(false)}
                    />

                    <ProfileMenuLink
                      href="/mine-annoncer"
                      label="Mine annoncer"
                      icon={<Package size={19} />}
                      onClick={() => setProfileMenuOpen(false)}
                    />

                    <ProfileMenuLink
                      href="/favorites"
                      label="Favoritter"
                      icon={
                        <HeartIcon className="h-[19px] w-[19px]" />
                      }
                      onClick={() => setProfileMenuOpen(false)}
                    />

                    <ProfileMenuLink
                      href="/beskeder"
                      label="Beskeder"
                      icon={<MessageCircle size={19} />}
                      onClick={() => setProfileMenuOpen(false)}
                    />

                    <ProfileMenuLink
                      href="/notifikationer"
                      label="Notifikationer"
                      icon={<NotificationBellMenuIcon />}
                      onClick={() => setProfileMenuOpen(false)}
                    />
                  </div>

                  <div className="border-t border-stone-200 p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                    >
                      <LogOut size={19} />
                      Log ud
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : !authLoading ? (
            <Link
              href="/login"
              className="hidden rounded-full border border-[#d4af37] px-5 py-2.5 text-sm text-white transition hover:bg-[#d4af37]/10 md:inline-block"
            >
              Log ind
            </Link>
          ) : (
            <div className="hidden h-11 w-11 animate-pulse rounded-full bg-white/10 md:block" />
          )}

          <Link
            href="/sell"
            className="hidden rounded-full bg-[#d4af37] px-5 py-2.5 text-sm font-medium text-black transition hover:bg-[#e1c05a] md:inline-block"
          >
            Opret
          </Link>

          <label
            htmlFor="mobile-menu-toggle"
            aria-label="Åbn mobilmenu"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#d4af37] text-black md:hidden"
          >
            <Menu size={24} />
          </label>
        </div>
      </div>

      <div
        className="fixed left-0 top-0 z-[999999] hidden h-dvh w-dvw overflow-y-auto px-8 py-10 text-[#d4af37] peer-checked:block md:hidden"
        style={{ backgroundColor: "#063f32" }}
      >
        <div className="mb-12 flex items-center justify-between">
          <p className="text-xl uppercase tracking-[0.35em]">
            Menu
          </p>

          <label
            htmlFor="mobile-menu-toggle"
            aria-label="Luk mobilmenu"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-[#d4af37]"
          >
            <X size={28} />
          </label>
        </div>

        {user && (
          <Link
            href="/profil"
            className="mb-10 flex items-center gap-4 rounded-2xl border border-[#d4af37]/40 p-4"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#d4af37] bg-[#d4af37] font-bold text-[#063f32]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName || "Profilbillede"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate font-semibold text-white">
                {fullName || "Min profil"}
              </p>

              <p className="mt-1 truncate text-sm text-[#d4af37]">
                {user.email}
              </p>
            </div>
          </Link>
        )}

        <nav className="flex flex-col gap-6 text-xl font-medium">
          <Link href="/">Forside</Link>
          <Link href="/annoncer">Annoncer</Link>
          <Link href="/">Nyheder</Link>
          <Link href="/favorites">Favoritter</Link>

          {user ? (
            <>
              <Link href="/profil">Min profil</Link>
              <Link href="/mine-annoncer">Mine annoncer</Link>
              <Link href="/notifikationer">Notifikationer</Link>
              <Link href="/ch">Beskeder</Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 text-left text-red-300"
              >
                <LogOut size={22} />
                Log ud
              </button>
            </>
          ) : (
            <Link href="/login">Log ind</Link>
          )}

{!authLoading && (
  <Link
    href={user ? "/sell" : "/register"}
    className="mt-6 inline-flex w-fit rounded-full bg-[#d4af37] px-7 py-4 text-base text-black"
  >
    {user ? "Opret annonce" : "Ny bruger"}
  </Link>
)}
         
        </nav>
      </div>
    </header>
  );
}

function NotificationBellMenuIcon() {
  return <Bell size={19} />;
}

type ProfileMenuLinkProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

function ProfileMenuLink({
  href,
  label,
  icon,
  onClick,
}: ProfileMenuLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 hover:text-[#063f32]"
    >
      <span className="text-[#0b5a47]">{icon}</span>
      {label}
    </Link>
  );
}