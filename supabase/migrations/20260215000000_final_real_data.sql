-- Optional recommendation detail columns (AI engine + UI)
alter table recommendations add column if not exists difficulty text;
alter table recommendations add column if not exists estimated_time text;
alter table recommendations add column if not exists implementation_steps jsonb;
alter table recommendations add column if not exists success_metrics jsonb;
alter table recommendations add column if not exists evidence jsonb;
alter table recommendations add column if not exists impact_score integer;
