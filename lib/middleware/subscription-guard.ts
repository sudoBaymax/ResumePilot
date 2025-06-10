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
  // Add input validation
  if (!userId || typeof userId !== "string") {
    return {
      allowed: false,
      reason: "Invalid user ID",
      upgradeRequired: false,
    }
  }

  if (!action || typeof action !== "string") {
    return {
      allowed: false,
      reason: "Invalid action",
      upgradeRequired: false,
    }
  }

  try {
    try {
      // Get user's subscription and usage
      const [subscription, usage] = await Promise.all([
        getUserSubscription(userId).catch((err) => {
          console.error("Error getting user subscription:", err)
          return null
        }),
        getUserUsage(userId).catch((err) => {
          console.error("Error getting user usage:", err)
          return null
        }),
      ])

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

      // Special handling for starter plan (one-time purchase)
      if (subscription.plan_name === "starter") {
        // For starter plan, allow template access and PDF export
        if (action === "template_access" || action === "export_pdf") {
          return {
            allowed: true,
            currentPlan: "starter",
          }
        }

        // For interview, check if they've used their interview limit (5000 for testing)
        if (action === "interview" && usage && usage.interviews_used >= 5000) {
          return {
            allowed: false,
            reason: "You've used your one-time interview session",
            currentPlan: "starter",
            usage: {
              interviews_used: usage.interviews_used,
              cover_letters_used: usage.cover_letters_used || 0,
              interviews_limit: 5000,
              cover_letters_limit: 0,
            },
            upgradeRequired: true,
          }
        }

        // For cover letter, deny access for starter plan
        if (action === "cover_letter") {
          return {
            allowed: false,
            reason: "Cover letters are not included in the Starter plan",
            currentPlan: "starter",
            upgradeRequired: true,
          }
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
  } catch (error) {
    console.error("Outer try-catch error:", error)
    return {
      allowed: false,
      reason: "An unexpected error occurred",
      upgradeRequired: false,
    }
  }
}

function getActionLimit(planName: PlanType, action: "interview" | "cover_letter"): number {
  const limits = {
    starter: { interview: 5000, cover_letter: 0 }, // Temporarily increased for testing
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
