-- Fix malformed answer content in database
-- Run this in Supabase SQL Editor

-- Clean up JSON structure and object placeholders from existing content
UPDATE answers 
SET content = REGEXP_REPLACE(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(content, '^\{\s*"content":\s*"', ''),  -- Remove opening JSON
      '"\s*,.*$', ''                                        -- Remove trailing JSON
    ),
    '\[object Object\]', ''                                 -- Remove object placeholders
  ),
  '\\n', E'\n'                                             -- Fix escaped newlines
)
WHERE content LIKE '%"content":%' OR content LIKE '%[object Object]%';

-- Verify the cleanup
SELECT id, LEFT(content, 200) as cleaned_content_preview
FROM answers
WHERE LENGTH(content) > 0
ORDER BY created_at DESC
LIMIT 5;