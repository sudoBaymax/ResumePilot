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
  const signature = request.headers.get("stripe-signature")

  console.log("Received webhook request")
  console.log("Signature:", signature ? "Present" : "Missing")
  console.log("Body length:", body.length)

  if (!signature) {
    console.error("Missing stripe-signature header")
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

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
        console.log("Processing customer.subscription.updated event")
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.deleted":
        console.log("Processing customer.subscription.deleted event")
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case "invoice.payment_succeeded":
        console.log("Processing invoice.payment_succeeded event")
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case "invoice.payment_failed":
        console.log("Processing invoice.payment_failed event")
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case "customer.subscription.created":
        console.log("Processing customer.subscription.created event")
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case "invoice.created":
        console.log("Processing invoice.created event")
        // This is informational, no action needed
        break

      case "payment_intent.succeeded":
        console.log("Processing payment_intent.succeeded event")
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case "payment_intent.payment_failed":
        console.log("Processing payment_intent.payment_failed event")
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
        // Don't fail for unhandled events, just log them
    }

    // Always return 200 for successful webhook processing
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("Error processing webhook:", error)
    // Return 500 for processing errors, but don't retry indefinitely
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const planNameFromMetadata = session.metadata?.planName

  console.log("Checkout session metadata:", session.metadata)
  console.log("User ID from metadata:", userId)
  console.log("Plan name from metadata:", planNameFromMetadata)

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
      console.log("One-time payment price ID:", actualPriceId)
    } else if (session.mode === "subscription" && session.subscription) {
      // For subscriptions, get price from subscription
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      actualPriceId = subscription.items.data[0]?.price?.id
      console.log("Subscription price ID:", actualPriceId)
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

    // Record payment
    if (session.payment_intent) {
      console.log("Recording payment in database")
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
      console.log("Creating one-time payment subscription")
      await createOrUpdateSubscription(userId, actualPlanName, {
        stripe_customer_id: session.customer as string,
        stripe_price_id: actualPriceId,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        cancel_at_period_end: false,
      })
    } else if (session.mode === "subscription" && session.subscription) {
      console.log("Creating recurring subscription")
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      await updateSubscriptionInDatabase(subscription, userId, actualPlanName)
    }

    // 🆕 Assign resume credits
    let resumeCredits = 0
    switch (actualPriceId) {
      case process.env.PRICE_ID_STARTER:
        resumeCredits = 1
        break
      case process.env.PRICE_ID_PRO_MONTH:
      case process.env.PRICE_ID_PRO_YEAR:
        resumeCredits = 10
        break
      case process.env.PRICE_ID_CAREER_MONTH:
      case process.env.PRICE_ID_CAREER_YEAR:
        resumeCredits = 30
        break
      case process.env.PRICE_ID_COACH_MONTH:
      case process.env.PRICE_ID_COACH_YEAR:
        resumeCredits = 1000000 // effectively unlimited
        break
      default:
        resumeCredits = 0
        break
    }

    // Initialize usage tracking with resume credits
    console.log("Initializing usage tracking with resume credits")
    const { error: usageError } = await supabaseAdmin.from("usage_tracking").upsert({
      user_id: userId,
      month_year: new Date().toISOString().slice(0, 7),
      interviews_used: 0,
      cover_letters_used: 0,
      resume_credits_remaining: resumeCredits,
      updated_at: new Date().toISOString(),
    })

    if (usageError) {
      console.error("Error initializing usage tracking:", usageError)
    } else {
      console.log(`Usage tracking initialized: ${resumeCredits} resume credits`)
    }

    console.log(`✅ Successfully processed checkout for user ${userId}, plan ${actualPlanName}`)
  } catch (error) {
    console.error("Error in handleCheckoutCompleted:", error)
    // Do not throw to avoid webhook retries
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
  try {
    // Check if subscription already exists
    const { data: existingSubscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_name: planName,
          stripe_customer_id: subscriptionData.stripe_customer_id || existingSubscription.stripe_customer_id,
          stripe_subscription_id: subscriptionData.stripe_subscription_id || existingSubscription.stripe_subscription_id,
          stripe_price_id: subscriptionData.stripe_price_id || existingSubscription.stripe_price_id,
          status: subscriptionData.status,
          current_period_start: subscriptionData.current_period_start,
          current_period_end: subscriptionData.current_period_end,
          cancel_at_period_end: subscriptionData.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSubscription.id)

      if (updateError) {
        console.error("Error updating subscription:", updateError)
      } else {
        console.log(`Updated subscription for user ${userId}`)
      }
    } else {
      // Create new subscription
      const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
        user_id: userId,
        plan_name: planName,
        stripe_customer_id: subscriptionData.stripe_customer_id,
        stripe_subscription_id: subscriptionData.stripe_subscription_id,
        stripe_price_id: subscriptionData.stripe_price_id,
        status: subscriptionData.status,
        current_period_start: subscriptionData.current_period_start,
        current_period_end: subscriptionData.current_period_end,
        cancel_at_period_end: subscriptionData.cancel_at_period_end,
      })

      if (insertError) {
        console.error("Error creating subscription:", insertError)
      } else {
        console.log(`Created new subscription for user ${userId}`)
      }
    }
  } catch (error) {
    console.error("Error in createOrUpdateSubscription:", error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("Subscription updated:", subscription.id)
  
  try {
    // Get user ID from customer metadata or subscription metadata
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    const userId = customer.metadata?.userId

    if (!userId) {
      console.error("No userId found in customer metadata")
      return
    }

    const priceId = subscription.items.data[0]?.price?.id
    const planName = priceId ? STRIPE_PRICE_TO_PLAN[priceId] : "pro"

    await updateSubscriptionInDatabase(subscription, userId, planName)
  } catch (error) {
    console.error("Error handling subscription update:", error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("Subscription deleted:", subscription.id)
  
  try {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscription.id)

    if (error) {
      console.error("Error updating subscription status:", error)
    }
  } catch (error) {
    console.error("Error handling subscription deletion:", error)
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("Subscription created:", subscription.id)
  
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    const userId = customer.metadata?.userId

    if (!userId) {
      console.error("No userId found in customer metadata")
      return
    }

    const priceId = subscription.items.data[0]?.price?.id
    const planName = priceId ? STRIPE_PRICE_TO_PLAN[priceId] : "pro"

    await updateSubscriptionInDatabase(subscription, userId, planName)
  } catch (error) {
    console.error("Error handling subscription creation:", error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("Payment succeeded for invoice:", invoice.id)
  
  try {
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
      await handleSubscriptionUpdated(subscription)
    }
  } catch (error) {
    console.error("Error handling payment succeeded:", error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("Payment failed for invoice:", invoice.id)
  
  try {
    if (invoice.subscription) {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", invoice.subscription)

      if (error) {
        console.error("Error updating subscription status:", error)
      }
    }
  } catch (error) {
    console.error("Error handling payment failed:", error)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("Payment intent succeeded:", paymentIntent.id)
  // This is handled by checkout.session.completed for most cases
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("Payment intent failed:", paymentIntent.id)
  
  try {
    const { error } = await supabaseAdmin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("stripe_payment_intent_id", paymentIntent.id)

    if (error) {
      console.error("Error updating payment status:", error)
    }
  } catch (error) {
    console.error("Error handling payment intent failed:", error)
  }
}

async function updateSubscriptionInDatabase(subscription: Stripe.Subscription, userId?: string, planName?: string) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    const actualUserId = userId || customer.metadata?.userId

    if (!actualUserId) {
      console.error("No userId found for subscription:", subscription.id)
      return
    }

    const actualPlanName = planName || STRIPE_PRICE_TO_PLAN[subscription.items.data[0]?.price?.id || ""] || "pro"

    const subscriptionData = {
      user_id: actualUserId,
      plan_name: actualPlanName,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price?.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }

    await supabaseAdmin.from("subscriptions").update(subscriptionData).eq("stripe_subscription_id", subscription.id);
  } catch (error) {
    console.error("Error updating subscription in database:", error)
  }
}
