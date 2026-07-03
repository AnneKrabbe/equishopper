"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Adgangskoderne er ikke ens.");
      return;
    }

    if (!acceptedTerms) {
      setMessage("Du skal acceptere handelsbetingelser og privatlivspolitik.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          address,
          postal_code: postalCode,
          city,
        },
      },
    });

    if (error) {
      setMessage("Der skete en fejl: " + error.message);
      return;
    }

    setMessage("Bruger oprettet. Tjek din email og bekræft din konto.");
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-bold">Opret bruger</h1>

        <p className="mb-8 text-stone-600">
          Opret en bruger for at købe og sælge rideudstyr på Equishopper.
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            required
            placeholder="Fulde navn"
            className="w-full rounded-full border px-5 py-3"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            required
            placeholder="Adresse"
            className="w-full rounded-full border px-5 py-3"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="Postnummer"
              className="w-full rounded-full border px-5 py-3"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />

            <input
              required
              placeholder="By"
              className="w-full rounded-full border px-5 py-3"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <input
            required
            type="email"
            placeholder="Email"
            className="w-full rounded-full border px-5 py-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            required
            type="password"
            minLength={6}
            placeholder="Adgangskode"
            className="w-full rounded-full border px-5 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            required
            type="password"
            minLength={6}
            placeholder="Gentag adgangskode"
            className="w-full rounded-full border px-5 py-3"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <label className="flex items-start gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1"
            />
            <span>
              Jeg accepterer handelsbetingelser og privatlivspolitik.
            </span>
          </label>

          <button className="w-full rounded-full bg-black px-5 py-3 font-medium text-white">
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