import { createClient } from "@supabase/supabase-js"
import { getUserSubscription, getUserUsage, canUserPerformAction, type PlanType } from "@/lib/subscription"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export interface SubscriptionCheckResult {
  allowed: boolean
  reason?: string
  currentPlan?: string
  usage?: {
    interviews_used?: number
    cover_letters_used?: number
    interviews_limit?: number
    cover_letters_limit?: number
    resume_credits_remaining?: number
  }
  upgradeRequired?: boolean
}

export async function checkSubscriptionAccess(
  userId: string,
  action: "interview" | "cover_letter" | "template_access" | "export_pdf" | "resume",
): Promise<SubscriptionCheckResult> {
  console.log(`[Subscription Guard] Checking access for user ${userId}, action: ${action}`)
  
  if (!userId || typeof userId !== "string") {
    console.log(`[Subscription Guard] Invalid user ID: ${userId}`)
    return {
      allowed: false,
      reason: "Invalid user ID",
      upgradeRequired: false,
    }
  }

  if (!action || typeof action !== "string") {
    console.log(`[Subscription Guard] Invalid action: ${action}`)
    return {
      allowed: false,
      reason: "Invalid action",
      upgradeRequired: false,
    }
  }

  try {
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

    console.log(`[Subscription Guard] Subscription:`, subscription)
    console.log(`[Subscription Guard] Usage:`, usage)

    if (!subscription) {
      console.log(`[Subscription Guard] No subscription found for user ${userId}`)
      return {
        allowed: false,
        reason: "No active subscription found",
        upgradeRequired: true,
      }
    }

    if (subscription.status !== "active") {
      console.log(`[Subscription Guard] Subscription status is ${subscription.status} for user ${userId}`)
      return {
        allowed: false,
        reason: `Subscription is ${subscription.status}`,
        currentPlan: subscription.plan_name,
        upgradeRequired: true,
      }
    }

    // Special logic for one-time Starter plan
    if (subscription.plan_name === "starter") {
      if (action === "template_access" || action === "export_pdf") {
        return {
          allowed: true,
          currentPlan: "starter",
        }
      }

      if (action === "interview" && usage && usage.interviews_used >= 1) {
        return {
          allowed: false,
          reason: "You've used your one-time interview session",
          currentPlan: "starter",
          usage: {
            interviews_used: usage.interviews_used,
            cover_letters_used: usage.cover_letters_used || 0,
            interviews_limit: 1,
            cover_letters_limit: 0,
          },
          upgradeRequired: true,
        }
      }

      if (action === "cover_letter") {
        return {
          allowed: false,
          reason: "Cover letters are not included in the Starter plan",
          currentPlan: "starter",
          upgradeRequired: true,
        }
      }

      if (action === "resume") {
        const credits = usage?.resume_credits_remaining ?? 0
        if (credits <= 0) {
          return {
            allowed: false,
            reason: "No resume credits remaining",
            currentPlan: "starter",
            upgradeRequired: true,
          }
        }

        return {
          allowed: true,
          currentPlan: "starter",
          usage: {
            resume_credits_remaining: credits,
          },
        }
      }
    }

    // General plan: free access for templates and PDFs
    if (action === "template_access" || action === "export_pdf") {
      return {
        allowed: true,
        currentPlan: subscription.plan_name,
      }
    }

    // Resume check for non-starter plans
    if (action === "resume") {
      const credits = usage?.resume_credits_remaining ?? 0
      if (credits <= 0) {
        return {
          allowed: false,
          reason: "No resume credits remaining",
          currentPlan: subscription.plan_name,
          upgradeRequired: true,
          usage: {
            resume_credits_remaining: credits,
          },
        }
      }

      return {
        allowed: true,
        currentPlan: subscription.plan_name,
        usage: {
          resume_credits_remaining: credits,
        },
      }
    }

    // Regular checks for interview and cover letter
    const accessCheck = await canUserPerformAction(userId, action)

    if (!accessCheck.allowed) {
      const result = {
        allowed: false,
        reason: accessCheck.reason,
        currentPlan: subscription.plan_name,
        usage: usage
          ? {
              interviews_used: usage.interviews_used,
              cover_letters_used: usage.cover_letters_used || 0,
              interviews_limit: getActionLimit(subscription.plan_name as PlanType, "interview"),
              cover_letters_limit: getActionLimit(subscription.plan_name as PlanType, "cover_letter"),
            }
          : undefined,
        upgradeRequired: true,
      }
      console.log(`[Subscription Guard] Access DENIED for user ${userId}, action: ${action}`, result)
      return result
    }

    const result = {
      allowed: true,
      currentPlan: subscription.plan_name,
      usage: usage
        ? {
            interviews_used: usage.interviews_used,
            cover_letters_used: usage.cover_letters_used || 0,
            interviews_limit: getActionLimit(subscription.plan_name as PlanType, "interview"),
            cover_letters_limit: getActionLimit(subscription.plan_name as PlanType, "cover_letter"),
            resume_credits_remaining: usage.resume_credits_remaining ?? 0,
          }
        : undefined,
    }
    
    console.log(`[Subscription Guard] Access GRANTED for user ${userId}, action: ${action}`, result)
    return result
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
    starter: { interview: 1, cover_letter: 0 }, // One-time purchase, 1 interview
    pro: { interview: 10, cover_letter: 0 },
    career: { interview: 30, cover_letter: 3 },
    coach: { interview: -1, cover_letter: -1 },
  }

  return limits[planName]?.[action] ?? 0
}

export async function checkAndIncrementUsage(
  userId: string,
  action: "interview" | "cover_letter" | "resume"
): Promise<{ success: boolean; error?: string }> {
  const accessCheck = await checkSubscriptionAccess(userId, action)

  if (!accessCheck.allowed) {
    return {
      success: false,
      error: accessCheck.reason || "Access denied",
    }
  }

  try {
    const monthYear = new Date().toISOString().slice(0, 7)

    // Special logic for Starter plan interview: decrement resume_credits_remaining
    if (action === "interview") {
      // Fetch subscription to check plan
      const { data: subData, error: subError } = await supabaseAdmin
        .from("subscriptions")
        .select("plan_name")
        .eq("user_id", userId)
        .eq("status", "active")
        .single()

      if (subError || !subData) {
        console.error("Failed to fetch subscription for usage increment:", subError)
        return { success: false, error: "Subscription not found" }
      }

      if (subData.plan_name === "starter") {
        // Fetch current usage
        const { data: usageData, error: fetchError } = await supabaseAdmin
          .from("usage_tracking")
          .select("interviews_used, resume_credits_remaining")
          .eq("user_id", userId)
          .eq("month_year", monthYear)
          .single()

        if (fetchError || usageData.resume_credits_remaining == null) {
          console.error("Failed to fetch resume credits for starter interview:", fetchError)
          return { success: false, error: "Resume credits not found" }
        }

        console.log(`[Starter Interview Usage] BEFORE: interviews_used=${usageData.interviews_used}, resume_credits_remaining=${usageData.resume_credits_remaining}`)

        if (usageData.resume_credits_remaining <= 0) {
          return { success: false, error: "No interview credits remaining" }
        }

        // Update both interviews_used and resume_credits_remaining
        const { data: updatedUsage, error: updateError } = await supabaseAdmin
          .from("usage_tracking")
          .update({
            interviews_used: usageData.interviews_used + 1,
            resume_credits_remaining: usageData.resume_credits_remaining - 1,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("month_year", monthYear)
          .select()
          .single()

        if (updateError) {
          console.error("Error updating starter interview usage:", updateError)
          return { success: false, error: "Failed to update interview usage" }
        }

        console.log(`[Starter Interview Usage] AFTER: interviews_used=${updatedUsage.interviews_used}, resume_credits_remaining=${updatedUsage.resume_credits_remaining}`)

        return { success: true }
      }
    }

    if (action === "resume") {
      // Manual decrement of resume credits
      const { data: usageData, error: fetchError } = await supabaseAdmin
        .from("usage_tracking")
        .select("resume_credits_remaining")
        .eq("user_id", userId)
        .eq("month_year", monthYear)
        .single()

      if (fetchError || usageData.resume_credits_remaining == null) {
        console.error("Failed to fetch resume usage data:", fetchError)
        return { success: false, error: "Resume usage not found" }
      }

      if (usageData.resume_credits_remaining <= 0) {
        return { success: false, error: "No resume credits remaining" }
      }

      const { error: updateError } = await supabaseAdmin
        .from("usage_tracking")
        .update({
          resume_credits_remaining: usageData.resume_credits_remaining - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("month_year", monthYear)

      if (updateError) {
        console.error("Error decrementing resume credits:", updateError)
        return { success: false, error: "Failed to update resume usage" }
      }

      return { success: true }
    }

    // RPC call for interview or cover letter (non-starter)
    const { error } = await supabaseAdmin.rpc("increment_usage", {
      p_user_id: userId,
      p_month_year: monthYear,
      p_action: action,
    })

    if (error) {
      console.error("Error incrementing usage:", error)
      return { success: false, error: "Failed to update usage" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in checkAndIncrementUsage:", error)
    return { success: false, error: "Internal error" }
  }
}
