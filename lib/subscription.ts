import { supabase } from "./supabase"

// ============================================================================
// CLEAN OBJECT-ORIENTED SUBSCRIPTION SYSTEM
// ============================================================================
// 
// Example usage:
// 
// const userPlan = await createUserPlan(userId, userEmail)
// 
// // Check if user can use a feature
// const canUseInterview = userPlan.canUseFeature("interview")
// if (canUseInterview.allowed) {
//   // User can use interview
//   await incrementUsage(userId, "interview")
// } else {
//   // Show error: canUseInterview.reason
// }
// 
// // Get usage info
// const usageInfo = userPlan.getUsageInfo("interview")
// console.log(`${usageInfo.used}/${usageInfo.limit} interviews used`)
// 
// // Check if usage is depleted
// if (userPlan.isUsageDepleted("interview")) {
//   // Show upgrade prompt
// }
// ============================================================================

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
  resume_credits_remaining?: number
  created_at: string
  updated_at: string
}

// Admin emails with unlimited usage
export const ADMIN_EMAILS = [
  "jatoujoseph@gmail.com",
  "admin@resumepilot.ca",
  "support@resumepilot.ca",
  "info@resumepilot.ca",
  "gurvir899@outlook.com",
]

// Plan limits matching the pricing page exactly
export const PLAN_LIMITS = {
  starter: {
    interviews: 1, // One-time purchase, 1 interview
    coverLetters: 0, // No cover letters in starter
    templates: 1, // Jake's Template only
    features: ["basic_ats", "pdf_export", "star_xyz_format"],
  },
  pro: {
    interviews: 10,
    coverLetters: 0, // No cover letters in pro
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

// Feature types
export type FeatureType = "interview" | "cover_letter" | "template_access" | "export_pdf"

// Usage class to track feature usage
export class Usage {
  constructor(
    public interviews: number = 0,
    public coverLetters: number = 0,
    public resume_credits_remaining: number = 0 // Add this property
  ) {}

  get(feature: FeatureType): number {
    switch (feature) {
      case "interview":
        return this.interviews
      case "cover_letter":
        return this.coverLetters
      case "template_access":
      case "export_pdf":
        return 0 // These don't track usage
      default:
        return 0
    }
  }

  increment(feature: FeatureType): void {
    switch (feature) {
      case "interview":
        this.interviews++
        break
      case "cover_letter":
        this.coverLetters++
        break
      case "template_access":
      case "export_pdf":
        // These don't increment usage
        break
    }
  }

  hasRemaining(feature: FeatureType, limit: number): boolean {
    if (limit === -1) return true // unlimited
    if (feature === "template_access" || feature === "export_pdf") {
      return true // These features don't have usage limits
    }
    return this.get(feature) < limit
  }

  getRemaining(feature: FeatureType, limit: number): number {
    if (limit === -1) return -1 // unlimited
    if (feature === "template_access" || feature === "export_pdf") {
      return -1 // These features don't have usage limits
    }
    return Math.max(0, limit - this.get(feature))
  }

  getPercentage(feature: FeatureType, limit: number): number {
    if (limit === -1) return 0 // unlimited
    if (feature === "template_access" || feature === "export_pdf") {
      return 0 // These features don't track usage percentage
    }
    return Math.min((this.get(feature) / limit) * 100, 100)
  }
}

// Plan class to manage plan limits and features
export class Plan {
  constructor(
    public name: string,
    public limits: {
      interviews: number
      coverLetters: number
      templates: number
      features: readonly string[]
    }
  ) {}

  getLimit(feature: FeatureType): number {
    switch (feature) {
      case "interview":
        return this.limits.interviews
      case "cover_letter":
        return this.limits.coverLetters
      case "template_access":
        return this.limits.templates
      case "export_pdf":
        return 1 // All plans with templates can export PDF
      default:
        return 0
    }
  }

  hasFeature(feature: FeatureType): boolean {
    const limit = this.getLimit(feature)
    return limit > 0 || limit === -1
  }

  canUseFeature(feature: FeatureType, usage: Usage): boolean {
    // Special logic for Starter plan interviews: use resume_credits_remaining
    if (this.name === "starter" && feature === "interview") {
      return usage.resume_credits_remaining > 0
    }
    if (!this.hasFeature(feature)) return false
    
    // For non-usage features, just check if the plan has the feature
    if (feature === "template_access" || feature === "export_pdf") {
      return this.hasFeature(feature)
    }
    
    // For usage-based features, check remaining usage
    return usage.hasRemaining(feature, this.getLimit(feature))
  }

  getRemainingUsage(feature: FeatureType, usage: Usage): number {
    return usage.getRemaining(feature, this.getLimit(feature))
  }

  getUsageMessage(feature: FeatureType, usage: Usage): string {
    const limit = this.getLimit(feature)
    const used = usage.get(feature)
    
    if (limit === -1) return "Unlimited"
    if (limit === 0) return "Not included in your plan"
    return `${used} / ${limit}`
  }

  getDepletionMessage(feature: FeatureType): string {
    const limit = this.getLimit(feature)
    if (limit === 0) {
      switch (feature) {
        case "cover_letter":
          return "Cover letters are not included in your plan"
        case "template_access":
          return "Template access is not included in your plan"
        case "export_pdf":
          return "PDF export is not included in your plan"
        default:
          return "This feature is not included in your plan"
      }
    }
    return `You've used all ${limit} ${feature === "interview" ? "interviews" : "cover letters"} this month`
  }
}

// User class to manage user's plan and usage
export class UserPlan {
  constructor(
    public subscription: Subscription | null,
    public usage: Usage,
    public isAdmin: boolean = false
  ) {}

  getPlan(): Plan | null {
    if (!this.subscription) return null
    
    const planLimits = PLAN_LIMITS[this.subscription.plan_name as PlanType]
    if (!planLimits) return null
    
    return new Plan(this.subscription.plan_name, planLimits)
  }

  canUseFeature(feature: FeatureType): { allowed: boolean; reason?: string } {
    // Admin users have unlimited access
    if (this.isAdmin) {
      return { allowed: true }
    }

    // No subscription
    if (!this.subscription) {
      return { allowed: false, reason: "No active subscription" }
    }

    if (this.subscription.status !== "active") {
      return { allowed: false, reason: `Subscription is ${this.subscription.status}` }
    }

    const plan = this.getPlan()
    if (!plan) {
      return { allowed: false, reason: "Invalid plan" }
    }

    // Special logic for Starter plan interviews: use resume_credits_remaining
    if (plan.name === "starter" && feature === "interview") {
      if (this.usage.resume_credits_remaining > 0) {
        return { allowed: true }
      } else {
        return { allowed: false, reason: "No interview credits remaining" }
      }
    }

    // For non-usage features, just check if plan has the feature
    if (feature === "template_access" || feature === "export_pdf") {
      if (!plan.hasFeature(feature)) {
        return { allowed: false, reason: `${feature.replace('_', ' ')} is not included in your plan` }
      }
      return { allowed: true }
    }

    // For usage-based features, check remaining usage
    if (!plan.canUseFeature(feature, this.usage)) {
      return { allowed: false, reason: plan.getDepletionMessage(feature) }
    }

    return { allowed: true }
  }

  getUsageInfo(feature: FeatureType): {
    used: number
    limit: number
    remaining: number
    percentage: number
    message: string
  } {
    const plan = this.getPlan()
    if (!plan) {
      return {
        used: 0,
        limit: 0,
        remaining: 0,
        percentage: 0,
        message: "No plan"
      }
    }

    const used = this.usage.get(feature)
    const limit = plan.getLimit(feature)
    const remaining = plan.getRemainingUsage(feature, this.usage)
    const percentage = this.usage.getPercentage(feature, limit)

    return {
      used,
      limit,
      remaining,
      percentage,
      message: plan.getUsageMessage(feature, this.usage)
    }
  }

  isUsageDepleted(feature?: FeatureType): boolean {
    if (this.isAdmin) return false
    
    const plan = this.getPlan()
    if (!plan) return true

    if (feature) {
      return !plan.canUseFeature(feature, this.usage)
    }

    // Check all features
    return !plan.canUseFeature("interview", this.usage) || 
           !plan.canUseFeature("cover_letter", this.usage)
  }
}

// Check if user has admin privileges
export function isAdminUser(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

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

// Create UserPlan instance
export async function createUserPlan(userId: string, userEmail?: string): Promise<UserPlan> {
  const [subscription, usageData] = await Promise.all([
    getUserSubscription(userId),
    getUserUsage(userId)
  ])

  const usage = new Usage(
    usageData?.interviews_used || 0,
    usageData?.cover_letters_used || 0,
    usageData?.resume_credits_remaining || 0 // Pass resume_credits_remaining
  )

  const isAdmin = userEmail ? isAdminUser(userEmail) : false

  return new UserPlan(subscription, usage, isAdmin)
}

// Simplified function for backward compatibility
export async function canUserPerformAction(
  userId: string,
  action: FeatureType,
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: userData } = await supabase.auth.getUser()
  const userPlan = await createUserPlan(userId, userData?.user?.email)
  
  return userPlan.canUseFeature(action)
}

// Increment usage
export async function incrementUsage(userId: string, action: FeatureType): Promise<boolean> {
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

// Get plan details for display
export function getPlanDetails(planName: string) {
  return PLAN_LIMITS[planName as PlanType]
}

// Check if user has unlimited access (admin or coach plan)
export async function hasUnlimitedAccess(userId: string): Promise<boolean> {
  // Check for admin privileges first
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (!userError && userData?.user?.email && isAdminUser(userData.user.email)) {
    return true
  }

  // Check subscription
  const subscription = await getUserSubscription(userId)
  if (!subscription) return false

  return subscription.plan_name === "coach"
}

// Get remaining usage for display (backward compatibility)
export async function getRemainingUsage(userId: string): Promise<{
  interviews: { used: number; limit: number; remaining: number }
  coverLetters: { used: number; limit: number; remaining: number }
}> {
  const userPlan = await createUserPlan(userId)
  const plan = userPlan.getPlan()
  
  if (!plan) {
    return {
      interviews: { used: 0, limit: 0, remaining: 0 },
      coverLetters: { used: 0, limit: 0, remaining: 0 },
    }
  }

  const interviewInfo = userPlan.getUsageInfo("interview")
  const coverLetterInfo = userPlan.getUsageInfo("cover_letter")

  return {
    interviews: {
      used: interviewInfo.used,
      limit: interviewInfo.limit,
      remaining: interviewInfo.remaining,
    },
    coverLetters: {
      used: coverLetterInfo.used,
      limit: coverLetterInfo.limit,
      remaining: coverLetterInfo.remaining,
    },
  }
}
