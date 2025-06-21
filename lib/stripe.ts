import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
})

// Stripe plans configuration matching the pricing page exactly
export const STRIPE_PLANS = {
  starter: {
    priceId: process.env.PRICE_ID_STARTER!,
    productId: process.env.PRODUCT_ID_STARTER!,
    amount: 900, // $9.00
    interval: null, // One-time payment
    name: "Starter",
    description: "1 voice interview session",
  },
  pro_monthly: {
    priceId: process.env.PRICE_ID_PRO_MONTH!,
    productId: process.env.PRODUCT_ID_PRO!,
    amount: 3900, // $39.00
    interval: "month",
    name: "Pro",
    description: "10 voice interviews/month",
  },
  pro_yearly: {
    priceId: process.env.PRICE_ID_PRO_YEAR!,
    productId: process.env.PRODUCT_ID_PRO!,
    amount: 29900, // $299.00
    interval: "year",
    name: "Pro",
    description: "10 voice interviews/month",
  },
  career_monthly: {
    priceId: process.env.PRICE_ID_CAREER_MONTH!,
    productId: process.env.PRODUCT_ID_CAREER!,
    amount: 5900, // $59.00
    interval: "month",
    name: "Career+",
    description: "30 voice interviews + 3 cover letters/month",
  },
  career_yearly: {
    priceId: process.env.PRICE_ID_CAREER_YEAR!,
    productId: process.env.PRODUCT_ID_CAREER!,
    amount: 44900, // $449.00
    interval: "year",
    name: "Career+",
    description: "30 voice interviews + 3 cover letters/month",
  },
  coach_monthly: {
    priceId: process.env.PRICE_ID_COACH_MONTH!,
    productId: process.env.PRODUCT_ID_COACH!,
    amount: 12900, // $129.00
    interval: "month",
    name: "Coach/Agency",
    description: "Unlimited everything + team features",
  },
  coach_yearly: {
    priceId: process.env.PRICE_ID_COACH_YEAR!,
    productId: process.env.PRODUCT_ID_COACH!,
    amount: 99900, // $999.00
    interval: "year",
    name: "Coach/Agency",
    description: "Unlimited everything + team features",
  },
} as const

export type StripePlanKey = keyof typeof STRIPE_PLANS

// Helper function to get plan details
export function getPlanDetails(planKey: StripePlanKey) {
  return STRIPE_PLANS[planKey]
}

// Helper function to format price
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100)
}

// Helper function to get plan name from plan key
export function getPlanName(planKey: StripePlanKey): string {
  return STRIPE_PLANS[planKey].name
}

// Helper function to get plan description from plan key
export function getPlanDescription(planKey: StripePlanKey): string {
  return STRIPE_PLANS[planKey].description
}
