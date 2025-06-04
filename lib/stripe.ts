import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
})

// REPLACE THESE WITH YOUR ACTUAL STRIPE PRICE IDs
// Get these from: Stripe Dashboard → Products → [Product Name] → Pricing
export const STRIPE_PLANS = {
  starter: {
    priceId: "price_1QYourActualStarterPriceId", // Replace with your actual starter price ID
    productId: "prod_starter",
    amount: 900,
    interval: null,
  },
  pro_monthly: {
    priceId: "price_1QYourActualProMonthlyId", // Replace with your actual pro monthly price ID
    productId: "prod_pro",
    amount: 3900,
    interval: "month",
  },
  pro_yearly: {
    priceId: "price_1QYourActualProYearlyId", // Replace with your actual pro yearly price ID
    productId: "prod_pro",
    amount: 29900,
    interval: "year",
  },
  career_monthly: {
    priceId: "price_1QYourActualCareerMonthlyId", // Replace with your actual career monthly price ID
    productId: "prod_career",
    amount: 5900,
    interval: "month",
  },
  career_yearly: {
    priceId: "price_1QYourActualCareerYearlyId", // Replace with your actual career yearly price ID
    productId: "prod_career",
    amount: 44900,
    interval: "year",
  },
  coach_monthly: {
    priceId: "price_1QYourActualCoachMonthlyId", // Replace with your actual coach monthly price ID
    productId: "prod_coach",
    amount: 12900,
    interval: "month",
  },
  coach_yearly: {
    priceId: "price_1QYourActualCoachYearlyId", // Replace with your actual coach yearly price ID
    productId: "prod_coach",
    amount: 99900,
    interval: "year",
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
