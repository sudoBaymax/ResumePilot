import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId && !email) {
      return NextResponse.json({ error: "User ID or email required" }, { status: 400 })
    }

    let targetUserId = userId

    if (!targetUserId && email) {
      // Get user ID from email first
      const { data: userData, error: userError } = await supabaseAdmin
        .from("auth.users")
        .select("id")
        .eq("email", email)
        .single()

      if (userError || !userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      targetUserId = userData.id
    }

    console.log(`[Sync Payments] Starting sync for user: ${email || targetUserId}`)

    // 1. Get Stripe customer ID for this user
    const { data: existingSubscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", targetUserId)
      .single()

    let stripeCustomerId = existingSubscription?.stripe_customer_id

    if (!stripeCustomerId) {
      // Try to find customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1,
      })

      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id
        console.log(`[Sync Payments] Found Stripe customer: ${stripeCustomerId}`)
      } else {
        return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 })
      }
    }

    // 2. Get all payments for this customer
    const payments = await stripe.paymentIntents.list({
      customer: stripeCustomerId,
      limit: 100,
    })

    console.log(`[Sync Payments] Found ${payments.data.length} Stripe payments`)

    const syncedPayments = []
    const syncedSubscriptions = []

    // 3. Process each payment
    for (const payment of payments.data) {
      if (payment.status === "succeeded") {
        // Check if payment already exists in database
        const { data: existingPayment } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("stripe_payment_intent_id", payment.id)
          .single()

        if (!existingPayment) {
          // Insert payment into database (without stripe_customer_id column)
          const { data: newPayment, error: paymentError } = await supabaseAdmin
            .from("payments")
            .insert({
              user_id: targetUserId,
              stripe_payment_intent_id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              created_at: new Date(payment.created * 1000).toISOString(),
            })
            .select()
            .single()

          if (paymentError) {
            console.error(`[Sync Payments] Error inserting payment ${payment.id}:`, paymentError)
          } else {
            syncedPayments.push(newPayment)
            console.log(`[Sync Payments] Synced payment: ${payment.id}`)
          }
        }

        // Check if subscription exists for this payment
        const { data: existingSub } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("user_id", targetUserId)
          .eq("status", "active")
          .single()

        if (!existingSub) {
          // Determine plan from payment amount (handle both USD and CAD)
          let planName = "starter"
          let resumeCredits = 1

          // Handle different currencies and amounts
          if (payment.currency === "cad") {
            // CAD amounts
            switch (payment.amount) {
              case 900: // $9.00 CAD
                planName = "starter"
                resumeCredits = 1
                break
              case 3900: // $39.00 CAD
                planName = "pro"
                resumeCredits = 10
                break
              case 5900: // $59.00 CAD
                planName = "career"
                resumeCredits = 30
                break
              case 12900: // $129.00 CAD
                planName = "coach"
                resumeCredits = 1000000
                break
              default:
                console.log(`[Sync Payments] Unknown CAD payment amount: ${payment.amount}, defaulting to starter`)
                planName = "starter"
                resumeCredits = 1
            }
          } else {
            // USD amounts
            switch (payment.amount) {
              case 999: // $9.99 USD
                planName = "starter"
                resumeCredits = 1
                break
              case 3900: // $39.00 USD
                planName = "pro"
                resumeCredits = 10
                break
              case 5900: // $59.00 USD
                planName = "career"
                resumeCredits = 30
                break
              case 12900: // $129.00 USD
                planName = "coach"
                resumeCredits = 1000000
                break
              default:
                console.log(`[Sync Payments] Unknown USD payment amount: ${payment.amount}, defaulting to starter`)
                planName = "starter"
                resumeCredits = 1
            }
          }

          // Create subscription
          const { data: newSubscription, error: subError } = await supabaseAdmin
            .from("subscriptions")
            .insert({
              user_id: targetUserId,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: null, // One-time payment
              stripe_price_id: null,
              plan_name: planName,
              status: "active",
              current_period_start: new Date(payment.created * 1000).toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
              cancel_at_period_end: false,
            })
            .select()
            .single()

          if (subError) {
            console.error(`[Sync Payments] Error creating subscription:`, subError)
          } else {
            syncedSubscriptions.push(newSubscription)
            console.log(`[Sync Payments] Created subscription: ${planName}`)

            // Initialize usage tracking
            const { error: usageError } = await supabaseAdmin
              .from("usage_tracking")
              .upsert({
                user_id: targetUserId,
                month_year: new Date().toISOString().slice(0, 7),
                interviews_used: 0,
                cover_letters_used: 0,
                resume_credits_remaining: resumeCredits,
                updated_at: new Date().toISOString(),
              })

            if (usageError) {
              console.error(`[Sync Payments] Error initializing usage:`, usageError)
            } else {
              console.log(`[Sync Payments] Initialized usage with ${resumeCredits} credits`)
            }
          }
        }
      }
    }

    return NextResponse.json({
      message: "Payment sync completed",
      userInfo: {
        userId: targetUserId,
        email: email || null,
        stripeCustomerId,
      },
      results: {
        paymentsSynced: syncedPayments.length,
        subscriptionsCreated: syncedSubscriptions.length,
        totalStripePayments: payments.data.length,
      },
      syncedPayments,
      syncedSubscriptions,
    })

  } catch (error) {
    console.error("Error in sync payments endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 