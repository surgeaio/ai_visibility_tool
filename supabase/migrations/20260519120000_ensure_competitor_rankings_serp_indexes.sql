-- Safety net: ensure snapshot_date exists and SERP indexes are created
-- (handles partial/failed applies or DBs where rename did not run)

alter table competitor_rankings add column if not exists snapshot_date date;
alter table competitor_rankings add column if not exists competitor_domain text;
alter table competitor_rankings add column if not exists query text;
alter table competitor_rankings add column if not exists page_url text;
alter table competitor_rankings add column if not exists page_title text;
alter table competitor_rankings add column if not exists page_snippet text;
alter table competitor_rankings add column if not exists your_position numeric;
alter table competitor_rankings add column if not exists position_gap integer;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'competitor_rankings'
      and column_name = 'snapshot_date'
  ) then
    execute 'create index if not exists idx_competitor_rankings_brand on competitor_rankings (brand_id, snapshot_date desc)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'competitor_rankings'
      and column_name = 'position_gap'
  ) then
    execute 'create index if not exists idx_competitor_rankings_gap on competitor_rankings (brand_id, position_gap desc)';
  end if;
end $$;
