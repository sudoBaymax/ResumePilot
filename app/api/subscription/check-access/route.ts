import { type NextRequest, NextResponse } from "next/server"
import { checkSubscriptionAccess } from "@/lib/middleware/subscription-guard"

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
    const validActions = ["interview", "cover_letter", "template_access", "export_pdf"]
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

    const result = await checkSubscriptionAccess(userId, action)
    return NextResponse.json(result)
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
