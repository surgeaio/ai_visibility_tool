-- Optional brand aliases for mention detection (idempotent)
alter table brands add column if not exists aliases text[] default '{}';
