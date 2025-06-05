import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

const STRIPE_PLANS = {
  pro_monthly: { priceId: "price_123456" },
  pro_yearly: { priceId: "price_654321" },
  // Add other plans here
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
  const planName = session.metadata?.planName
  const billingCycle = session.metadata?.billingCycle

  if (!userId || !planName) {
    console.error("Missing metadata in checkout session")
    return
  }

  // For one-time payments (starter plan)
  if (session.mode === "payment") {
    // Record payment
    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: session.amount_total!,
      currency: session.currency!,
      status: "succeeded",
      plan_name: planName,
    })

    // Create subscription record for starter plan with active status
    await supabaseAdmin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: session.customer as string,
      plan_name: planName,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Set a far future end date for one-time purchases
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    })

    console.log(`Successfully processed one-time payment for user ${userId}, plan ${planName}`)
  } else if (session.mode === "subscription") {
    // Handle subscription creation
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    await updateSubscriptionInDatabase(subscription, userId, planName)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    // Try to find user by customer ID
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer as string)
      .single()

    if (!data) {
      console.error("Could not find user for subscription update")
      return
    }
  }

  await updateSubscriptionInDatabase(subscription, userId)
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
    await updateSubscriptionInDatabase(subscription)
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
    plan_name: planName || getPlanNameFromPriceId(subscription.items.data[0]?.price.id),
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }

  if (userId) {
    await supabaseAdmin.from("subscriptions").upsert({
      user_id: userId,
      ...subscriptionData,
    })
  } else {
    await supabaseAdmin.from("subscriptions").update(subscriptionData).eq("stripe_subscription_id", subscription.id)
  }
}

function getPlanNameFromPriceId(priceId?: string): string {
  for (const [planKey, planData] of Object.entries(STRIPE_PLANS)) {
    if (planData.priceId === priceId) {
      return planKey.split("_")[0] // Extract base plan name (e.g., "pro" from "pro_monthly")
    }
  }
  return "unknown"
}
