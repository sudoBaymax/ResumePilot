# ResumePilot Database Documentation

## Overview

ResumePilot uses Supabase (PostgreSQL) as its primary database. This document outlines the database schema, relationships, migrations, and data management strategies.

## Database Schema

### Core Tables

#### `profiles`
Stores user profile information.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  job_title TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
```

#### `subscriptions`
Manages user subscription data and Stripe integration.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan_name TEXT NOT NULL CHECK (plan_name IN ('starter', 'pro', 'career', 'coach')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_name ON subscriptions(plan_name);
```

#### `usage_tracking`
Tracks monthly usage for subscription limits.

```sql
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  interviews_used INTEGER DEFAULT 0,
  cover_letters_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month)
);
```

**Indexes:**
```sql
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_month ON usage_tracking(month);
CREATE INDEX idx_usage_tracking_user_month ON usage_tracking(user_id, month);
```

#### `resume_bullets`
Stores generated bullet points from interviews.

```sql
CREATE TABLE resume_bullets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  transcript TEXT NOT NULL,
  bullets JSONB NOT NULL,
  role TEXT,
  experience TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_resume_bullets_user_id ON resume_bullets(user_id);
CREATE INDEX idx_resume_bullets_created_at ON resume_bullets(created_at);
CREATE INDEX idx_resume_bullets_role ON resume_bullets(role);
```

### Interview Tables

#### `interview_sessions`
Tracks interview sessions and metadata.

```sql
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('voice', 'chat', 'resume_analyzer')),
  role_type TEXT,
  duration_seconds INTEGER,
  turns_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes:**
```sql
CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_created_at ON interview_sessions(created_at);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);
```

#### `interview_turns`
Stores individual conversation turns within sessions.

```sql
CREATE TABLE interview_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('user', 'ai')),
  message TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  audio_url TEXT, -- For voice interviews
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_interview_turns_session_id ON interview_turns(session_id);
CREATE INDEX idx_interview_turns_turn_number ON interview_turns(turn_number);
CREATE INDEX idx_interview_turns_speaker ON interview_turns(speaker);
```

#### `interview_transcripts`
Stores transcribed audio data.

```sql
CREATE TABLE interview_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_file_url TEXT NOT NULL,
  transcript_text TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_interview_transcripts_user_id ON interview_transcripts(user_id);
CREATE INDEX idx_interview_transcripts_created_at ON interview_transcripts(created_at);
```

### Resume Generation Tables

#### `resume_generations`
Tracks resume generation requests and results.

```sql
CREATE TABLE resume_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES interview_sessions(id),
  template_name TEXT NOT NULL,
  role_type TEXT NOT NULL,
  resume_data JSONB NOT NULL,
  latex_content TEXT,
  generation_status TEXT DEFAULT 'processing' CHECK (generation_status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes:**
```sql
CREATE INDEX idx_resume_generations_user_id ON resume_generations(user_id);
CREATE INDEX idx_resume_generations_status ON resume_generations(generation_status);
CREATE INDEX idx_resume_generations_created_at ON resume_generations(created_at);
```

#### `resume_downloads`
Tracks resume downloads and formats.

```sql
CREATE TABLE resume_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES resume_generations(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('latex', 'pdf', 'word', 'overleaf')),
  file_url TEXT,
  file_size_bytes INTEGER,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_resume_downloads_generation_id ON resume_downloads(generation_id);
CREATE INDEX idx_resume_downloads_format ON resume_downloads(format);
```

### Admin Tables

#### `admin_users`
Identifies admin users with special privileges.

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);
```

#### `system_events`
Logs system events for monitoring and debugging.

```sql
CREATE TABLE system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_system_events_event_type ON system_events(event_type);
CREATE INDEX idx_system_events_created_at ON system_events(created_at);
CREATE INDEX idx_system_events_user_id ON system_events(user_id);
```

## Row Level Security (RLS)

### Profiles RLS
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Subscriptions RLS
```sql
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );
```

### Usage Tracking RLS
```sql
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Functions and Triggers

### Update Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at 
  BEFORE UPDATE ON usage_tracking 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Usage Tracking Function
```sql
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_action TEXT,
  p_month TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM')
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, month, interviews_used, cover_letters_used)
  VALUES (
    p_user_id, 
    p_month,
    CASE WHEN p_action = 'interview' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'cover_letter' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    interviews_used = usage_tracking.interviews_used + 
      CASE WHEN p_action = 'interview' THEN 1 ELSE 0 END,
    cover_letters_used = usage_tracking.cover_letters_used + 
      CASE WHEN p_action = 'cover_letter' THEN 1 ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### Subscription Status Function
```sql
CREATE OR REPLACE FUNCTION get_user_subscription_status(p_user_id UUID)
RETURNS TABLE(
  plan_name TEXT,
  status TEXT,
  interviews_remaining INTEGER,
  cover_letters_remaining INTEGER,
  is_admin BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.plan_name, 'starter') as plan_name,
    COALESCE(s.status, 'none') as status,
    CASE 
      WHEN EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = p_user_id) THEN -1
      WHEN s.plan_name = 'starter' THEN 1 - COALESCE(ut.interviews_used, 0)
      WHEN s.plan_name = 'pro' THEN 10 - COALESCE(ut.interviews_used, 0)
      WHEN s.plan_name = 'career' THEN 30 - COALESCE(ut.interviews_used, 0)
      WHEN s.plan_name = 'coach' THEN -1
      ELSE 0
    END as interviews_remaining,
    CASE 
      WHEN EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = p_user_id) THEN -1
      WHEN s.plan_name = 'career' THEN 3 - COALESCE(ut.cover_letters_used, 0)
      WHEN s.plan_name = 'coach' THEN -1
      ELSE 0
    END as cover_letters_remaining,
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = p_user_id) as is_admin
  FROM auth.users u
  LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
  LEFT JOIN usage_tracking ut ON u.id = ut.user_id AND ut.month = TO_CHAR(NOW(), 'YYYY-MM')
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

## Migrations

### Initial Migration
```sql
-- scripts/create-interview-tables.sql
-- Creates all interview-related tables

-- scripts/update-interview-tables.sql
-- Updates existing tables with new columns

-- scripts/update-payment-system.sql
-- Updates payment and subscription tables

-- scripts/update-payments-table.sql
-- Updates payments table structure
```

### Migration Commands
```bash
# Run migrations in order
psql -d your_database -f scripts/create-interview-tables.sql
psql -d your_database -f scripts/update-interview-tables.sql
psql -d your_database -f scripts/update-payment-system.sql
psql -d your_database -f scripts/update-payments-table.sql
```

## Data Management

### Backup Strategy
- **Automated Backups**: Supabase provides automated daily backups
- **Point-in-Time Recovery**: Available for disaster recovery
- **Manual Backups**: Export data using Supabase dashboard

### Data Retention
- **User Data**: Retained until account deletion
- **Interview Data**: Retained for 2 years
- **Usage Data**: Retained for 1 year
- **System Logs**: Retained for 90 days

### Data Privacy
- **GDPR Compliance**: User data can be exported and deleted
- **Data Encryption**: All data encrypted at rest and in transit
- **Access Controls**: Row-level security prevents unauthorized access

## Performance Optimization

### Query Optimization
```sql
-- Use indexes for common queries
EXPLAIN ANALYZE SELECT * FROM usage_tracking 
WHERE user_id = 'user-uuid' AND month = '2024-01';

-- Optimize JSONB queries
CREATE INDEX idx_resume_bullets_bullets_gin ON resume_bullets USING GIN (bullets);
```

### Connection Pooling
- Supabase handles connection pooling automatically
- Configure connection limits in Supabase dashboard
- Monitor connection usage in metrics

### Caching Strategy
- **Application Cache**: Cache frequently accessed data in memory
- **CDN Cache**: Static assets cached via Vercel CDN
- **Database Cache**: Supabase optimizes query caching

## Monitoring and Analytics

### Key Metrics
- **User Growth**: New user registrations
- **Usage Patterns**: Interview and resume generation frequency
- **Subscription Metrics**: Conversion rates and churn
- **Performance**: Query response times and error rates

### Monitoring Queries
```sql
-- Active users this month
SELECT COUNT(DISTINCT user_id) 
FROM usage_tracking 
WHERE month = TO_CHAR(NOW(), 'YYYY-MM');

-- Popular subscription plans
SELECT plan_name, COUNT(*) as count
FROM subscriptions 
WHERE status = 'active'
GROUP BY plan_name
ORDER BY count DESC;

-- Interview completion rates
SELECT 
  session_type,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  ROUND(COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*), 2) as completion_rate
FROM interview_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY session_type;
```

## Security Considerations

### Data Protection
- **Encryption**: All sensitive data encrypted
- **Access Control**: Row-level security enforced
- **Audit Logging**: All data access logged
- **Input Validation**: All inputs validated and sanitized

### Compliance
- **GDPR**: Right to be forgotten implemented
- **CCPA**: California privacy compliance
- **SOC 2**: Security controls in place
- **PCI DSS**: Payment data handled securely

## Troubleshooting

### Common Issues

#### Connection Timeouts
```sql
-- Check connection pool status
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

#### Performance Issues
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Analyze index usage
SELECT 
  indexrelname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;
```

#### Data Consistency
```sql
-- Check for orphaned records
SELECT COUNT(*) FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL;

-- Verify subscription consistency
SELECT user_id, COUNT(*) 
FROM subscriptions 
GROUP BY user_id 
HAVING COUNT(*) > 1;
```

This comprehensive database documentation ensures proper data management, security, and performance optimization for the ResumePilot application. 