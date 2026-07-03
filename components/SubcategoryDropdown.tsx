"use client";

type Props = {
  options: string[];
};

export default function SubcategoryDropdown({ options }: Props) {
  return (
    <button className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-[#fbfaf7] px-4 py-3 text-left text-sm">
      <span>{options.length > 0 ? "Alle underkategorier" : "Ingen underkategorier"}</span>
      <span className="text-[#d4af37]">⌄</span>
    </button>
  );
}