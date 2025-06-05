import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Map Stripe price IDs to plan names using environment variables
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
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log(`Processing Stripe webhook event: ${event.type}`)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        console.log("Processing checkout.session.completed event")
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const planNameFromMetadata = session.metadata?.planName

  if (!userId) {
    console.error("Missing userId in checkout session metadata")
    return
  }

  console.log(`Processing checkout for user ${userId}`)

  try {
    // Get the actual price ID from the session to determine the plan
    let actualPriceId: string | undefined
    let actualPlanName: string

    if (session.mode === "payment") {
      // For one-time payments, get price from line items
      const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      })
      actualPriceId = sessionWithLineItems.line_items?.data[0]?.price?.id
    } else if (session.mode === "subscription" && session.subscription) {
      // For subscriptions, get price from subscription
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      actualPriceId = subscription.items.data[0]?.price?.id
    }

    // Determine plan name from price ID
    if (actualPriceId && STRIPE_PRICE_TO_PLAN[actualPriceId]) {
      actualPlanName = STRIPE_PRICE_TO_PLAN[actualPriceId]
      console.log(`Determined plan: ${actualPlanName} from price ID: ${actualPriceId}`)
    } else {
      // Fallback to metadata
      actualPlanName = planNameFromMetadata || "starter"
      console.log(`Using fallback plan: ${actualPlanName} (price ID: ${actualPriceId})`)
    }

    // Record payment for both one-time and subscription payments
    if (session.payment_intent) {
      const { error: paymentError } = await supabaseAdmin.from("payments").insert({
        user_id: userId,
        stripe_payment_intent_id: session.payment_intent as string,
        amount: session.amount_total!,
        currency: session.currency!,
        status: "succeeded",
        plan_name: actualPlanName,
        stripe_price_id: actualPriceId,
      })

      if (paymentError) {
        console.error("Error recording payment:", paymentError)
      } else {
        console.log(`Payment recorded for user ${userId}, amount: ${session.amount_total}`)
      }
    }

    // Handle subscription creation/update
    if (session.mode === "payment") {
      // One-time payment (starter plan)
      await createOrUpdateSubscription(userId, actualPlanName, {
        stripe_customer_id: session.customer as string,
        stripe_price_id: actualPriceId,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year for one-time
        cancel_at_period_end: false,
      })
    } else if (session.mode === "subscription" && session.subscription) {
      // Recurring subscription
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      await updateSubscriptionInDatabase(subscription, userId, actualPlanName)
    }

    // Initialize/reset usage tracking
    const { error: usageError } = await supabaseAdmin.from("usage_tracking").upsert({
      user_id: userId,
      month_year: new Date().toISOString().slice(0, 7),
      interviews_used: 0,
      cover_letters_used: 0,
      updated_at: new Date().toISOString(),
    })

    if (usageError) {
      console.error("Error initializing usage tracking:", usageError)
    }

    console.log(`Successfully processed checkout for user ${userId}, plan ${actualPlanName}`)
  } catch (error) {
    console.error("Error in handleCheckoutCompleted:", error)
    // Don't throw - we don't want to fail the webhook
  }
}

async function createOrUpdateSubscription(
  userId: string,
  planName: string,
  subscriptionData: {
    stripe_customer_id?: string
    stripe_subscription_id?: string
    stripe_price_id?: string
    status: string
    current_period_start: string
    current_period_end: string
    cancel_at_period_end: boolean
  },
) {
  // Check if subscription already exists
  const { data: existingSubscription } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  const fullSubscriptionData = {
    user_id: userId,
    plan_name: planName,
    updated_at: new Date().toISOString(),
    ...subscriptionData,
  }

  if (existingSubscription) {
    // Update existing subscription
    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update(fullSubscriptionData)
      .eq("id", existingSubscription.id)

    if (updateError) {
      console.error("Error updating subscription:", updateError)
    } else {
      console.log(`Successfully updated subscription for user ${userId} to plan ${planName}`)
    }
  } else {
    // Create new subscription
    const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
      ...fullSubscriptionData,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("Error creating subscription:", insertError)
    } else {
      console.log(`Successfully created subscription for user ${userId} with plan ${planName}`)
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  let userId = subscription.metadata?.userId

  if (!userId) {
    // Try to find user by customer ID
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer as string)
      .single()

    if (data) {
      userId = data.user_id
    } else {
      console.error("Could not find user for subscription update")
      return
    }
  }

  // Determine plan name from price ID
  const priceId = subscription.items.data[0]?.price?.id
  const planName = priceId && STRIPE_PRICE_TO_PLAN[priceId] ? STRIPE_PRICE_TO_PLAN[priceId] : "unknown"

  await updateSubscriptionInDatabase(subscription, userId, planName)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)

    // Determine plan name from price ID
    const priceId = subscription.items.data[0]?.price?.id
    const planName = priceId && STRIPE_PRICE_TO_PLAN[priceId] ? STRIPE_PRICE_TO_PLAN[priceId] : "unknown"

    await updateSubscriptionInDatabase(subscription, undefined, planName)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", invoice.subscription as string)
  }
}

async function updateSubscriptionInDatabase(subscription: Stripe.Subscription, userId?: string, planName?: string) {
  const subscriptionData = {
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0]?.price.id,
    plan_name: planName || "unknown",
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }

  if (userId) {
    // Create or update subscription for specific user
    await createOrUpdateSubscription(userId, planName || "unknown", {
      stripe_customer_id: subscriptionData.stripe_customer_id,
      stripe_subscription_id: subscriptionData.stripe_subscription_id,
      stripe_price_id: subscriptionData.stripe_price_id,
      status: subscriptionData.status,
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
    })
  } else {
    // Update existing subscription by stripe_subscription_id
    await supabaseAdmin.from("subscriptions").update(subscriptionData).eq("stripe_subscription_id", subscription.id)
  }
}
