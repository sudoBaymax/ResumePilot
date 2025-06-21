import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { stripe } from "@/lib/stripe"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Map Stripe price IDs to plan names
const STRIPE_PRICE_TO_PLAN: Record<string, string> = {
  [process.env.PRICE_ID_STARTER!]: "starter",
  [process.env.PRICE_ID_PRO_MONTH!]: "pro",
  [process.env.PRICE_ID_PRO_YEAR!]: "pro",
  [process.env.PRICE_ID_CAREER_MONTH!]: "career",
  [process.env.PRICE_ID_CAREER_YEAR!]: "career",
  [process.env.PRICE_ID_COACH_MONTH!]: "coach",
  [process.env.PRICE_ID_COACH_YEAR!]: "coach",
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verify user
    const supabaseUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = user.id

    // Step 1: Check if user already has an active subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle()

    if (existingSubscription) {
      // Even if subscription exists, ensure it's properly set to active
      const { data: updatedSubscription, error: updateError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSubscription.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating existing subscription:", updateError)
      }

      // Reset usage tracking
      await supabaseAdmin.from("usage_tracking").upsert({
        user_id: userId,
        month_year: new Date().toISOString().slice(0, 7),
        interviews_used: 0,
        cover_letters_used: 0,
        updated_at: new Date().toISOString(),
      })

      return NextResponse.json({
        message: "Subscription already active, usage reset",
        subscription: updatedSubscription || existingSubscription,
        planName: existingSubscription.plan_name,
      })
    }

    // Step 2: Look for payment records to determine what they paid for
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)

    let determinedPlan = "pro" // Default to pro since you mentioned you paid for pro
    let stripeCustomerId: string | null = null

    if (payments && payments.length > 0) {
      const latestPayment = payments[0]

      // If we have a stripe_price_id, use that to determine the plan
      if (latestPayment.stripe_price_id && STRIPE_PRICE_TO_PLAN[latestPayment.stripe_price_id]) {
        determinedPlan = STRIPE_PRICE_TO_PLAN[latestPayment.stripe_price_id]
      } else if (latestPayment.plan_name) {
        // Fallback to stored plan name
        determinedPlan = latestPayment.plan_name
      }

      // Try to get customer ID from Stripe using the payment intent
      if (latestPayment.stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(latestPayment.stripe_payment_intent_id)
          stripeCustomerId = paymentIntent.customer as string
        } catch (error) {
          console.error("Error retrieving payment intent:", error)
        }
      }
    }

    // Step 3: Create or update subscription
    const subscriptionData = {
      user_id: userId,
      plan_name: determinedPlan,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
      ...(stripeCustomerId && { stripe_customer_id: stripeCustomerId }),
    }

    // Delete any existing subscriptions first to avoid conflicts
    await supabaseAdmin.from("subscriptions").delete().eq("user_id", userId)

    // Create new subscription
    const { data: newSubscription, error: insertError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        ...subscriptionData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating subscription:", insertError)
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
    }

    // Step 4: Reset usage tracking
    await supabaseAdmin.from("usage_tracking").upsert({
      user_id: userId,
      month_year: new Date().toISOString().slice(0, 7),
      interviews_used: 0,
      cover_letters_used: 0,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: `Subscription fixed successfully. Plan set to: ${determinedPlan}`,
      subscription: newSubscription,
      planName: determinedPlan,
      determinationMethod: payments && payments.length > 0 ? "payment_history" : "default",
    })
  } catch (error) {
    console.error("Error in smart subscription fix:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
