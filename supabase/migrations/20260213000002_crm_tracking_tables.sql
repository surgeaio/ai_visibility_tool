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
  ('gemini', 'Gemini'),
  ('perplexity', 'Perplexity')
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
