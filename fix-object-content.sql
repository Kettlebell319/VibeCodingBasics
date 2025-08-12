-- Fix any existing answers that have [object Object] in content
-- Run this in Supabase SQL Editor if needed

UPDATE answers 
SET content = REPLACE(content, '[object Object]', '')
WHERE content LIKE '%[object Object]%';

-- Check if any answers still have issues
SELECT id, question_id, LEFT(content, 100) as content_preview
FROM answers 
WHERE content LIKE '%object%' OR content LIKE '%Object%'
LIMIT 5;