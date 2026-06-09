-- Run in Supabase SQL editor or via CLI migrations
-- Backwards-compatible, additive migration for Sprint A.5

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  org_id uuid references organizations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  website text,
  domain text,
  category text,
  created_at timestamptz default now()
);

create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  text text not null,
  category text,
  frequency text default 'manual',
  country text,
  tags text[],
  models text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  competitor_name text not null,
  domain text,
  website text,
  aliases text[] default '{}',
  is_tracked boolean default true,
  created_at timestamptz default now()
);

create table if not exists ai_responses (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references prompts(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  provider text not null,
  model text not null,
  response_text text not null,
  latency_ms integer,
  token_input integer,
  token_output integer,
  cost_usd numeric(10,5),
  request_id text,
  created_at timestamptz default now()
);

create table if not exists analysis_results (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references prompts(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  model text not null,
  response_text text,
  visibility boolean,
  position integer,
  sentiment text,
  sentiment_score integer,
  confidence integer,
  positive_signals text[],
  negative_signals text[],
  keywords text[],
  analyzed_at timestamptz default now()
);

create table if not exists brand_mentions (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references ai_responses(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  mention_text text not null,
  normalized_entity text,
  start_index integer,
  end_index integer,
  confidence numeric(5,2),
  created_at timestamptz default now()
);

create table if not exists sentiment_scores (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid references brand_mentions(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  sentiment text not null,
  score integer not null,
  confidence integer,
  trust_score integer,
  authority_score integer,
  recommendation_likelihood integer,
  emotional_tone text,
  positives text[],
  negatives text[],
  created_at timestamptz default now()
);

create table if not exists citations (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references ai_responses(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  provider text,
  url text not null,
  domain text not null,
  title text,
  snippet text,
  citation_position integer,
  created_at timestamptz default now()
);

create table if not exists patterns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  pattern_type text not null,
  severity text not null,
  impact_score integer,
  historical_trend text,
  evidence jsonb default '[]'::jsonb,
  affected_prompts text[] default '{}',
  competitors text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  pattern_id uuid references patterns(id) on delete set null,
  pattern_type text,
  action text,
  description text,
  priority text,
  category text,
  expected_geo_gain integer,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists prompt_schedules (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references prompts(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  frequency text not null default 'manual',
  cron_expression text,
  timezone text default 'UTC',
  is_paused boolean default false,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_run_status text,
  created_at timestamptz default now()
);

create table if not exists job_logs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade,
  queue_name text not null,
  job_id text not null,
  status text not null,
  attempt integer default 1,
  payload jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz default now()
);

create table if not exists usage_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  metric text not null,
  quantity integer not null default 1,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_org_members_org on organization_members(org_id);
create index if not exists idx_org_members_user on organization_members(user_id);
create index if not exists idx_brands_org on brands(org_id);
create index if not exists idx_brands_user on brands(user_id);
create index if not exists idx_prompts_brand on prompts(brand_id);
create index if not exists idx_prompts_active on prompts(is_active);
create index if not exists idx_competitors_brand on competitors(brand_id);
create index if not exists idx_responses_brand on ai_responses(brand_id);
create index if not exists idx_results_brand on analysis_results(brand_id);
create index if not exists idx_results_prompt on analysis_results(prompt_id);
create index if not exists idx_mentions_brand on brand_mentions(brand_id);
create index if not exists idx_sentiment_brand on sentiment_scores(brand_id);
create index if not exists idx_citations_brand on citations(brand_id);
create index if not exists idx_citations_domain on citations(domain);
create index if not exists idx_recommendations_brand on recommendations(brand_id);
create index if not exists idx_patterns_brand on patterns(brand_id);
create index if not exists idx_schedules_prompt on prompt_schedules(prompt_id);
create index if not exists idx_job_logs_brand on job_logs(brand_id);
create index if not exists idx_usage_logs_org on usage_logs(org_id);
create index if not exists idx_prompts_text_trgm on prompts using gin (text gin_trgm_ops);

-- RLS helper
create or replace function is_org_member(target_org uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from organization_members m
    where m.org_id = target_org
      and m.user_id = auth.uid()
  );
$$;

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table users enable row level security;
alter table brands enable row level security;
alter table prompts enable row level security;
alter table competitors enable row level security;
alter table ai_responses enable row level security;
alter table analysis_results enable row level security;
alter table brand_mentions enable row level security;
alter table sentiment_scores enable row level security;
alter table citations enable row level security;
alter table patterns enable row level security;
alter table recommendations enable row level security;
alter table prompt_schedules enable row level security;
alter table job_logs enable row level security;
alter table usage_logs enable row level security;

-- Organizations
drop policy if exists org_select on organizations;
create policy org_select on organizations for select using (is_org_member(id));

drop policy if exists org_insert on organizations;
create policy org_insert on organizations for insert with check (auth.uid() is not null);

drop policy if exists org_update on organizations;
create policy org_update on organizations for update using (is_org_member(id));

drop policy if exists org_delete on organizations;
create policy org_delete on organizations for delete using (is_org_member(id));

-- Organization members
drop policy if exists org_members_select on organization_members;
create policy org_members_select on organization_members
for select using (is_org_member(org_id));

drop policy if exists org_members_insert on organization_members;
create policy org_members_insert on organization_members
for insert with check (is_org_member(org_id));

drop policy if exists org_members_update on organization_members;
create policy org_members_update on organization_members
for update using (is_org_member(org_id));

drop policy if exists org_members_delete on organization_members;
create policy org_members_delete on organization_members
for delete using (is_org_member(org_id));

-- Users profile
drop policy if exists users_select on users;
create policy users_select on users for select using (id = auth.uid());

drop policy if exists users_insert on users;
create policy users_insert on users for insert with check (id = auth.uid());

drop policy if exists users_update on users;
create policy users_update on users for update using (id = auth.uid());

-- Brands and linked entities
drop policy if exists brands_select on brands;
create policy brands_select on brands for select using (
  user_id = auth.uid() or (org_id is not null and is_org_member(org_id))
);

drop policy if exists brands_insert on brands;
create policy brands_insert on brands for insert with check (
  user_id = auth.uid() or (org_id is not null and is_org_member(org_id))
);

drop policy if exists brands_update on brands;
create policy brands_update on brands for update using (
  user_id = auth.uid() or (org_id is not null and is_org_member(org_id))
);

drop policy if exists brands_delete on brands;
create policy brands_delete on brands for delete using (
  user_id = auth.uid() or (org_id is not null and is_org_member(org_id))
);

-- Reusable policies for brand-owned tables
create or replace function has_brand_access(target_brand uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from brands b
    where b.id = target_brand
      and (b.user_id = auth.uid() or (b.org_id is not null and is_org_member(b.org_id)))
  );
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'prompts','competitors','ai_responses','analysis_results',
    'brand_mentions','sentiment_scores','citations','patterns',
    'recommendations','prompt_schedules','job_logs','usage_logs'
  ]
  loop
    execute format('drop policy if exists %I_select on %I', t, t);
    execute format('create policy %I_select on %I for select using (has_brand_access(brand_id))', t, t);
    execute format('drop policy if exists %I_insert on %I', t, t);
    execute format('create policy %I_insert on %I for insert with check (has_brand_access(brand_id))', t, t);
    execute format('drop policy if exists %I_update on %I', t, t);
    execute format('create policy %I_update on %I for update using (has_brand_access(brand_id))', t, t);
    execute format('drop policy if exists %I_delete on %I', t, t);
    execute format('create policy %I_delete on %I for delete using (has_brand_access(brand_id))', t, t);
  end loop;
end $$;


-- === CRM migrations (merged into schema.sql for reference) ===

-- User-owned API keys (encrypted at rest). Sprint CRM Phase 1.

create table if not exists user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (
    provider in (
      'openai',
      'anthropic',
      'gemini',
      'google_search_console',
      'google_analytics'
    )
  ),
  key_name text not null,
  encrypted_key text not null,
  key_preview text not null,
  is_active boolean default true,
  last_used_at timestamptz,
  test_status text default 'untested' check (test_status in ('untested', 'working', 'failed')),
  test_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_api_keys_user on user_api_keys (user_id);
create index if not exists idx_user_api_keys_provider on user_api_keys (provider);

alter table user_api_keys enable row level security;

create policy user_api_keys_select on user_api_keys for select using (auth.uid() = user_id);
create policy user_api_keys_insert on user_api_keys for insert with check (auth.uid() = user_id);
create policy user_api_keys_update on user_api_keys for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_api_keys_delete on user_api_keys for delete using (auth.uid() = user_id);


-- LLM + Google + competitor rankings + website audit (CRM Phases 2–5)

create table if not exists llm_platforms (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  display_name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into llm_platforms (name, display_name)
values
  ('chatgpt', 'ChatGPT'),
  ('claude', 'Claude'),
  ('gemini', 'Gemini')
on conflict (name) do nothing;

create table if not exists llm_brand_performance (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  platform_id uuid references llm_platforms (id) on delete set null,
  prompt_id uuid references prompts (id) on delete cascade,
  is_mentioned boolean default false,
  mention_count integer default 0,
  rank_position integer,
  sentiment text,
  sentiment_score numeric(5, 2),
  visibility_score numeric(5, 2),
  raw_response text,
  context text,
  measured_at timestamptz default now()
);

create index if not exists idx_llm_perf_brand on llm_brand_performance (brand_id);
create index if not exists idx_llm_perf_platform on llm_brand_performance (platform_id);
create index if not exists idx_llm_perf_date on llm_brand_performance (measured_at desc);

create table if not exists google_rankings (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  keyword text not null,
  url text not null,
  position numeric(5, 2),
  impressions integer,
  clicks integer,
  ctr numeric(5, 4),
  country text,
  device text,
  measured_date date not null,
  created_at timestamptz default now(),
  unique (brand_id, keyword, url, country, device, measured_date)
);

create index if not exists idx_google_rankings_brand on google_rankings (brand_id);
create index if not exists idx_google_rankings_keyword on google_rankings (keyword);
create index if not exists idx_google_rankings_date on google_rankings (measured_date desc);

create table if not exists indexed_pages (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  url text not null,
  is_indexed boolean default false,
  coverage_state text,
  last_crawled timestamptz,
  indexing_issue text,
  checked_at timestamptz default now()
);

create index if not exists idx_indexed_pages_brand on indexed_pages (brand_id);

alter table competitors add column if not exists authority_score numeric(5, 2);
alter table competitors add column if not exists content_count integer;
alter table competitors add column if not exists avg_word_count integer;
alter table competitors add column if not exists has_faq_schema boolean;
alter table competitors add column if not exists estimated_backlinks integer;
alter table competitors add column if not exists last_analyzed_at timestamptz;

create table if not exists competitor_rankings (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors (id) on delete cascade,
  brand_id uuid not null references brands (id) on delete cascade,
  keyword text not null,
  position integer,
  url text,
  measured_date date,
  created_at timestamptz default now()
);

create index if not exists idx_comp_rankings_brand on competitor_rankings (brand_id);
create index if not exists idx_comp_rankings_keyword on competitor_rankings (keyword);

create table if not exists website_audits (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  total_pages integer,
  pages_with_issues integer,
  critical_issues integer,
  warnings integer,
  overall_score numeric(5, 2),
  audit_completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists page_audits (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references website_audits (id) on delete cascade,
  brand_id uuid not null references brands (id) on delete cascade,
  url text not null,
  is_indexed boolean,
  indexing_issue text,
  title text,
  title_length integer,
  meta_description text,
  meta_description_length integer,
  h1_count integer,
  word_count integer,
  internal_links_count integer,
  external_links_count integer,
  images_count integer,
  images_without_alt integer,
  has_schema boolean,
  schema_types text[],
  has_faq_schema boolean,
  page_speed_mobile integer,
  page_speed_desktop integer,
  issues jsonb default '[]'::jsonb,
  audited_at timestamptz default now()
);

create index if not exists idx_page_audits_brand on page_audits (brand_id);
create index if not exists idx_page_audits_indexed on page_audits (is_indexed);

-- RLS: mirror brand-scoped access pattern
alter table llm_brand_performance enable row level security;
alter table google_rankings enable row level security;
alter table indexed_pages enable row level security;
alter table competitor_rankings enable row level security;
alter table website_audits enable row level security;
alter table page_audits enable row level security;
alter table llm_platforms enable row level security;

create policy llm_platforms_read on llm_platforms for select to authenticated using (true);

create policy llm_perf_select on llm_brand_performance for select using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);
create policy llm_perf_write on llm_brand_performance for all using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
) with check (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);

create policy google_rank_select on google_rankings for select using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);
create policy google_rank_write on google_rankings for all using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
) with check (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);

create policy indexed_pages_select on indexed_pages for select using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);
create policy indexed_pages_write on indexed_pages for all using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
) with check (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);

create policy comp_rank_select on competitor_rankings for select using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);
create policy comp_rank_write on competitor_rankings for all using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
) with check (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);

create policy website_audits_select on website_audits for select using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);
create policy website_audits_write on website_audits for all using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
) with check (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);

create policy page_audits_select on page_audits for select using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);
create policy page_audits_write on page_audits for all using (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
) with check (
  exists (select 1 from brands b where b.id = brand_id and (b.user_id = auth.uid() or (b.org_id is not null and exists (select 1 from organization_members m where m.org_id = b.org_id and m.user_id = auth.uid()))))
);


-- Phase 2 real data: extra columns, GSC OAuth storage, crawl jobs

alter table google_rankings add column if not exists click_through_rate numeric(5, 4);

update google_rankings
set click_through_rate = ctr
where click_through_rate is null and ctr is not null;

alter table google_rankings add column if not exists serp_features jsonb;

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
