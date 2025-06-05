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
    const { userId, planName = "starter" } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }

    // Verify the user exists
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user already has a subscription
    const { data: existingSubscription, error: checkError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking existing subscription:", checkError)
      return NextResponse.json({ error: "Failed to check existing subscription" }, { status: 500 })
    }

    if (existingSubscription && existingSubscription.status === "active") {
      return NextResponse.json({
        message: "User already has an active subscription",
        subscription: existingSubscription,
      })
    }

    // If there's an existing subscription but it's not active, update it
    if (existingSubscription) {
      const { data: updatedSubscription, error: updateError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_name: planName,
          status: "active",
          updated_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        })
        .eq("id", existingSubscription.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating subscription:", updateError)
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
      }

      // Initialize or reset usage tracking for the user
      await supabaseAdmin.from("usage_tracking").upsert({
        user_id: userId,
        month_year: new Date().toISOString().slice(0, 7),
        interviews_used: 0,
        cover_letters_used: 0,
        updated_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        message: "Subscription updated successfully",
        subscription: updatedSubscription,
      })
    }

    // Create a new subscription record using the service role
    const subscriptionData = {
      user_id: userId,
      plan_name: planName,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      cancel_at_period_end: false,
    }

    const { data: newSubscription, error: insertError } = await supabaseAdmin
      .from("subscriptions")
      .insert(subscriptionData)
      .select()
      .single()

    if (insertError) {
      console.error("Error creating subscription:", insertError)

      // If RLS is still blocking, try using a direct SQL query
      const { data: sqlResult, error: sqlError } = await supabaseAdmin.rpc("create_subscription_for_user", {
        p_user_id: userId,
        p_plan_name: planName,
        p_status: "active",
      })

      if (sqlError) {
        console.error("Error with SQL function:", sqlError)
        return NextResponse.json(
          {
            error: "Failed to create subscription. Please contact support.",
            details: insertError.message,
          },
          { status: 500 },
        )
      }

      // If SQL function worked, fetch the created subscription
      const { data: createdSubscription } = await supabaseAdmin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .single()

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
        message: "Subscription created successfully via SQL function",
        subscription: createdSubscription,
      })
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
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
