import { type NextRequest, NextResponse } from "next/server"
import { stripe, STRIPE_PLANS, type StripePlanKey } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"

// Create server-side Supabase client
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { planKey, userId, billingCycle } = await request.json()

    if (!planKey || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Determine the correct price ID based on plan and billing cycle
    let stripePlanKey: StripePlanKey
    if (planKey === "starter") {
      stripePlanKey = "starter"
    } else {
      const cycle = billingCycle === "yearly" ? "yearly" : "monthly"
      stripePlanKey = `${planKey}_${cycle}` as StripePlanKey
    }

    const planDetails = STRIPE_PLANS[stripePlanKey]
    if (!planDetails) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    // Create or get Stripe customer
    let customerId: string
    const { data: existingSubscription } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single()

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: user.user.email,
        metadata: {
          userId: userId,
        },
      })
      customerId = customer.id
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: planDetails.priceId,
          quantity: 1,
        },
      ],
      mode: planKey === "starter" ? "payment" : "subscription",
      success_url: `${request.nextUrl.origin}/dashboard?success=true&plan=${planKey}`,
      cancel_url: `${request.nextUrl.origin}/pricing?canceled=true`,
      metadata: {
        userId: userId,
        planName: planKey,
        billingCycle: billingCycle || "monthly",
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
