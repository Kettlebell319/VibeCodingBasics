-- Phase 1: Tier System Database Migration
-- Run this in Supabase SQL Editor or via migration tool

-- 1. Update users table for tier system
ALTER TABLE users DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE users ADD COLUMN tier VARCHAR(20) DEFAULT 'explorer';
ALTER TABLE users ADD COLUMN subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN questions_used_this_month INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN monthly_limit INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN last_reset_date DATE DEFAULT CURRENT_DATE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- 2. Create subscription tracking table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON user_subscriptions(stripe_subscription_id);

-- 3. Enhanced usage tracking table
CREATE TABLE IF NOT EXISTS user_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL,
  questions_used INTEGER DEFAULT 0,
  questions_limit INTEGER NOT NULL,
  tier VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_usage_monthly_user ON user_usage_monthly(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_monthly_period ON user_usage_monthly(month_year);

-- 4. Monthly reset function
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET questions_used_this_month = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE 
    AND EXTRACT(day FROM CURRENT_DATE) = 1;
END;
$$ LANGUAGE plpgsql;

-- 5. Update existing users to have the new tier system
-- First, add the subscription_tier column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free';

-- Now update existing users to have the new tier system
UPDATE users 
SET tier = CASE 
  WHEN subscription_tier = 'premium' THEN 'builder'
  ELSE 'explorer'
END,
monthly_limit = CASE
  WHEN subscription_tier = 'premium' THEN -1 -- unlimited
  ELSE 5
END
WHERE tier IS NULL OR tier = '';

-- Clean up - remove the old subscription_tier column after migration
ALTER TABLE users DROP COLUMN IF EXISTS subscription_tier;

-- 6. Create function to check and update monthly usage
CREATE OR REPLACE FUNCTION check_monthly_reset(user_uuid UUID)
RETURNS void AS $$
DECLARE
  user_record RECORD;
  should_reset BOOLEAN;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = user_uuid;
  
  IF user_record.id IS NOT NULL THEN
    -- Check if we need to reset monthly usage
    should_reset := (
      user_record.last_reset_date < CURRENT_DATE AND
      (EXTRACT(MONTH FROM CURRENT_DATE) != EXTRACT(MONTH FROM user_record.last_reset_date) OR
       EXTRACT(YEAR FROM CURRENT_DATE) != EXTRACT(YEAR FROM user_record.last_reset_date))
    );
    
    IF should_reset THEN
      UPDATE users 
      SET questions_used_this_month = 0, 
          last_reset_date = CURRENT_DATE 
      WHERE id = user_uuid;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;