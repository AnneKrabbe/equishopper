"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Adgangskoderne er ikke ens.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage("Der skete en fejl: " + error.message);
      return;
    }

    setMessage("Adgangskoden er opdateret.");

    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-20">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-10 shadow">
        <h1 className="mb-3 text-4xl font-bold">
          Ny adgangskode
        </h1>

        <p className="mb-8 text-stone-500">
          Vælg en ny adgangskode til din konto.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="password"
            placeholder="Ny adgangskode"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-full border px-6 py-4"
          />

          <input
            type="password"
            placeholder="Gentag adgangskode"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-full border px-6 py-4"
          />

          <button
            type="submit"
            className="w-full rounded-full bg-black px-6 py-4 text-white"
          >
            Gem ny adgangskode
          </button>
        </form>

        {message && (
          <div className="mt-6 rounded-2xl bg-stone-100 p-5">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}