import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { userId, planName = "starter" } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (existingSubscription) {
      return NextResponse.json({
        message: "User already has an active subscription",
        subscription: existingSubscription,
      })
    }

    // Create a new subscription record for the user
    const { data: newSubscription, error } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_name: planName,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating subscription:", error)
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
    }

    // Initialize usage tracking for the user
    await supabaseAdmin.from("usage_tracking").upsert({
      user_id: userId,
      month_year: new Date().toISOString().slice(0, 7),
      interviews_used: 0,
      cover_letters_used: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Subscription created successfully",
      subscription: newSubscription,
    })
  } catch (error) {
    console.error("Error fixing subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
