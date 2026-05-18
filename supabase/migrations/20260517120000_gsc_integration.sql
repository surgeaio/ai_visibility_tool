-- GSC integration: daily metrics, query rankings, improvement suggestions

alter table gsc_connections add column if not exists google_email text;
alter table gsc_connections add column if not exists updated_at timestamptz default now();

create unique index if not exists idx_gsc_connections_user_site on gsc_connections (user_id, site_url);

create table if not exists gsc_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  site_url text not null,
  metric_date date not null,
  clicks integer default 0,
  impressions integer default 0,
  ctr numeric(6, 4) default 0,
  avg_position numeric(6, 2) default 0,
  indexed_pages integer default 0,
  not_indexed_pages integer default 0,
  created_at timestamptz default now(),
  unique (brand_id, site_url, metric_date)
);

create index if not exists idx_gsc_daily_brand_date on gsc_daily_metrics (brand_id, metric_date desc);

create table if not exists gsc_query_rankings (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  site_url text not null,
  metric_date date not null,
  query text not null,
  page_url text not null,
  country text,
  device text,
  clicks integer default 0,
  impressions integer default 0,
  ctr numeric(6, 4) default 0,
  position numeric(6, 2) default 0,
  created_at timestamptz default now(),
  unique (brand_id, site_url, metric_date, query, page_url)
);

create index if not exists idx_gsc_query_brand_date on gsc_query_rankings (brand_id, metric_date desc);
create index if not exists idx_gsc_query_position on gsc_query_rankings (brand_id, position);
create index if not exists idx_gsc_query_search on gsc_query_rankings (brand_id, query);

create table if not exists gsc_improvement_suggestions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  query text,
  page_url text,
  suggestion_type text not null,
  priority text not null default 'medium',
  title text not null,
  description text not null,
  action_items jsonb default '[]'::jsonb,
  metric_snapshot jsonb,
  status text default 'open',
  created_at timestamptz default now()
);

create index if not exists idx_gsc_suggestions_brand on gsc_improvement_suggestions (brand_id, status, priority);

alter table gsc_daily_metrics enable row level security;
alter table gsc_query_rankings enable row level security;
alter table gsc_improvement_suggestions enable row level security;

drop policy if exists gsc_daily_metrics_select on gsc_daily_metrics;
create policy gsc_daily_metrics_select on gsc_daily_metrics for select using (
  exists (
    select 1
    from brands b
    where b.id = brand_id and b.user_id = auth.uid()
  )
);

drop policy if exists gsc_query_rankings_select on gsc_query_rankings;
create policy gsc_query_rankings_select on gsc_query_rankings for select using (
  exists (
    select 1
    from brands b
    where b.id = brand_id and b.user_id = auth.uid()
  )
);

drop policy if exists gsc_improvement_suggestions_all on gsc_improvement_suggestions;
create policy gsc_improvement_suggestions_all on gsc_improvement_suggestions for all using (
  exists (
    select 1
    from brands b
    where b.id = brand_id and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from brands b
    where b.id = brand_id and b.user_id = auth.uid()
  )
);
