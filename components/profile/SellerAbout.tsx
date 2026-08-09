"use client";

import { FileText } from "lucide-react";

type SellerAboutProps = {
  bio: string | null;
};

export default function SellerAbout({
  bio,
}: SellerAboutProps) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f1e8]">
          <FileText size={18} className="text-[#063f32]" />
        </div>

        <h2 className="text-2xl font-bold text-[#063f32]">
          Om sælger
        </h2>
      </div>

      {bio ? (
        <p className="whitespace-pre-line leading-8 text-stone-700">
          {bio}
        </p>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm leading-7 text-stone-500">
          Denne sælger har endnu ikke skrevet en beskrivelse.
        </div>
      )}
    </div>
  );
}