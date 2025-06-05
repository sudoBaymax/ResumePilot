import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Create a client with the user's token
    const supabaseUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // Set the user's session
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { planName = "starter" } = await request.json()
    const userId = user.id

    // Check if user already has a subscription using admin client
    const { data: existingSubscription, error: checkError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking existing subscription:", checkError)
    }

    if (existingSubscription && existingSubscription.status === "active") {
      return NextResponse.json({
        message: "User already has an active subscription",
        subscription: existingSubscription,
      })
    }

    // Use admin client to create/update subscription
    const subscriptionData = {
      user_id: userId,
      plan_name: planName,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
    }

    let subscription
    if (existingSubscription) {
      // Update existing subscription
      const { data: updatedSubscription, error: updateError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_name: planName,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSubscription.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating subscription:", updateError)
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
      }
      subscription = updatedSubscription
    } else {
      // Create new subscription
      const { data: newSubscription, error: insertError } = await supabaseAdmin
        .from("subscriptions")
        .insert(subscriptionData)
        .select()
        .single()

      if (insertError) {
        console.error("Error creating subscription:", insertError)
        return NextResponse.json(
          {
            error: "Failed to create subscription",
            details: insertError.message,
          },
          { status: 500 },
        )
      }
      subscription = newSubscription
    }

    // Initialize usage tracking
    await supabaseAdmin.from("usage_tracking").upsert({
      user_id: userId,
      month_year: new Date().toISOString().slice(0, 7),
      interviews_used: 0,
      cover_letters_used: 0,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Subscription fixed successfully",
      subscription,
    })
  } catch (error) {
    console.error("Error fixing subscription:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
