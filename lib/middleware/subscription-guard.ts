import { createClient } from "@supabase/supabase-js"
import { getUserSubscription, getUserUsage, canUserPerformAction, type PlanType } from "@/lib/subscription"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export interface SubscriptionCheckResult {
  allowed: boolean
  reason?: string
  currentPlan?: string
  usage?: {
    interviews_used: number
    cover_letters_used: number
    interviews_limit: number
    cover_letters_limit: number
  }
  upgradeRequired?: boolean
}

export async function checkSubscriptionAccess(
  userId: string,
  action: "interview" | "cover_letter" | "template_access" | "export_pdf",
): Promise<SubscriptionCheckResult> {
  try {
    // Get user's subscription and usage
    const [subscription, usage] = await Promise.all([getUserSubscription(userId), getUserUsage(userId)])

    if (!subscription) {
      return {
        allowed: false,
        reason: "No active subscription found",
        upgradeRequired: true,
      }
    }

    // Check if subscription is active
    if (subscription.status !== "active") {
      return {
        allowed: false,
        reason: `Subscription is ${subscription.status}`,
        currentPlan: subscription.plan_name,
        upgradeRequired: true,
      }
    }

    // For basic actions like template access and PDF export, check plan features
    if (action === "template_access" || action === "export_pdf") {
      return {
        allowed: true,
        currentPlan: subscription.plan_name,
      }
    }

    // Check usage limits for interviews and cover letters
    const accessCheck = await canUserPerformAction(userId, action)

    if (!accessCheck.allowed) {
      return {
        allowed: false,
        reason: accessCheck.reason,
        currentPlan: subscription.plan_name,
        usage: usage
          ? {
              interviews_used: usage.interviews_used,
              cover_letters_used: usage.cover_letters_used,
              interviews_limit: getActionLimit(subscription.plan_name as PlanType, "interview"),
              cover_letters_limit: getActionLimit(subscription.plan_name as PlanType, "cover_letter"),
            }
          : undefined,
        upgradeRequired: true,
      }
    }

    return {
      allowed: true,
      currentPlan: subscription.plan_name,
      usage: usage
        ? {
            interviews_used: usage.interviews_used,
            cover_letters_used: usage.cover_letters_used,
            interviews_limit: getActionLimit(subscription.plan_name as PlanType, "interview"),
            cover_letters_limit: getActionLimit(subscription.plan_name as PlanType, "cover_letter"),
          }
        : undefined,
    }
  } catch (error) {
    console.error("Error checking subscription access:", error)
    return {
      allowed: false,
      reason: "Unable to verify subscription status",
      upgradeRequired: false,
    }
  }
}

function getActionLimit(planName: PlanType, action: "interview" | "cover_letter"): number {
  const limits = {
    starter: { interview: 1, cover_letter: 0 },
    pro: { interview: 10, cover_letter: 0 },
    career: { interview: 30, cover_letter: 3 },
    coach: { interview: -1, cover_letter: -1 },
  }

  return limits[planName]?.[action] ?? 0
}

// Server action to check access before performing actions
export async function checkAndIncrementUsage(
  userId: string,
  action: "interview" | "cover_letter",
): Promise<{ success: boolean; error?: string }> {
  const accessCheck = await checkSubscriptionAccess(userId, action)

  if (!accessCheck.allowed) {
    return {
      success: false,
      error: accessCheck.reason || "Access denied",
    }
  }

  // Increment usage
  try {
    const { error } = await supabaseAdmin.rpc("increment_usage", {
      p_user_id: userId,
      p_month_year: new Date().toISOString().slice(0, 7),
      p_action: action,
    })

    if (error) {
      console.error("Error incrementing usage:", error)
      return {
        success: false,
        error: "Failed to update usage",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in checkAndIncrementUsage:", error)
    return {
      success: false,
      error: "Internal error",
    }
  }
}
