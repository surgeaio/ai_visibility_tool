-- Competitor intelligence: SERP snapshots, auto-detected domains, AI analysis cache

create table if not exists brand_competitors (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  competitor_domain text not null,
  competitor_name text,
  is_auto_detected boolean default true,
  is_active boolean default true,
  detection_score numeric default 0,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (brand_id, competitor_domain)
);

create index if not exists idx_brand_competitors_brand on brand_competitors (brand_id, is_active);

create table if not exists serp_snapshots (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  query text not null,
  snapshot_date date not null,
  raw_results jsonb not null default '[]'::jsonb,
  total_results integer,
  created_at timestamptz default now(),
  unique (brand_id, query, snapshot_date)
);

create index if not exists idx_serp_snapshots_brand_date on serp_snapshots (brand_id, snapshot_date desc);
create index if not exists idx_serp_snapshots_query on serp_snapshots (brand_id, query);

create table if not exists competitor_rankings (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  competitor_id uuid references brand_competitors (id) on delete set null,
  competitor_domain text not null,
  query text not null,
  position integer not null,
  page_url text not null,
  page_title text,
  page_snippet text,
  snapshot_date date not null,
  your_position numeric,
  position_gap integer,
  created_at timestamptz default now(),
  unique (brand_id, query, competitor_domain, snapshot_date)
);

create index if not exists idx_competitor_rankings_brand on competitor_rankings (brand_id, snapshot_date desc);
create index if not exists idx_competitor_rankings_gap on competitor_rankings (brand_id, position_gap desc);

create table if not exists competitor_analysis (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  competitor_domain text not null,
  query text,
  analysis_type text not null,
  winning_factors jsonb default '[]'::jsonb,
  action_items jsonb default '[]'::jsonb,
  raw_analysis text,
  model_used text,
  created_at timestamptz default now()
);

create index if not exists idx_competitor_analysis_brand on competitor_analysis (brand_id, created_at desc);

alter table brand_competitors enable row level security;
alter table serp_snapshots enable row level security;
alter table competitor_rankings enable row level security;
alter table competitor_analysis enable row level security;

drop policy if exists brand_competitors_all on brand_competitors;
create policy brand_competitors_all on brand_competitors for all using (
  exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
)
with check (
  exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
);

drop policy if exists serp_snapshots_select on serp_snapshots;
create policy serp_snapshots_select on serp_snapshots for select using (
  exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
);

drop policy if exists competitor_rankings_select on competitor_rankings;
create policy competitor_rankings_select on competitor_rankings for select using (
  exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
);

drop policy if exists competitor_analysis_select on competitor_analysis;
create policy competitor_analysis_select on competitor_analysis for select using (
  exists (select 1 from brands b where b.id = brand_id and b.user_id = auth.uid())
);
