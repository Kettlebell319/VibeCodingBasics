-- Migration: Update tier system to Free/Pro structure
-- Run this migration in your Supabase SQL editor

-- 1. Update existing users to new tier structure
UPDATE users 
SET tier = CASE 
  WHEN tier = 'explorer' THEN 'free'
  WHEN tier IN ('builder', 'expert') THEN 'pro'
  ELSE 'free'
END;

-- 2. Update monthly limits for new tier structure
UPDATE users 
SET monthly_limit = CASE 
  WHEN tier = 'free' THEN 30
  WHEN tier = 'pro' THEN 300
  ELSE 30
END;

-- 3. Add check constraint for tier values (optional but recommended)
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_tier_check;

ALTER TABLE users 
ADD CONSTRAINT users_tier_check 
CHECK (tier IN ('free', 'pro'));

-- 4. Update any existing usage that exceeds new limits
-- Reset usage for users whose current usage exceeds their new tier limits
UPDATE users 
SET questions_used_this_month = 0 
WHERE (tier = 'free' AND questions_used_this_month > 30)
   OR (tier = 'pro' AND questions_used_this_month > 300);

-- 5. Verify the migration
SELECT 
  tier, 
  COUNT(*) as user_count,
  AVG(monthly_limit) as avg_limit,
  AVG(questions_used_this_month) as avg_usage
FROM users 
GROUP BY tier
ORDER BY tier;