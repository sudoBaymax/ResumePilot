import { type NextRequest, NextResponse } from "next/server"
import { checkSubscriptionAccess } from "@/lib/middleware/subscription-guard"

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const result = await checkSubscriptionAccess(userId, action)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error checking subscription access:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
