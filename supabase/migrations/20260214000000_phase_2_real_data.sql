-- Phase 2 real data: extra columns, GSC OAuth storage, crawl jobs

alter table google_rankings add column if not exists click_through_rate numeric(5, 4);

update google_rankings
set click_through_rate = ctr
where click_through_rate is null and ctr is not null;

alter table indexed_pages add column if not exists last_crawled_by_google timestamptz;

alter table website_audits add column if not exists crawl_progress integer default 0;

alter table page_audits add column if not exists canonical_url text;
alter table page_audits add column if not exists robots_meta text;

create table if not exists gsc_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references brands (id) on delete cascade,
  site_url text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz,
  is_active boolean default true,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_gsc_connections_user on gsc_connections (user_id);
create index if not exists idx_gsc_connections_brand on gsc_connections (brand_id);

alter table gsc_connections enable row level security;

drop policy if exists gsc_connections_select on gsc_connections;
create policy gsc_connections_select on gsc_connections for select using (user_id = auth.uid());

drop policy if exists gsc_connections_insert on gsc_connections;
create policy gsc_connections_insert on gsc_connections for insert with check (user_id = auth.uid());

drop policy if exists gsc_connections_update on gsc_connections;
create policy gsc_connections_update on gsc_connections for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists gsc_connections_delete on gsc_connections;
create policy gsc_connections_delete on gsc_connections for delete using (user_id = auth.uid());

create table if not exists crawl_jobs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  status text not null default 'pending',
  total_pages_target integer,
  pages_crawled integer default 0,
  pages_failed integer default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_log text,
  created_at timestamptz default now()
);

create index if not exists idx_crawl_jobs_brand on crawl_jobs (brand_id);

alter table crawl_jobs enable row level security;

drop policy if exists crawl_jobs_select on crawl_jobs;
create policy crawl_jobs_select on crawl_jobs for select using (
  exists (
    select 1
    from brands b
    where
      b.id = brand_id
      and (
        b.user_id = auth.uid()
        or (
          b.org_id is not null
          and exists (
            select 1
            from organization_members m
            where
              m.org_id = b.org_id
              and m.user_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists crawl_jobs_write on crawl_jobs;
create policy crawl_jobs_write on crawl_jobs for all using (
  exists (
    select 1
    from brands b
    where
      b.id = brand_id
      and (
        b.user_id = auth.uid()
        or (
          b.org_id is not null
          and exists (
            select 1
            from organization_members m
            where
              m.org_id = b.org_id
              and m.user_id = auth.uid()
          )
        )
      )
  )
)
with check (
  exists (
    select 1
    from brands b
    where
      b.id = brand_id
      and (
        b.user_id = auth.uid()
        or (
          b.org_id is not null
          and exists (
            select 1
            from organization_members m
            where
              m.org_id = b.org_id
              and m.user_id = auth.uid()
          )
        )
      )
  )
);
