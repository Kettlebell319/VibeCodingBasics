# VibeCodingBasics.com - Database Schema Updates

## **Current Schema Status**
The platform currently has these tables:
- `users` - User authentication and profile data
- `questions` - User-submitted questions
- `answers` - AI-generated responses
- `user_usage` - Daily usage tracking

## **Required Schema Updates for Phase 1**

### **1. User Tier System**
```sql
-- Add subscription and tier tracking to users table
ALTER TABLE users ADD COLUMN tier VARCHAR(20) DEFAULT 'explorer';
ALTER TABLE users ADD COLUMN subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN questions_used_this_month INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN monthly_limit INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN last_reset_date DATE DEFAULT CURRENT_DATE;

-- Create index for tier-based queries
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
```

### **2. Subscription Management**
```sql
-- Track subscription events and billing
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- active, canceled, past_due, etc.
  tier VARCHAR(20) NOT NULL, -- builder, expert
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON user_subscriptions(stripe_subscription_id);
```

### **3. Usage Tracking Enhancement**
```sql
-- Enhanced usage tracking for tier limits
CREATE TABLE user_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL, -- '2024-01'
  questions_used INTEGER DEFAULT 0,
  questions_limit INTEGER NOT NULL,
  tier VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

CREATE INDEX idx_usage_monthly_user ON user_usage_monthly(user_id);
CREATE INDEX idx_usage_monthly_period ON user_usage_monthly(month_year);
```

## **Community Features Schema (Phase 2)**

### **4. Community Answers System**
```sql
-- Community-submitted answers to questions
CREATE TABLE community_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  net_votes INTEGER DEFAULT 0, -- upvotes - downvotes for sorting
  is_accepted BOOLEAN DEFAULT FALSE, -- question author can accept
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_community_answers_question ON community_answers(question_id);
CREATE INDEX idx_community_answers_user ON community_answers(user_id);
CREATE INDEX idx_community_answers_votes ON community_answers(net_votes DESC);
```

### **5. Voting System**
```sql
-- Track user votes on community answers
CREATE TABLE user_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES community_answers(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, answer_id) -- One vote per user per answer
);

CREATE INDEX idx_votes_user ON user_votes(user_id);
CREATE INDEX idx_votes_answer ON user_votes(answer_id);
```

### **6. Comments System**
```sql
-- Comments on both AI and community answers
CREATE TABLE answer_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES community_answers(id) ON DELETE CASCADE, -- NULL for AI answers
  parent_comment_id UUID REFERENCES answer_comments(id), -- For threaded replies
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_question ON answer_comments(question_id);
CREATE INDEX idx_comments_answer ON answer_comments(answer_id);
CREATE INDEX idx_comments_user ON answer_comments(user_id);
CREATE INDEX idx_comments_parent ON answer_comments(parent_comment_id);
```

### **7. User Badge System**
```sql
-- User achievements and expertise badges
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL,
  badge_category VARCHAR(30) NOT NULL, -- expertise, participation, quality
  earned_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB -- Additional badge-specific data
);

-- Predefined badge types:
-- expertise: frontend_expert, backend_expert, ai_tools_expert, devops_expert, mobile_expert
-- participation: first_answer, 10_answers, 100_answers, 1000_answers
-- quality: helpful_answerer, community_champion, top_contributor
-- special: vibecode_veteran, early_adopter

CREATE INDEX idx_badges_user ON user_badges(user_id);
CREATE INDEX idx_badges_type ON user_badges(badge_type);
CREATE INDEX idx_badges_category ON user_badges(badge_category);
```

### **8. User Bookmarks**
```sql
-- Personal knowledge base and saved content
CREATE TABLE user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  folder_name VARCHAR(100), -- Optional organization
  personal_notes TEXT,
  tags TEXT[], -- User-defined tags
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX idx_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX idx_bookmarks_folder ON user_bookmarks(user_id, folder_name);
CREATE INDEX idx_bookmarks_tags ON user_bookmarks USING GIN(tags);
```

## **Advanced Features Schema (Phase 3+)**

### **9. Expert Consultation System**
```sql
-- Expert consultation bookings and sessions
CREATE TABLE expert_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  topic VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP,
  duration_minutes INTEGER DEFAULT 60,
  rate_per_hour INTEGER NOT NULL, -- In cents
  total_amount INTEGER NOT NULL, -- In cents
  platform_fee INTEGER NOT NULL, -- In cents (30%)
  expert_earnings INTEGER NOT NULL, -- In cents (70%)
  meeting_link VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consultations_expert ON expert_consultations(expert_id);
CREATE INDEX idx_consultations_client ON expert_consultations(client_id);
CREATE INDEX idx_consultations_status ON expert_consultations(status);
```

### **10. Analytics and Insights**
```sql
-- Platform analytics for trending topics and insights
CREATE TABLE platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- questions_count, popular_category, trending_tag
  metric_value VARCHAR(255) NOT NULL,
  count_value INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, metric_type, metric_value)
);

CREATE INDEX idx_analytics_date ON platform_analytics(date);
CREATE INDEX idx_analytics_type ON platform_analytics(metric_type);
```

## **Database Functions and Triggers**

### **Monthly Usage Reset Function**
```sql
-- Function to reset monthly usage counters
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  -- Reset usage for users whose reset date has passed
  UPDATE users 
  SET questions_used_this_month = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE 
    AND EXTRACT(day FROM CURRENT_DATE) = 1; -- Reset on 1st of month
END;
$$ LANGUAGE plpgsql;

-- Schedule this function to run daily via cron job or database scheduler
```

### **Vote Count Update Trigger**
```sql
-- Automatically update community answer vote counts
CREATE OR REPLACE FUNCTION update_answer_votes()
RETURNS trigger AS $$
BEGIN
  -- Recalculate vote counts for the affected answer
  UPDATE community_answers 
  SET upvotes = (
    SELECT COUNT(*) FROM user_votes 
    WHERE answer_id = COALESCE(NEW.answer_id, OLD.answer_id) 
    AND vote_type = 'up'
  ),
  downvotes = (
    SELECT COUNT(*) FROM user_votes 
    WHERE answer_id = COALESCE(NEW.answer_id, OLD.answer_id) 
    AND vote_type = 'down'
  );
  
  -- Update net votes for sorting
  UPDATE community_answers 
  SET net_votes = upvotes - downvotes 
  WHERE id = COALESCE(NEW.answer_id, OLD.answer_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_votes
  AFTER INSERT OR UPDATE OR DELETE ON user_votes
  FOR EACH ROW EXECUTE FUNCTION update_answer_votes();
```

### **Badge Earning Trigger**
```sql
-- Automatically award badges based on user activity
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS trigger AS $$
DECLARE
  answer_count INTEGER;
  helpful_answers INTEGER;
BEGIN
  -- Count user's community answers
  SELECT COUNT(*) INTO answer_count
  FROM community_answers 
  WHERE user_id = NEW.user_id;
  
  -- Award participation badges
  IF answer_count = 1 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_category)
    VALUES (NEW.user_id, 'first_answer', 'participation')
    ON CONFLICT DO NOTHING;
  ELSIF answer_count = 10 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_category)
    VALUES (NEW.user_id, '10_answers', 'participation')
    ON CONFLICT DO NOTHING;
  ELSIF answer_count = 100 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_category)
    VALUES (NEW.user_id, '100_answers', 'participation')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for quality badges (answers with 5+ upvotes)
  SELECT COUNT(*) INTO helpful_answers
  FROM community_answers 
  WHERE user_id = NEW.user_id AND upvotes >= 5;
  
  IF helpful_answers >= 10 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_category)
    VALUES (NEW.user_id, 'helpful_answerer', 'quality')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_badges
  AFTER INSERT ON community_answers
  FOR EACH ROW EXECUTE FUNCTION check_and_award_badges();
```

## **Migration Order**

### **Phase 1 Migrations (Immediate)**
1. `ALTER TABLE users` - Add tier and subscription columns
2. `CREATE TABLE user_subscriptions` - Stripe integration
3. `CREATE TABLE user_usage_monthly` - Enhanced usage tracking

### **Phase 2 Migrations (Community Features)**
4. `CREATE TABLE community_answers` - Community answer system
5. `CREATE TABLE user_votes` - Voting system
6. `CREATE TABLE answer_comments` - Comments system
7. `CREATE TABLE user_badges` - Badge system
8. `CREATE TABLE user_bookmarks` - Personal knowledge base

### **Phase 3+ Migrations (Advanced Features)**
9. `CREATE TABLE expert_consultations` - Expert booking system
10. `CREATE TABLE platform_analytics` - Analytics and insights

## **Performance Considerations**

### **Indexing Strategy**
- All foreign keys are indexed
- Frequently queried columns have dedicated indexes
- Composite indexes for common query patterns
- GIN indexes for JSONB and array columns

### **Query Optimization**
- Use `LIMIT` for paginated results
- Implement proper `ORDER BY` with indexes
- Consider materialized views for complex analytics
- Use connection pooling for high concurrency

### **Scaling Considerations**
- Partition large tables by date if needed
- Consider read replicas for analytics queries
- Implement caching for frequently accessed data
- Monitor query performance and optimize as needed

## **Backup and Recovery**
- Daily automated backups via Supabase
- Point-in-time recovery available
- Test restore procedures monthly
- Monitor backup success and alert on failures