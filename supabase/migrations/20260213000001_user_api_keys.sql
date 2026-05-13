-- User-owned API keys (encrypted at rest). Sprint CRM Phase 1.

create table if not exists user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (
    provider in (
      'openai',
      'anthropic',
      'gemini',
      'perplexity',
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
