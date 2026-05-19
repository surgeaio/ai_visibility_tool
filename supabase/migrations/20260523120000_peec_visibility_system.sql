-- Peec.ai-style visibility analytics (new tables only)

create table if not exists chat_responses (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid not null references brands(id) on delete cascade,
  prompt_id uuid not null references prompts(id) on delete cascade,
  ai_model text not null check (ai_model in ('chatgpt', 'claude', 'gemini', 'perplexity')),
  prompt_text text not null,
  response_text text not null default '',
  raw_sources jsonb default '[]'::jsonb,
  error_message text,
  status text default 'success' check (status in ('success', 'failed', 'pending')),
  tokens_used integer,
  run_date date not null default current_date,
  created_at timestamptz default now()
);

create index if not exists idx_chat_responses_brand_date on chat_responses(brand_id, run_date desc);
create index if not exists idx_chat_responses_prompt_model on chat_responses(prompt_id, ai_model, run_date desc);

create table if not exists chat_analysis (
  id uuid default gen_random_uuid() primary key,
  chat_response_id uuid not null references chat_responses(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  prompt_id uuid not null references prompts(id) on delete cascade,
  ai_model text not null,
  run_date date not null,
  brand_mentioned boolean default false,
  brand_position integer,
  brand_sentiment integer check (brand_sentiment between 0 and 100),
  brand_sentiment_label text check (brand_sentiment_label in ('positive', 'neutral', 'negative')),
  brand_mention_context text,
  all_brands_mentioned jsonb default '[]'::jsonb,
  sources_used jsonb default '[]'::jsonb,
  analyzed_by text default 'claude',
  analyzer_version text default 'v1',
  created_at timestamptz default now()
);

create index if not exists idx_chat_analysis_brand_date on chat_analysis(brand_id, run_date desc);
create index if not exists idx_chat_analysis_prompt on chat_analysis(prompt_id, run_date desc);
create index if not exists idx_chat_analysis_model on chat_analysis(brand_id, ai_model, run_date desc);

create table if not exists brand_daily_metrics (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid not null references brands(id) on delete cascade,
  ai_model text not null,
  metric_date date not null,
  total_chats integer default 0,
  brand_mentions integer default 0,
  visibility_pct numeric(5,2) default 0,
  avg_position numeric(5,2),
  avg_sentiment numeric(5,2),
  positive_mentions integer default 0,
  neutral_mentions integer default 0,
  negative_mentions integer default 0,
  share_of_voice numeric(5,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(brand_id, ai_model, metric_date)
);

create index if not exists idx_daily_metrics_brand_date on brand_daily_metrics(brand_id, metric_date desc);

create table if not exists source_appearances (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid not null references brands(id) on delete cascade,
  chat_response_id uuid references chat_responses(id) on delete cascade,
  prompt_id uuid references prompts(id) on delete set null,
  ai_model text not null,
  domain text not null,
  url text,
  was_cited boolean default false,
  was_used boolean default true,
  run_date date not null default current_date,
  created_at timestamptz default now()
);

create index if not exists idx_sources_brand_domain on source_appearances(brand_id, domain, run_date desc);
create index if not exists idx_sources_brand_date on source_appearances(brand_id, run_date desc);

create table if not exists ai_recommendations (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid not null references brands(id) on delete cascade,
  recommendation_type text not null check (
    recommendation_type in (
      'source_opportunity',
      'content_gap',
      'sentiment_improvement',
      'competitor_outrank',
      'prompt_suggestion'
    )
  ),
  title text not null,
  description text not null,
  action_items jsonb default '[]'::jsonb,
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  impact_score integer check (impact_score between 0 and 100),
  status text default 'open' check (status in ('open', 'in_progress', 'completed', 'dismissed')),
  related_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_recommendations_brand_status on ai_recommendations(brand_id, status, priority desc);

create table if not exists prompt_run_jobs (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid not null references brands(id) on delete cascade,
  job_type text not null check (job_type in ('manual', 'scheduled', 'on_demand')),
  status text default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'partial')),
  total_prompts integer default 0,
  completed_prompts integer default 0,
  failed_prompts integer default 0,
  triggered_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  error_details jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_run_jobs_brand_status on prompt_run_jobs(brand_id, status, created_at desc);

alter table chat_responses enable row level security;
alter table chat_analysis enable row level security;
alter table brand_daily_metrics enable row level security;
alter table source_appearances enable row level security;
alter table ai_recommendations enable row level security;
alter table prompt_run_jobs enable row level security;

drop policy if exists users_see_own_brand_chat_responses on chat_responses;
create policy users_see_own_brand_chat_responses on chat_responses
  for all using (brand_id in (select id from brands where user_id = auth.uid()));

drop policy if exists users_see_own_brand_chat_analysis on chat_analysis;
create policy users_see_own_brand_chat_analysis on chat_analysis
  for all using (brand_id in (select id from brands where user_id = auth.uid()));

drop policy if exists users_see_own_brand_daily_metrics on brand_daily_metrics;
create policy users_see_own_brand_daily_metrics on brand_daily_metrics
  for all using (brand_id in (select id from brands where user_id = auth.uid()));

drop policy if exists users_see_own_brand_sources on source_appearances;
create policy users_see_own_brand_sources on source_appearances
  for all using (brand_id in (select id from brands where user_id = auth.uid()));

drop policy if exists users_see_own_brand_ai_recommendations on ai_recommendations;
create policy users_see_own_brand_ai_recommendations on ai_recommendations
  for all using (brand_id in (select id from brands where user_id = auth.uid()));

drop policy if exists users_see_own_brand_run_jobs on prompt_run_jobs;
create policy users_see_own_brand_run_jobs on prompt_run_jobs
  for all using (brand_id in (select id from brands where user_id = auth.uid()));
