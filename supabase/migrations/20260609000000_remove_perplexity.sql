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

ALTER TABLE chat_responses DROP CONSTRAINT IF EXISTS chat_responses_ai_model_check;
ALTER TABLE chat_responses ADD CONSTRAINT chat_responses_ai_model_check CHECK (
  ai_model IN ('chatgpt', 'claude', 'gemini')
);
