-- Update Payment System Database Schema
-- This script updates the database to support the new pricing structure and admin privileges

-- 1. Ensure payments table has all required columns
DO $$ 
BEGIN
    -- Add stripe_price_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payments' AND column_name='stripe_price_id') THEN
        ALTER TABLE payments ADD COLUMN stripe_price_id TEXT;
    END IF;

    -- Add plan_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payments' AND column_name='plan_name') THEN
        ALTER TABLE payments ADD COLUMN plan_name TEXT;
    END IF;

    -- Add currency column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payments' AND column_name='currency') THEN
        ALTER TABLE payments ADD COLUMN currency TEXT DEFAULT 'usd';
    END IF;
END $$;

-- 2. Ensure subscriptions table has all required columns
DO $$ 
BEGIN
    -- Add stripe_price_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='subscriptions' AND column_name='stripe_price_id') THEN
        ALTER TABLE subscriptions ADD COLUMN stripe_price_id TEXT;
    END IF;

    -- Add cancel_at_period_end column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='subscriptions' AND column_name='cancel_at_period_end') THEN
        ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add current_period_start column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='subscriptions' AND column_name='current_period_start') THEN
        ALTER TABLE subscriptions ADD COLUMN current_period_start TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add current_period_end column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='subscriptions' AND column_name='current_period_end') THEN
        ALTER TABLE subscriptions ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Ensure usage_tracking table has all required columns
DO $$ 
BEGIN
    -- Add cover_letters_used column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='usage_tracking' AND column_name='cover_letters_used') THEN
        ALTER TABLE usage_tracking ADD COLUMN cover_letters_used INTEGER DEFAULT 0;
    END IF;

    -- Add month_year column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='usage_tracking' AND column_name='month_year') THEN
        ALTER TABLE usage_tracking ADD COLUMN month_year TEXT;
    END IF;
END $$;

-- 4. Create indexes for better performance
DO $$
BEGIN
    -- Payments table indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_user_status') THEN
        CREATE INDEX idx_payments_user_status ON payments(user_id, status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_stripe_price_id') THEN
        CREATE INDEX idx_payments_stripe_price_id ON payments(stripe_price_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_created_at') THEN
        CREATE INDEX idx_payments_created_at ON payments(created_at);
    END IF;

    -- Subscriptions table indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_user_status') THEN
        CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_stripe_subscription_id') THEN
        CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_stripe_customer_id') THEN
        CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
    END IF;

    -- Usage tracking table indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_tracking_user_month') THEN
        CREATE INDEX idx_usage_tracking_user_month ON usage_tracking(user_id, month_year);
    END IF;
END $$;

-- 5. Create or update the increment_usage function
CREATE OR REPLACE FUNCTION increment_usage(
    p_user_id UUID,
    p_month_year TEXT,
    p_action TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO usage_tracking (user_id, month_year, interviews_used, cover_letters_used, created_at, updated_at)
    VALUES (
        p_user_id,
        p_month_year,
        CASE WHEN p_action = 'interview' THEN 1 ELSE 0 END,
        CASE WHEN p_action = 'cover_letter' THEN 1 ELSE 0 END,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET
        interviews_used = usage_tracking.interviews_used + CASE WHEN p_action = 'interview' THEN 1 ELSE 0 END,
        cover_letters_used = usage_tracking.cover_letters_used + CASE WHEN p_action = 'cover_letter' THEN 1 ELSE 0 END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Add unique constraint to usage_tracking if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_tracking_user_month_unique') THEN
        ALTER TABLE usage_tracking ADD CONSTRAINT usage_tracking_user_month_unique UNIQUE (user_id, month_year);
    END IF;
END $$;

-- 7. Update any existing records to have proper month_year format
UPDATE usage_tracking 
SET month_year = TO_CHAR(created_at, 'YYYY-MM')
WHERE month_year IS NULL OR month_year = '';

-- 8. Create a function to get user subscription with fallback
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    plan_name TEXT,
    status TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.stripe_customer_id,
        s.stripe_subscription_id,
        s.stripe_price_id,
        s.plan_name,
        s.status,
        s.current_period_start,
        s.current_period_end,
        s.cancel_at_period_end,
        s.created_at,
        s.updated_at
    FROM subscriptions s
    WHERE s.user_id = p_user_id
    ORDER BY 
        CASE WHEN s.status = 'active' THEN 0 ELSE 1 END,
        s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 9. Create a function to get user usage with fallback
CREATE OR REPLACE FUNCTION get_user_usage(p_user_id UUID, p_month_year TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    month_year TEXT,
    interviews_used INTEGER,
    cover_letters_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.user_id,
        u.month_year,
        u.interviews_used,
        u.cover_letters_used,
        u.created_at,
        u.updated_at
    FROM usage_tracking u
    WHERE u.user_id = p_user_id AND u.month_year = p_month_year
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 10. Add comments for documentation
COMMENT ON TABLE payments IS 'Stores all payment transactions from Stripe';
COMMENT ON TABLE subscriptions IS 'Stores user subscription information';
COMMENT ON TABLE usage_tracking IS 'Tracks monthly usage for interviews and cover letters';

COMMENT ON COLUMN payments.stripe_price_id IS 'Stripe price ID for the purchased plan';
COMMENT ON COLUMN payments.plan_name IS 'Human-readable plan name (starter, pro, career, coach)';
COMMENT ON COLUMN subscriptions.stripe_price_id IS 'Stripe price ID for the subscription';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN usage_tracking.cover_letters_used IS 'Number of cover letters used this month';
COMMENT ON COLUMN usage_tracking.month_year IS 'Month in YYYY-MM format for tracking monthly usage';

-- 11. Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_usage(UUID, TEXT) TO authenticated;

-- 12. Create a view for admin dashboard
CREATE OR REPLACE VIEW admin_subscription_overview AS
SELECT 
    u.email,
    s.plan_name,
    s.status,
    s.current_period_end,
    ut.interviews_used,
    ut.cover_letters_used,
    ut.month_year,
    s.created_at as subscription_created,
    s.updated_at as subscription_updated
FROM auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id AND ut.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
ORDER BY s.created_at DESC;

COMMENT ON VIEW admin_subscription_overview IS 'Admin view for monitoring user subscriptions and usage';

-- 13. Create a function to reset monthly usage (for admin use)
CREATE OR REPLACE FUNCTION reset_monthly_usage(p_month_year TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    target_month TEXT;
    affected_rows INTEGER;
BEGIN
    -- If no month specified, use current month
    IF p_month_year IS NULL THEN
        target_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    ELSE
        target_month := p_month_year;
    END IF;

    UPDATE usage_tracking 
    SET 
        interviews_used = 0,
        cover_letters_used = 0,
        updated_at = NOW()
    WHERE month_year = target_month;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_monthly_usage(TEXT) IS 'Admin function to reset monthly usage for all users';

-- 14. Create a function to get subscription statistics
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS TABLE (
    plan_name TEXT,
    active_count BIGINT,
    total_revenue NUMERIC,
    avg_monthly_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.plan_name,
        COUNT(*) as active_count,
        COALESCE(SUM(p.amount), 0) as total_revenue,
        COALESCE(AVG(p.amount), 0) as avg_monthly_revenue
    FROM subscriptions s
    LEFT JOIN payments p ON s.user_id = p.user_id AND p.status = 'succeeded'
    WHERE s.status = 'active'
    GROUP BY s.plan_name
    ORDER BY active_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_subscription_stats() IS 'Get subscription statistics for admin dashboard';

-- 15. Final verification queries
-- These can be run to verify the setup
-- SELECT COUNT(*) FROM payments WHERE stripe_price_id IS NOT NULL;
-- SELECT COUNT(*) FROM subscriptions WHERE stripe_price_id IS NOT NULL;
-- SELECT COUNT(*) FROM usage_tracking WHERE cover_letters_used IS NOT NULL;
-- SELECT plan_name, COUNT(*) FROM subscriptions WHERE status = 'active' GROUP BY plan_name; 