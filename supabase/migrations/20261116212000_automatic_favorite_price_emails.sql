begin;

create or replace function public.queue_favorite_price_email()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.marketplace_email_jobs
    (kind, user_id, listing_id, previous_price, new_price)
  select distinct 'favorite_price', f.user_id, new.id, old.price, new.price
  from public.favorites f
  left join public.favorite_email_preferences p on p.user_id = f.user_id
  where f.listing_id = new.id
    and f.user_id <> new.seller_id
    and coalesce(p.price_changes, true);

  return new;
end;
$$;

create or replace function public.marketplace_email_requested(
  p_job public.marketplace_email_jobs,
  p_listing public.listings
)
returns boolean
language sql stable set search_path = ''
as $$
  select case p_job.kind
    when 'favorite_price' then exists (
      select 1
      from public.favorites f
      left join public.favorite_email_preferences p on p.user_id = f.user_id
      where f.user_id = p_job.user_id
        and f.listing_id = p_listing.id
        and coalesce(p.price_changes, true)
    )
    when 'search_match' then exists (
      select 1
      from public.saved_listing_searches s
      where s.user_id = p_job.user_id
        and s.created_at <= p_job.created_at
        and public.listing_matches_saved_search(p_listing, s)
    )
    else false
  end;
$$;

commit;
