import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createUserPlan } from "@/lib/subscription"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ allowed: false, reason: "Missing authorization header" }, { status: 401 })
  }

  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return NextResponse.json({ allowed: false, reason: "Invalid token" }, { status: 401 })
  }

  const userPlan = await createUserPlan(user.id, user.email)

  const { allowed, reason } = userPlan.canUseFeature("interview")

  return NextResponse.json({ allowed, reason })
}
