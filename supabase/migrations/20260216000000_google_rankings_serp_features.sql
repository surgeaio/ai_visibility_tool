-- Serper.dev snapshot (AI Overview / SERP blocks) alongside ranking rows
alter table google_rankings add column if not exists serp_features jsonb;

comment on column google_rankings.serp_features is 'Serper response snapshot: detected SERP blocks, optional aiOverview, etc.';
