import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdminUser } from "@/lib/subscription"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if user is admin
    if (!isAdminUser(user.email)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get total users count
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from("auth.users")
      .select("*", { count: "exact", head: true })

    if (usersError) {
      console.error("Error fetching total users:", usersError)
    }

    // Get active subscriptions count
    const { count: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")

    if (subsError) {
      console.error("Error fetching active subscriptions:", subsError)
    }

    // Get total revenue
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("status", "succeeded")

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError)
    }

    const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0

    // Get monthly revenue (current month)
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: monthlyPayments, error: monthlyPaymentsError } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("status", "succeeded")
      .gte("created_at", `${currentMonth}-01T00:00:00Z`)
      .lt("created_at", `${currentMonth}-31T23:59:59Z`)

    if (monthlyPaymentsError) {
      console.error("Error fetching monthly payments:", monthlyPaymentsError)
    }

    const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0

    // Get plan distribution
    const { data: planDistribution, error: planError } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_name")
      .eq("status", "active")

    if (planError) {
      console.error("Error fetching plan distribution:", planError)
    }

    const planCounts = planDistribution?.reduce((acc, sub) => {
      acc[sub.plan_name] = (acc[sub.plan_name] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const planDistributionArray = Object.entries(planCounts).map(([plan_name, count]) => ({
      plan_name,
      count,
    }))

    // Get recent subscriptions
    const { data: recentSubscriptions, error: recentError } = await supabaseAdmin
      .from("admin_subscription_overview")
      .select("*")
      .order("subscription_created", { ascending: false })
      .limit(10)

    if (recentError) {
      console.error("Error fetching recent subscriptions:", recentError)
    }

    const stats = {
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      totalRevenue: Math.round(totalRevenue / 100), // Convert cents to dollars
      monthlyRevenue: Math.round(monthlyRevenue / 100), // Convert cents to dollars
      planDistribution: planDistributionArray,
      recentSubscriptions: recentSubscriptions || [],
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error in admin stats API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 