import { supabase } from "./supabase"

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  plan_name: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface UsageTracking {
  id: string
  user_id: string
  month_year: string
  interviews_used: number
  cover_letters_used: number
  created_at: string
  updated_at: string
}

// Plan limits
export const PLAN_LIMITS = {
  starter: {
    interviews: 5000, // Temporarily increased for testing
    coverLetters: 0,
    templates: 1,
    features: ["basic_ats", "pdf_export", "star_xyz_format"],
  },
  pro: {
    interviews: 10,
    coverLetters: 0,
    templates: -1, // unlimited
    features: ["advanced_ats", "pdf_export", "linkedin_export", "analytics", "star_xyz_format"],
  },
  career: {
    interviews: 30,
    coverLetters: 3,
    templates: -1,
    features: [
      "advanced_ats",
      "pdf_export",
      "linkedin_export",
      "analytics",
      "role_matching",
      "ai_coach",
      "star_xyz_format",
    ],
  },
  coach: {
    interviews: -1, // unlimited
    coverLetters: -1,
    templates: -1,
    features: ["all_features", "whitelabel", "api_access", "custom_branding", "star_xyz_format"],
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS

// Get user's current subscription
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    // First check for active subscriptions
    const { data: activeSubscriptions, error: activeError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)

    if (activeError) {
      console.error("Error fetching active subscription:", activeError)
      return null
    }

    // If we found an active subscription, return it
    if (activeSubscriptions && activeSubscriptions.length > 0) {
      return activeSubscriptions[0]
    }

    // If no active subscription, check for any subscription (might be inactive)
    const { data: anySubscription, error: anyError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (anyError) {
      console.error("Error fetching any subscription:", anyError)
      return null
    }

    // Return the first (most recent) subscription or null if none found
    return anySubscription && anySubscription.length > 0 ? anySubscription[0] : null
  } catch (error) {
    console.error("Error in getUserSubscription:", error)
    return null
  }
}

// Get user's current usage for this month
export async function getUserUsage(userId: string): Promise<UsageTracking | null> {
  const currentMonth = new Date().toISOString().slice(0, 7) // "2024-01"

  const { data, error } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("month_year", currentMonth)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching usage:", error)
    return null
  }

  // Return existing usage or create a default structure
  return data && data.length > 0
    ? data[0]
    : {
        id: "",
        user_id: userId,
        month_year: currentMonth,
        interviews_used: 0,
        cover_letters_used: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
}

// Check if user can perform an action
export async function canUserPerformAction(
  userId: string,
  action: "interview" | "cover_letter",
): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getUserSubscription(userId)
  const usage = await getUserUsage(userId)

  if (!subscription) {
    return { allowed: false, reason: "No active subscription" }
  }

  if (!usage) {
    return { allowed: false, reason: "Unable to fetch usage data" }
  }

  // Special handling for starter plan (one-time purchase) - temporarily increased limit for testing
  if (subscription.plan_name === "starter") {
    if (action === "interview") {
      if (usage.interviews_used >= 5000) {
        return { allowed: false, reason: "You've reached your interview limit (5000)" }
      }
      return { allowed: true }
    }

    if (action === "cover_letter") {
      return { allowed: false, reason: "Cover letters are not included in the Starter plan" }
    }
  }

  const planLimits = PLAN_LIMITS[subscription.plan_name as PlanType]
  if (!planLimits) {
    return { allowed: false, reason: "Invalid plan" }
  }

  if (action === "interview") {
    const limit = planLimits.interviews
    if (limit === -1) return { allowed: true } // unlimited
    if (usage.interviews_used >= limit) {
      return { allowed: false, reason: `Monthly interview limit reached (${limit})` }
    }
  }

  if (action === "cover_letter") {
    const limit = planLimits.coverLetters
    if (limit === -1) return { allowed: true } // unlimited
    if (limit === 0) return { allowed: false, reason: "Cover letters not included in your plan" }
    if (usage.cover_letters_used >= limit) {
      return { allowed: false, reason: `Monthly cover letter limit reached (${limit})` }
    }
  }

  return { allowed: true }
}

// Increment usage
export async function incrementUsage(userId: string, action: "interview" | "cover_letter"): Promise<boolean> {
  const currentMonth = new Date().toISOString().slice(0, 7)

  const { error } = await supabase.rpc("increment_usage", {
    p_user_id: userId,
    p_month_year: currentMonth,
    p_action: action,
  })

  if (error) {
    console.error("Error incrementing usage:", error)
    return false
  }

  return true
}
