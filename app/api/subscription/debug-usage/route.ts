import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId && !email) {
      return NextResponse.json({ error: "User ID or email required" }, { status: 400 })
    }

    let query = supabaseAdmin
      .from("usage_tracking")
      .select("*")
      .order("month_year", { ascending: false })

    if (userId) {
      query = query.eq("user_id", userId)
    } else if (email) {
      // Get user ID from email first
      const { data: userData, error: userError } = await supabaseAdmin
        .from("auth.users")
        .select("id")
        .eq("email", email)
        .single()

      if (userError || !userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      query = query.eq("user_id", userData.id)
    }

    const { data: usageData, error } = await query

    if (error) {
      console.error("Error fetching usage data:", error)
      return NextResponse.json({ error: "Failed to fetch usage data" }, { status: 500 })
    }

    // Also get current month usage specifically
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: currentUsage, error: currentError } = await supabaseAdmin
      .from("usage_tracking")
      .select("*")
      .eq("user_id", userId || (email ? userData?.id : null))
      .eq("month_year", currentMonth)
      .single()

    return NextResponse.json({
      allUsage: usageData || [],
      currentMonthUsage: currentUsage || null,
      currentMonth: currentMonth,
      userInfo: {
        userId: userId || (email ? userData?.id : null),
        email: email || null
      }
    })

  } catch (error) {
    console.error("Error in debug usage endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 