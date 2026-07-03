"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function signUp() {
    if (!email || !password) {
      setMessage("Udfyld både email og password.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage("Der skete en fejl: " + error.message);
      return;
    }

    setMessage("Bruger oprettet. Prøv nu at logge ind.");
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("Der skete en fejl: " + error.message);
      return;
    }

  router.push("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-bold">Log ind</h1>

        <p className="mb-8 text-stone-600">
          Log ind eller opret en bruger med email og password.
        </p>

        <form onSubmit={signIn} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-full border px-5 py-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            className="w-full rounded-full border px-5 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Husk mig
          </label>

          <a
  href="/forgot-password"
  className="block text-sm text-stone-600 underline"
>
  Glemt adgangskode?
</a>

          <button
            type="submit"
            className="w-full rounded-full bg-black px-5 py-3 font-medium text-white"
          >
            Log ind
          </button>

          <button
            type="button"
            onClick={signUp}
            className="w-full rounded-full border px-5 py-3 font-medium"
          >
            Opret bruger
          </button>
        </form>

        {message && (
          <p className="mt-6 rounded-2xl bg-stone-100 p-4 text-sm">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}