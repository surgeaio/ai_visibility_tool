-- Remove Perplexity provider support

DELETE FROM user_api_keys WHERE provider = 'perplexity';
DELETE FROM llm_platforms WHERE name = 'perplexity';

ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_provider_check;
ALTER TABLE user_api_keys ADD CONSTRAINT user_api_keys_provider_check CHECK (
  provider IN (
    'openai',
    'anthropic',
    'gemini',
    'google_search_console',
    'google_analytics'
  )
);

-- Remove perplexity rows before adding constraint
DELETE FROM source_appearances
WHERE chat_response_id IN (SELECT id FROM chat_responses WHERE ai_model = 'perplexity')
   OR ai_model = 'perplexity';

DELETE FROM chat_analysis
WHERE chat_response_id IN (SELECT id FROM chat_responses WHERE ai_model = 'perplexity')
   OR ai_model = 'perplexity';

DELETE FROM citations
WHERE response_id IN (SELECT id FROM chat_responses WHERE ai_model = 'perplexity');

DELETE FROM brand_daily_metrics WHERE ai_model = 'perplexity';

DELETE FROM chat_responses WHERE ai_model = 'perplexity';

ALTER TABLE chat_responses DROP CONSTRAINT IF EXISTS chat_responses_ai_model_check;
ALTER TABLE chat_responses ADD CONSTRAINT chat_responses_ai_model_check CHECK (
  ai_model IN ('chatgpt', 'claude', 'gemini')
);
