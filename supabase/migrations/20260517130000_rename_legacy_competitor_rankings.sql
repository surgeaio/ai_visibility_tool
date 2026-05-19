-- Legacy CRM migration (20260213000002) created competitor_rankings with keyword/measured_date.
-- SERP intelligence (20260518120000) needs a different schema including snapshot_date.
-- Rename the legacy table so the new migration can create competitor_rankings cleanly.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'competitor_rankings'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'competitor_rankings'
      and column_name = 'keyword'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'competitor_rankings'
      and column_name = 'snapshot_date'
  ) then
    alter table competitor_rankings rename to competitor_rankings_crm_legacy;
  end if;
end $$;
