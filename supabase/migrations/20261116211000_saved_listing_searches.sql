begin;

create table public.saved_listing_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  search_query text not null default '',
  category text not null default '',
  category_group text not null default '',
  subcategory text not null default '',
  group_subcategories text[] not null default '{}',
  size text not null default '',
  brand text not null default '',
  condition text not null default '',
  min_price numeric check (min_price >= 0 and min_price < 1000000000),
  max_price numeric check (max_price >= 0 and max_price < 1000000000),
  created_at timestamptz not null default now(),
  check (min_price <= max_price),
  check (cardinality(group_subcategories) <= 100),
  check (
    octet_length(search_query || category || category_group || subcategory || size || brand || condition) <= 1400
    and octet_length(group_subcategories::text) <= 4000
  ),
  check (
    search_query <> '' or category <> '' or subcategory <> '' or size <> '' or brand <> ''
    or condition <> '' or min_price is not null or max_price is not null
    or cardinality(group_subcategories) > 0
  ),
  unique nulls not distinct (
    user_id, search_query, category, category_group, subcategory, size, brand, condition, min_price, max_price
  )
);

alter table public.saved_listing_searches enable row level security;
revoke all on public.saved_listing_searches from public, anon, authenticated;
grant select, insert, delete on public.saved_listing_searches to authenticated;
create policy own_saved_listing_searches on public.saved_listing_searches
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index saved_listing_searches_category on public.saved_listing_searches (category);
create unique index marketplace_search_match_once
  on public.marketplace_email_jobs (user_id, listing_id) where kind = 'search_match';

create function public.listing_matches_saved_search(p_listing public.listings, p_search public.saved_listing_searches)
returns boolean
language sql immutable set search_path = ''
as $$
  select
    (p_search.category = '' or p_listing.main_category = p_search.category)
    and (p_search.subcategory = '' or p_listing.subcategory = p_search.subcategory)
    and (
      cardinality(p_search.group_subcategories) = 0
      or p_listing.subcategory = any(p_search.group_subcategories)
    )
    and (p_search.brand = '' or p_listing.brand = p_search.brand)
    and (p_search.size = '' or p_listing.size = p_search.size)
    and (p_search.condition = '' or p_listing.condition = p_search.condition)
    and (p_search.min_price is null or p_listing.price >= p_search.min_price)
    and (p_search.max_price is null or p_listing.price <= p_search.max_price)
    and (
      p_search.search_query = ''
      or strpos(lower(coalesce(p_listing.title, '')), lower(p_search.search_query)) > 0
      or strpos(lower(coalesce(p_listing.brand, '')), lower(p_search.search_query)) > 0
      or strpos(lower(coalesce(p_listing.main_category, '')), lower(p_search.search_query)) > 0
      or strpos(lower(coalesce(p_listing.subcategory, '')), lower(p_search.search_query)) > 0
      or strpos(lower(coalesce(p_listing.description, '')), lower(p_search.search_query)) > 0
    );
$$;

revoke all on function public.listing_matches_saved_search(public.listings, public.saved_listing_searches)
  from public, anon, authenticated;

create function public.queue_saved_listing_search_emails()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.marketplace_email_jobs (kind, user_id, listing_id, new_price)
  select distinct 'search_match', s.user_id, new.id, new.price
  from public.saved_listing_searches s
  where s.user_id <> new.seller_id
    and s.category in ('', new.main_category)
    and public.listing_matches_saved_search(new, s)
  on conflict (user_id, listing_id) where kind = 'search_match' do nothing;
  return new;
end;
$$;

revoke all on function public.queue_saved_listing_search_emails() from public, anon, authenticated;

create trigger queue_saved_listing_search_emails
after insert on public.listings
for each row when (new.status = 'active' and new.deleted_at is null)
execute function public.queue_saved_listing_search_emails();

create or replace function public.marketplace_email_requested(p_job public.marketplace_email_jobs, p_listing public.listings)
returns boolean
language sql stable set search_path = ''
as $$
  select case p_job.kind
    when 'favorite_price' then exists (
      select from public.favorites f
      join public.favorite_email_preferences p on p.user_id = f.user_id
      where f.user_id = p_job.user_id and f.listing_id = p_listing.id and p.price_changes
    )
    when 'search_match' then exists (
      select from public.saved_listing_searches s
      where s.user_id = p_job.user_id and s.created_at <= p_job.created_at
        and public.listing_matches_saved_search(p_listing, s)
    )
    else false
  end;
$$;

commit;
