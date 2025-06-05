-- Add stripe_price_id column to payments table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payments' AND column_name='stripe_price_id') THEN
        ALTER TABLE payments ADD COLUMN stripe_price_id TEXT;
    END IF;
END $$;

-- Add index for better performance if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_user_status') THEN
        CREATE INDEX idx_payments_user_status ON payments(user_id, status);
    END IF;
END $$;

-- Add index for stripe_price_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_stripe_price_id') THEN
        CREATE INDEX idx_payments_stripe_price_id ON payments(stripe_price_id);
    END IF;
END $$;
