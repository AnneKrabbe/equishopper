begin;

create table public.favorite_email_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  price_changes boolean not null default false
);

alter table public.favorite_email_preferences enable row level security;

revoke all on public.favorite_email_preferences from anon, authenticated;
grant select, insert, update on public.favorite_email_preferences to authenticated;
create policy own_favorite_email_preferences on public.favorite_email_preferences
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.marketplace_email_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('favorite_price', 'search_match')),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  previous_price numeric,
  new_price numeric,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  attempts integer not null default 0,
  claim_token uuid,
  completed_at timestamptz,
  outcome text check (outcome in ('sent', 'skipped', 'failed'))
);

alter table public.marketplace_email_jobs enable row level security;
revoke all on public.marketplace_email_jobs from public, anon, authenticated;
grant select, update, delete on public.marketplace_email_jobs to service_role;

create index marketplace_email_listing on public.marketplace_email_jobs (listing_id);
create index marketplace_email_user on public.marketplace_email_jobs (user_id);
create index marketplace_email_pending on public.marketplace_email_jobs (available_at, id)
  where completed_at is null;

create function public.queue_favorite_price_email()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.marketplace_email_jobs (kind, user_id, listing_id, previous_price, new_price)
  select distinct 'favorite_price', f.user_id, new.id, old.price, new.price
  from public.favorites f
  join public.favorite_email_preferences p on p.user_id = f.user_id
  where f.listing_id = new.id and f.user_id <> new.seller_id and p.price_changes;

  return new;
end;
$$;

revoke all on function public.queue_favorite_price_email() from public, anon, authenticated;

create trigger queue_favorite_price_email
after update of price on public.listings
for each row when (
  old.price is not null and new.price is not null and old.price is distinct from new.price
  and old.status = 'active' and new.status = 'active' and new.deleted_at is null
)
execute function public.queue_favorite_price_email();

create function public.marketplace_email_requested(p_job public.marketplace_email_jobs, p_listing public.listings)
returns boolean
language sql stable set search_path = ''
as $$
  select case when p_job.kind = 'favorite_price' then exists (
    select from public.favorites f
    join public.favorite_email_preferences p on p.user_id = f.user_id
    where f.user_id = p_job.user_id and f.listing_id = p_listing.id and p.price_changes
  ) else false end;
$$;

revoke all on function public.marketplace_email_requested(public.marketplace_email_jobs, public.listings)
  from public, anon, authenticated;

create function public.claim_marketplace_email_jobs(p_limit integer)
returns table (
  id uuid, claim_token uuid, kind text, listing_id uuid, title text, email text,
  previous_price numeric, new_price numeric, attempts integer, expired boolean
)
language sql security definer set search_path = ''
as $$
  with picked as (
    select j.id from public.marketplace_email_jobs j
    where j.completed_at is null and j.available_at <= now()
    order by j.available_at, j.id
    limit greatest(0, least(coalesce(p_limit, 0), 25))
    for update skip locked
  ), claimed as (
    update public.marketplace_email_jobs j
    set claim_token = pg_catalog.gen_random_uuid(),
        available_at = now() + interval '10 minutes',
        attempts = j.attempts + 1
    from picked p
    where j.id = p.id
    returning j.*
  )
  select j.id, j.claim_token, j.kind, j.listing_id, l.title,
    case when j.attempts <= 5 and j.created_at > now() - interval '23 hours'
      and l.status = 'active' and l.deleted_at is null
      and l.seller_id <> j.user_id and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until < now())
      and public.marketplace_email_requested(j, l)
    then u.email end,
    j.previous_price, case when j.kind = 'search_match' then l.price else j.new_price end,
    j.attempts, j.created_at <= now() - interval '23 hours'
  from claimed j
  join public.listings l on l.id = j.listing_id
  join auth.users u on u.id = j.user_id;
$$;

revoke all on function public.claim_marketplace_email_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_marketplace_email_jobs(integer) to service_role;

commit;
