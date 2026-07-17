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
    ? [...listing.listing_images].sort(
        (a, b) => a.sort_order - b.sort_order
      )[0]
    : null;

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group overflow-hidden rounded-[26px] bg-[#fbfaf7] shadow-[0_12px_34px_rgba(0,0,0,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.10)]"
    >
      <div className="aspect-[4/5] overflow-hidden bg-[#f2ede4]">
        {firstImage ? (
          <img
            src={firstImage.image_url}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <img
              src="/images/equishopper-grey-logo.png"
              alt=""
              className="h-24 opacity-35"
            />
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-4">
        {listing.brand && (
          <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-[#b79a3d]">
            {listing.brand}
          </p>
        )}

        <h3 className="line-clamp-2 min-h-[44px] text-[15px] font-medium leading-5 text-[#063f32]">
          {listing.title}
        </h3>

        {listing.size && (
          <p className="mt-1 text-xs text-stone-500">
            Str. {listing.size}
          </p>
        )}

        <p className="mt-4 text-[16px] font-semibold text-black">
          {listing.price.toLocaleString("da-DK")} kr.
        </p>
      </div>
    </Link>
  );
}