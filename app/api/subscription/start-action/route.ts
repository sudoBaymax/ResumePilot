import { type NextRequest, NextResponse } from "next/server"
import { checkAndIncrementUsage } from "@/lib/middleware/subscription-guard"

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    if (!["interview", "cover_letter"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const result = await checkAndIncrementUsage(userId, action)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error starting action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
