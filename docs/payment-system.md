# Payment System Documentation

## Overview

The ResumePilot payment system has been completely updated to match the pricing page exactly and includes admin privileges for unlimited access.

## Pricing Structure

### Plans and Limits

| Plan | Price | Interviews/Month | Cover Letters/Month | Templates | Features |
|------|-------|------------------|---------------------|-----------|----------|
| Starter | $9 (one-time) | 1 | 0 | 1 (Jake's Template) | Basic ATS, PDF export, STAR & XYZ format |
| Pro | $39/month | 10 | 0 | Unlimited | Advanced ATS, LinkedIn export, Analytics, Question bank |
| Pro (Yearly) | $299/year | 10 | 0 | Unlimited | Same as Pro + 36% savings |
| Career+ | $59/month | 30 | 3 | Unlimited | Everything in Pro + Role matching, AI coach |
| Career+ (Yearly) | $449/year | 30 | 3 | Unlimited | Same as Career+ + 36% savings |
| Coach/Agency | $129/month | Unlimited | Unlimited | Unlimited | Everything + Team features, Whitelabel, API access |
| Coach/Agency (Yearly) | $999/year | Unlimited | Unlimited | Unlimited | Same as Coach + 36% savings |

## Admin Privileges

### Admin Emails
The following email addresses have unlimited access to all features:

- `jatoujoseph@gmail.com`
- `admin@resumepilot.ca`
- `support@resumepilot.ca`
- `info@resumepilot.ca`

### Admin Features
- Unlimited interviews
- Unlimited cover letters
- Access to all templates
- No usage warnings
- Special admin dashboard view

## Database Schema

### Tables

#### `payments`
Stores all payment transactions from Stripe
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key to auth.users)
- stripe_payment_intent_id (TEXT)
- stripe_price_id (TEXT)
- plan_name (TEXT)
- amount (INTEGER) - amount in cents
- currency (TEXT) - default 'usd'
- status (TEXT) - 'succeeded', 'failed', 'pending'
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `subscriptions`
Stores user subscription information
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key to auth.users)
- stripe_customer_id (TEXT)
- stripe_subscription_id (TEXT)
- stripe_price_id (TEXT)
- plan_name (TEXT) - 'starter', 'pro', 'career', 'coach'
- status (TEXT) - 'active', 'canceled', 'past_due', 'incomplete'
- current_period_start (TIMESTAMP)
- current_period_end (TIMESTAMP)
- cancel_at_period_end (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `usage_tracking`
Tracks monthly usage for interviews and cover letters
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key to auth.users)
- month_year (TEXT) - format 'YYYY-MM'
- interviews_used (INTEGER) - default 0
- cover_letters_used (INTEGER) - default 0
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Functions

#### `increment_usage(p_user_id UUID, p_month_year TEXT, p_action TEXT)`
Increments usage for a specific action (interview or cover_letter) for a user in a given month.

#### `get_user_subscription(p_user_id UUID)`
Returns the most recent active subscription for a user, or the most recent subscription if none are active.

#### `get_user_usage(p_user_id UUID, p_month_year TEXT)`
Returns usage data for a user in a specific month.

#### `reset_monthly_usage(p_month_year TEXT)`
Admin function to reset monthly usage for all users (optional month parameter).

#### `get_subscription_stats()`
Returns subscription statistics for admin dashboard.

### Views

#### `admin_subscription_overview`
Admin view for monitoring user subscriptions and usage:
```sql
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
```

## Stripe Integration

### Environment Variables Required
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Price IDs (replace with actual Stripe price IDs)
PRICE_ID_STARTER=price_...
PRICE_ID_PRO_MONTH=price_...
PRICE_ID_PRO_YEAR=price_...
PRICE_ID_CAREER_MONTH=price_...
PRICE_ID_CAREER_YEAR=price_...
PRICE_ID_COACH_MONTH=price_...
PRICE_ID_COACH_YEAR=price_...

# Product IDs
PRODUCT_ID_STARTER=prod_...
PRODUCT_ID_PRO=prod_...
PRODUCT_ID_CAREER=prod_...
PRODUCT_ID_COACH=prod_...
```

### Webhook Events Handled
- `checkout.session.completed` - Creates/updates subscription and usage tracking
- `customer.subscription.created` - Creates subscription record
- `customer.subscription.updated` - Updates subscription record
- `customer.subscription.deleted` - Marks subscription as canceled
- `invoice.payment_succeeded` - Updates subscription status
- `invoice.payment_failed` - Marks subscription as past_due
- `payment_intent.succeeded` - Records successful payment
- `payment_intent.payment_failed` - Records failed payment

## API Endpoints

### `/api/stripe/create-checkout`
Creates a Stripe checkout session for plan purchase.

**Request:**
```json
{
  "planKey": "pro",
  "userId": "user-uuid",
  "billingCycle": "monthly"
}
```

**Response:**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### `/api/stripe/create-portal`
Creates a Stripe customer portal session for billing management.

**Request:**
```json
{
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### `/api/stripe/webhooks`
Handles all Stripe webhook events. Returns 200 for successful processing, 400 for invalid signature, 500 for processing errors.

## Usage Tracking

### How It Works
1. Each user action (interview, cover letter) calls `incrementUsage()`
2. Usage is tracked per month using `YYYY-MM` format
3. Limits are enforced based on plan type
4. Admin users bypass all limits

### Usage Check Flow
1. Check if user is admin (unlimited access)
2. Get user's subscription
3. Get current month's usage
4. Compare usage against plan limits
5. Allow or deny action with reason

## Components

### `UsageWarning`
Shows warnings when users approach or reach their limits. Admin users don't see warnings.

### `SubscriptionManager`
Displays subscription information and upgrade options. Shows special admin view for admin users.

### `SubscriptionGuard`
Middleware that checks subscription status before allowing access to protected features.

## Migration

### Running the Migration
1. Execute the SQL script: `scripts/update-payment-system.sql`
2. Update environment variables with correct Stripe price IDs
3. Test webhook endpoint: `https://resumepilot.ca/api/stripe/webhooks`
4. Verify admin privileges work for specified emails

### Verification Queries
```sql
-- Check payments table structure
SELECT COUNT(*) FROM payments WHERE stripe_price_id IS NOT NULL;

-- Check subscriptions table structure
SELECT COUNT(*) FROM subscriptions WHERE stripe_price_id IS NOT NULL;

-- Check usage tracking
SELECT COUNT(*) FROM usage_tracking WHERE cover_letters_used IS NOT NULL;

-- Check plan distribution
SELECT plan_name, COUNT(*) FROM subscriptions WHERE status = 'active' GROUP BY plan_name;

-- Check admin view
SELECT * FROM admin_subscription_overview LIMIT 10;
```

## Troubleshooting

### Webhook Issues
1. Ensure webhook endpoint is accessible: `https://resumepilot.ca/api/stripe/webhooks`
2. Verify webhook secret is correct
3. Check logs for signature verification errors
4. Ensure all required environment variables are set

### Admin Access Issues
1. Verify email is in `ADMIN_EMAILS` array
2. Check user authentication status
3. Ensure `isAdminUser()` function is working correctly

### Usage Tracking Issues
1. Check `increment_usage` function exists in database
2. Verify unique constraint on `usage_tracking(user_id, month_year)`
3. Check for proper month_year format (`YYYY-MM`)

## Security Considerations

1. **Admin Access**: Only specified emails have admin privileges
2. **Webhook Security**: All webhooks are verified using Stripe signature
3. **Database Security**: Row-level security policies protect user data
4. **API Protection**: All payment endpoints require authentication

## Monitoring

### Key Metrics to Track
- Subscription conversion rates
- Monthly recurring revenue (MRR)
- Churn rate by plan
- Usage patterns by plan
- Admin usage patterns

### Admin Dashboard Queries
```sql
-- Active subscriptions by plan
SELECT plan_name, COUNT(*) FROM subscriptions WHERE status = 'active' GROUP BY plan_name;

-- Monthly revenue
SELECT DATE_TRUNC('month', created_at) as month, SUM(amount)/100 as revenue 
FROM payments WHERE status = 'succeeded' 
GROUP BY month ORDER BY month;

-- Usage statistics
SELECT plan_name, AVG(interviews_used) as avg_interviews, AVG(cover_letters_used) as avg_cover_letters
FROM subscriptions s
JOIN usage_tracking ut ON s.user_id = ut.user_id
WHERE s.status = 'active' AND ut.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
GROUP BY plan_name;
``` 