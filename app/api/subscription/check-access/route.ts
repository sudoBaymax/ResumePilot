import { type NextRequest, NextResponse } from "next/server"
import { createUserPlan, type FeatureType } from "@/lib/subscription"

export async function POST(request: NextRequest) {
  try {
    // Parse request body safely
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          allowed: false,
          error: "Invalid request format",
          reason: "Request body must be valid JSON",
        },
        { status: 400 },
      )
    }

    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json(
        {
          allowed: false,
          error: "Missing required parameters",
          reason: "userId and action are required",
        },
        { status: 400 },
      )
    }

    // Validate action type
    const validActions: FeatureType[] = ["interview", "cover_letter"]
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          allowed: false,
          error: "Invalid action",
          reason: `Action must be one of: ${validActions.join(", ")}`,
        },
        { status: 400 },
      )
    }

    // Get user email for admin check
    const userEmail = body.userEmail || null

    // Create user plan and check access
    const userPlan = await createUserPlan(userId, userEmail)
    const result = userPlan.canUseFeature(action)

    return NextResponse.json({
      ...result,
      currentPlan: userPlan.subscription?.plan_name,
      usage: {
        interviews: userPlan.usage.interviews,
        coverLetters: userPlan.usage.coverLetters,
      }
    })
  } catch (error) {
    console.error("Error checking subscription access:", error)

    // Always return JSON, never plain text
    return NextResponse.json(
      {
        allowed: false,
        error: "Internal server error",
        reason: "Unable to verify subscription status",
        upgradeRequired: false,
      },
      { status: 500 },
    )
  }
}
