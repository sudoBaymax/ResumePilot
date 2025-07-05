import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { stripe } from "@/lib/stripe"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 })
    }

    console.log(`[Debug Payments] Fetching payment history for user: ${email} (${userId})`)

    // Fetch payments from database
    const { data: dbPayments, error: dbError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (dbError) {
      console.error("Error fetching database payments:", dbError)
    }

    // Fetch payments from Stripe
    let stripePayments: any[] = []
    try {
      // First, find the customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 10,
      })

      if (customers.data.length > 0) {
        // Get payment intents for the first customer found
        const customer = customers.data[0]
        const paymentIntents = await stripe.paymentIntents.list({
          customer: customer.id,
          limit: 50,
        })

        stripePayments = paymentIntents.data.map(intent => ({
          id: intent.id,
          amount: intent.amount,
          currency: intent.currency,
          status: intent.status,
          created: new Date(intent.created * 1000).toISOString(),
          customer_email: email,
          customer_id: customer.id,
          metadata: intent.metadata,
        }))

        // Also get subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 10,
        })

        stripePayments.push(...subscriptions.data.map(sub => ({
          id: sub.id,
          type: 'subscription',
          status: sub.status,
          created: new Date(sub.created * 1000).toISOString(),
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          customer_email: email,
          customer_id: customer.id,
          items: sub.items.data.map(item => ({
            price_id: item.price.id,
            quantity: item.quantity,
          })),
        })))
      }
    } catch (stripeError) {
      console.error("Error fetching Stripe payments:", stripeError)
    }

    // Format database payments for console output
    const formattedDbPayments = dbPayments?.map(payment => ({
      id: payment.id,
      user_id: payment.user_id,
      stripe_payment_intent_id: payment.stripe_payment_intent_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      plan_name: payment.plan_name,
      stripe_price_id: payment.stripe_price_id,
      created_at: payment.created_at,
      billing_period_start: payment.billing_period_start,
      billing_period_end: payment.billing_period_end,
    })) || []

    console.log(`[Debug Payments] Found ${formattedDbPayments.length} database payments and ${stripePayments.length} Stripe payments`)

    return NextResponse.json({
      success: true,
      payments: formattedDbPayments,
      stripePayments: stripePayments,
      summary: {
        totalDbPayments: formattedDbPayments.length,
        totalStripePayments: stripePayments.length,
        userEmail: email,
        userId: userId,
      }
    })

  } catch (error) {
    console.error("Error in debug payments endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
} 