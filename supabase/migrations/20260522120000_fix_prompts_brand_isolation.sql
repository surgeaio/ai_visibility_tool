-- Prompts are scoped per brand; enforce index for list queries by brand_id.
-- brand_id is NOT NULL on prompts (see initial_schema); this migration is idempotent.

create index if not exists idx_prompts_brand_id on prompts (brand_id);

-- Safety: remove rows that somehow lack brand_id (legacy data only).
delete from prompts where brand_id is null;
