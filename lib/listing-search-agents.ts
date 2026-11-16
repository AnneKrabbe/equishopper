export type ListingSearchCriteria = {
  search_query: string;
  category: string;
  category_group: string;
  subcategory: string;
  group_subcategories: string[];
  size: string;
  brand: string;
  condition: string;
  min_price: number | null;
  max_price: number | null;
};

export type SavedListingSearch = ListingSearchCriteria & { id: string };

export function hasListingSearchFilters(criteria: ListingSearchCriteria) {
  return Boolean(
    criteria.search_query || criteria.category || criteria.subcategory ||
    criteria.group_subcategories.length || criteria.size || criteria.brand || criteria.condition ||
    criteria.min_price !== null || criteria.max_price !== null
  );
}

export function listingSearchUrl(criteria: ListingSearchCriteria) {
  const params = new URLSearchParams();
  const entries = {
    q: criteria.search_query,
    category: criteria.category,
    group: criteria.category_group,
    subcategory: criteria.subcategory,
    size: criteria.size,
    brand: criteria.brand,
    condition: criteria.condition,
    minPrice: criteria.min_price,
    maxPrice: criteria.max_price,
  };

  for (const [key, value] of Object.entries(entries)) {
    if (value !== null && value !== "") params.set(key, String(value));
  }

  return params.size ? `/annoncer?${params.toString()}` : "/annoncer";
}
