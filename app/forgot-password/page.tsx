"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    if (error) {
      setMessage("Der skete en fejl: " + error.message);
      return;
    }

    setMessage(
      "Hvis emailadressen findes, har vi sendt et link til nulstilling af adgangskoden."
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-20">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-10 shadow">
        <h1 className="mb-3 text-4xl font-bold">
          Glemt adgangskode
        </h1>

        <p className="mb-8 text-stone-500">
          Indtast din emailadresse, så sender vi et link til at vælge en ny adgangskode.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-full border px-6 py-4"
          />

          <button
            type="submit"
            className="w-full rounded-full bg-black px-6 py-4 text-white"
          >
            Send link
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