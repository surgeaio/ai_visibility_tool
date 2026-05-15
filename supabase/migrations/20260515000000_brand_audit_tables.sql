-- Brand Audit feature (Shifthub / Circle Healthcare analysis)
-- Separate from existing website_audits (brand-scoped crawl summaries)

create table if not exists brand_audit_scrapes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  brand_name text not null,
  url text not null,
  audit_data jsonb not null,
  seo_score integer,
  technical_score integer,
  content_score integer,
  overall_score integer,
  scraped_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_brand_audit_scrapes_brand on brand_audit_scrapes (brand_name, scraped_at desc);

create table if not exists brand_audit_llm_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  brand_name text not null,
  brand_url text not null,
  llm_provider text not null,
  llm_model text not null,
  query_text text not null,
  query_category text not null,
  brand_mentioned boolean default false,
  mention_position integer,
  sentiment text,
  exact_quote text,
  competitors_mentioned text[] default '{}',
  full_response text not null,
  visibility_score integer default 0,
  queried_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_brand_audit_llm_brand on brand_audit_llm_results (brand_name, queried_at desc);

create table if not exists brand_audit_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  brand_name text not null,
  brand_url text not null,
  website_audit_id uuid references brand_audit_scrapes (id) on delete set null,
  llm_visibility_score integer,
  seo_score integer,
  overall_health_score integer,
  report_data jsonb not null,
  competitors_found text[] default '{}',
  recommendations text[] default '{}',
  is_sample_data boolean default false,
  generated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_brand_audit_reports_brand on brand_audit_reports (brand_name, generated_at desc);

alter table brand_audit_scrapes enable row level security;
alter table brand_audit_llm_results enable row level security;
alter table brand_audit_reports enable row level security;

create policy brand_audit_scrapes_select on brand_audit_scrapes
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

create policy brand_audit_scrapes_insert on brand_audit_scrapes
  for insert to authenticated
  with check (user_id = auth.uid());

create policy brand_audit_llm_select on brand_audit_llm_results
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

create policy brand_audit_llm_insert on brand_audit_llm_results
  for insert to authenticated
  with check (user_id = auth.uid());

create policy brand_audit_reports_select on brand_audit_reports
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

create policy brand_audit_reports_insert on brand_audit_reports
  for insert to authenticated
  with check (user_id = auth.uid());
