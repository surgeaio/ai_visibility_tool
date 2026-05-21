-- ============================================================
-- Remove duplicate demo seed rows and add unique indexes so
-- all seeder upserts are idempotent.
--
-- STEP 1: Delete duplicates (keep the earliest row per key)
-- STEP 2: Create unique indexes that back ON CONFLICT clauses
-- ============================================================

-- ── 1. Duplicate prompts (same brand + text) ─────────────────
DELETE FROM prompts
WHERE id NOT IN (
  SELECT DISTINCT ON (brand_id, text) id
  FROM prompts
  ORDER BY brand_id, text, created_at ASC NULLS LAST, id ASC
);

-- ── 2. Duplicate chat_responses (same brand + prompt + model + date) ─
-- Cascade will clean linked chat_analysis rows and
-- chat_response_id-linked source_appearances rows automatically.
DELETE FROM chat_responses
WHERE id NOT IN (
  SELECT DISTINCT ON (brand_id, prompt_id, ai_model, run_date) id
  FROM chat_responses
  ORDER BY brand_id, prompt_id, ai_model, run_date, created_at ASC NULLS LAST, id ASC
);

-- ── 3. Duplicate chat_analysis (same response — should be 1:1) ───────
DELETE FROM chat_analysis
WHERE id NOT IN (
  SELECT DISTINCT ON (chat_response_id) id
  FROM chat_analysis
  ORDER BY chat_response_id, created_at ASC NULLS LAST, id ASC
);

-- ── 4. Duplicate competitors (same brand + competitor_name) ──────────
DELETE FROM competitors
WHERE id NOT IN (
  SELECT DISTINCT ON (brand_id, competitor_name) id
  FROM competitors
  ORDER BY brand_id, competitor_name, created_at ASC NULLS LAST, id ASC
);

-- ── 5. Duplicate ai_recommendations (same brand + title) ─────────────
DELETE FROM ai_recommendations
WHERE id NOT IN (
  SELECT DISTINCT ON (brand_id, title) id
  FROM ai_recommendations
  ORDER BY brand_id, title, created_at ASC NULLS LAST, id ASC
);

-- ── 6. Duplicate citations (same brand + url + provider) ─────────────
DELETE FROM citations
WHERE id NOT IN (
  SELECT DISTINCT ON (brand_id, url, COALESCE(provider, '')) id
  FROM citations
  ORDER BY brand_id, url, COALESCE(provider, ''), created_at ASC NULLS LAST, id ASC
);

-- ── 7. Duplicate domain-level source_appearances (chat_response_id IS NULL) ─
DELETE FROM source_appearances
WHERE chat_response_id IS NULL
  AND id NOT IN (
    SELECT DISTINCT ON (brand_id, domain, run_date, ai_model) id
    FROM source_appearances
    WHERE chat_response_id IS NULL
    ORDER BY brand_id, domain, run_date, ai_model, created_at ASC NULLS LAST, id ASC
  );

-- ── 8. Duplicate response-level source_appearances ───────────────────
DELETE FROM source_appearances
WHERE chat_response_id IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (brand_id, chat_response_id, url) id
    FROM source_appearances
    WHERE chat_response_id IS NOT NULL
    ORDER BY brand_id, chat_response_id, url, created_at ASC NULLS LAST, id ASC
  );

-- ============================================================
-- STEP 2: Unique indexes
-- ============================================================

-- prompts: one prompt text per brand
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_brand_text
  ON prompts(brand_id, text);

-- chat_responses: one response per brand+prompt+model+date
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_responses_brand_prompt_model_date
  ON chat_responses(brand_id, prompt_id, ai_model, run_date);

-- chat_analysis: one analysis record per chat_response (1:1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_analysis_response_id
  ON chat_analysis(chat_response_id);

-- competitors: one entry per competitor name per brand
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitors_brand_name
  ON competitors(brand_id, competitor_name);

-- ai_recommendations: one recommendation per title per brand
CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendations_brand_title
  ON ai_recommendations(brand_id, title);

-- citations: one citation per (brand + url + provider)
-- provider is always non-null for seeded rows; nullable for real rows
-- (two NULL-provider rows with same brand+url are treated as distinct — fine)
CREATE UNIQUE INDEX IF NOT EXISTS idx_citations_brand_url_provider
  ON citations(brand_id, url, provider);

-- source_appearances (response-level): one row per (brand + response + url)
-- NULL chat_response_id rows (domain-level) are intentionally excluded:
-- PostgreSQL treats NULL != NULL so domain-level rows never conflict here.
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_appearances_response_url
  ON source_appearances(brand_id, chat_response_id, url);
