import Link from "next/link";

type ListingCardProps = {
  listing: {
    id: string;
    title: string;
    price: number;
    brand: string | null;
    size?: string | null;
    listing_images?: {
      image_url: string;
      sort_order: number;
    }[];
  };
};

export default function ListingCard({ listing }: ListingCardProps) {
  const firstImage = listing.listing_images
    ? [...listing.listing_images].sort((a, b) => a.sort_order - b.sort_order)[0]
    : null;

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group relative overflow-hidden rounded-[1.7rem] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.10)]"
    >
      {firstImage ? (
        <img
          src={firstImage.image_url}
          alt={listing.title}
          className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-52 items-center justify-center bg-stone-50">
          <img
            src="/images/equishopper-grey-logo.png"
            alt=""
            className="h-32 w-auto opacity-60"
          />
        </div>
      )}

      <div className="p-4">
        {listing.brand && (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
            {listing.brand}
          </p>
        )}

        <h3 className="line-clamp-1 text-[15px] font-medium text-[#062f25]">
          {listing.title}
        </h3>

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-[#062f25]">
            {listing.price} kr.
          </p>

          {listing.size && (
            <p className="text-xs text-stone-500">
              Str. {listing.size}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}