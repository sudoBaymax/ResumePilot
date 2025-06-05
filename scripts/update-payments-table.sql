-- Add stripe_price_id column to payments table if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_user_status 
ON payments(user_id, status);

-- Add index for stripe_price_id
CREATE INDEX IF NOT EXISTS idx_payments_stripe_price_id 
ON payments(stripe_price_id);
