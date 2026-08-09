"use client";

import { MessageSquareText, Star } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type SellerReviewsProps = {
  reviews: Review[];
};

function getInitials(name?: string | null) {
  if (!name) return "?";

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function SellerReviews({
  reviews,
}: SellerReviewsProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f1e8]">
          <MessageSquareText
            size={25}
            className="text-[#063f32]"
          />
        </div>

        <h3 className="text-lg font-semibold text-[#063f32]">
          Ingen anmeldelser endnu
        </h3>

        <p className="mt-2 text-stone-500">
          Denne sælger har endnu ikke modtaget nogen anmeldelser.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-200">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="py-6 first:pt-0 last:pb-0"
        >
          <div className="flex items-start gap-4">
            {review.reviewer?.avatar_url ? (
              <img
                src={review.reviewer.avatar_url}
                alt={review.reviewer.full_name ?? "Profilbillede"}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#063f32] font-semibold text-white">
                {getInitials(review.reviewer?.full_name)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-stone-900">
                    {review.reviewer?.full_name ?? "Bruger"}
                  </p>

                  <div
                    className="mt-1 flex items-center gap-1"
                    aria-label={`${review.rating} ud af 5 stjerner`}
                  >
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={16}
                        className={
                          index < review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-stone-100 text-stone-300"
                        }
                      />
                    ))}
                  </div>
                </div>

                <time
                  dateTime={review.created_at}
                  className="shrink-0 text-sm text-stone-400"
                >
                  {formatDate(review.created_at)}
                </time>
              </div>

              {review.comment ? (
                <p className="mt-4 whitespace-pre-line leading-7 text-stone-700">
                  {review.comment}
                </p>
              ) : (
                <p className="mt-4 text-sm italic text-stone-400">
                  Anmeldelsen indeholder ingen kommentar.
                </p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}