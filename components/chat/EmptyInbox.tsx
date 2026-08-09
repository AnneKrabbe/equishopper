import Link from "next/link";

export default function EmptyInbox() {
  return (
    <div className="rounded-[32px] border border-[#eadfcb] bg-white p-8 text-center shadow-sm sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf3ef] text-2xl">
        💬
      </div>

      <h2 className="mt-5 font-serif text-3xl text-[#063f32]">
        Ingen samtaler endnu
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600">
        Når du kontakter en sælger eller modtager en besked om en annonce,
        vises samtalen her.
      </p>

      <Link
        href="/annoncer"
        className="mt-7 inline-flex rounded-full bg-[#063f32] px-7 py-3 font-medium text-white transition hover:bg-[#052f26]"
      >
        Se annoncer
      </Link>
    </div>
  );
}