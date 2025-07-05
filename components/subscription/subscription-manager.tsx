"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import {
  createUserPlan,
  type FeatureType,
} from "@/lib/subscription"
import { CreditCard, Calendar, TrendingUp, AlertCircle, Crown, Infinity } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface SubscriptionManagerProps {
  onUpgrade?: () => void
}

export function SubscriptionManager({ onUpgrade }: SubscriptionManagerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [userPlan, setUserPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserPlan()
    }
  }, [user])

  const fetchUserPlan = async () => {
    if (!user) return

    try {
      // Log payment history for debugging
      console.log("=== PAYMENT HISTORY DEBUG ===")
      console.log("User Email:", user.email)
      console.log("User ID:", user.id)
      
      // Fetch payment history from database
      const response = await fetch("/api/subscription/debug-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      
      if (response.ok) {
        const paymentData = await response.json()
        console.log("Database Payments:", paymentData.payments)
        console.log("Stripe Payments:", paymentData.stripePayments)
        
        // Show detailed Stripe payment info
        if (paymentData.stripePayments && paymentData.stripePayments.length > 0) {
          console.log("=== DETAILED STRIPE PAYMENT INFO ===")
          paymentData.stripePayments.forEach((payment: any, index: number) => {
            console.log(`Payment ${index + 1}:`, {
              id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              created: payment.created,
              customer_email: payment.customer_email,
              customer_id: payment.customer_id,
              metadata: payment.metadata,
              type: payment.type || 'payment_intent'
            })
          })
          console.log("=== END DETAILED STRIPE PAYMENT INFO ===")
        }
      } else {
        console.log("Failed to fetch payment history")
      }
      console.log("=== END PAYMENT HISTORY DEBUG ===")

      const plan = await createUserPlan(user.id, user.email)
      setUserPlan(plan)
    } catch (error) {
      console.error("Error fetching user plan:", error)
      setUserPlan(null)
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    if (!user) return

    try {
      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      window.location.href = url
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      })
    }
  }

  const handleUpgrade = async (planKey: string, billingCycle = "monthly") => {
    if (!user) return

    try {
      const stripe = await stripePromise
      if (!stripe) throw new Error("Stripe not loaded")

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey,
          userId: user.id,
          billingCycle,
        }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId })
      if (stripeError) {
        throw new Error(stripeError.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start upgrade process",
        variant: "destructive",
      })
    }
  }

  const handleManualFix = async () => {
    if (!user) return

    try {
      const response = await fetch("/api/subscription/manual-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Subscription Fixed",
          description: data.message,
          variant: "default",
        })
        // Refresh the user plan
        await fetchUserPlan()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fix subscription",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fixing subscription:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleDebugUsage = async () => {
    if (!user) return

    try {
      const response = await fetch("/api/subscription/debug-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("=== USAGE DEBUG DATA ===")
        console.log("User Info:", data.userInfo)
        console.log("Current Month:", data.currentMonth)
        console.log("Current Month Usage:", data.currentMonthUsage)
        console.log("All Usage Records:", data.allUsage)
        console.log("=== END USAGE DEBUG DATA ===")
        
        toast({
          title: "Usage Data Logged",
          description: "Check browser console for detailed usage information",
          variant: "default",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch usage data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching usage data:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleResetUsage = async () => {
    if (!user) return

    try {
      const response = await fetch("/api/subscription/reset-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Usage Reset",
          description: "Your usage has been reset to 0",
          variant: "default",
        })
        // Refresh the user plan
        await fetchUserPlan()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to reset usage",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error resetting usage:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleSyncPayments = async () => {
    if (!user) return

    try {
      const response = await fetch("/api/subscription/sync-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("=== PAYMENT SYNC RESULTS ===")
        console.log("User Info:", data.userInfo)
        console.log("Results:", data.results)
        console.log("Synced Payments:", data.syncedPayments)
        console.log("Synced Subscriptions:", data.syncedSubscriptions)
        console.log("=== END PAYMENT SYNC RESULTS ===")
        
        toast({
          title: "Payments Synced",
          description: `Synced ${data.results.paymentsSynced} payments and created ${data.results.subscriptionsCreated} subscriptions`,
          variant: "default",
        })
        // Refresh the user plan
        await fetchUserPlan()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to sync payments",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error syncing payments:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Admin users get special view
  if (userPlan?.isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="w-5 h-5 mr-2 text-yellow-500" />
            Admin Access
          </CardTitle>
          <CardDescription>You have unlimited access to all features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Infinity className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Unlimited Everything</span>
            </div>
            <p className="text-sm text-yellow-700">
              As an admin user, you have unlimited access to all features including interviews, cover letters, and templates.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Voice Interviews</span>
              <span className="flex items-center">
                <Infinity className="w-4 h-4 mr-1" />
                Unlimited
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Cover Letters</span>
              <span className="flex items-center">
                <Infinity className="w-4 h-4 mr-1" />
                Unlimited
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Templates</span>
              <span className="flex items-center">
                <Infinity className="w-4 h-4 mr-1" />
                All Available
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!userPlan?.subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
            No Active Subscription
          </CardTitle>
          <CardDescription>You don't have an active subscription. Choose a plan to get started.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={onUpgrade} className="w-full">
            View Plans
          </Button>
          <Button 
            variant="outline" 
            onClick={handleManualFix} 
            className="w-full"
          >
            Fix Missing Subscription (Debug)
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDebugUsage} 
            className="w-full"
          >
            Debug Usage Data
          </Button>
          <Button 
            variant="outline" 
            onClick={handleResetUsage} 
            className="w-full"
          >
            Reset Usage (Debug)
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSyncPayments} 
            className="w-full"
          >
            Sync Payments (Debug)
          </Button>
        </CardContent>
      </Card>
    )
  }

  const plan = userPlan.getPlan()
  if (!plan) return null

  const formatPlanName = (planName: string) => {
    return planName.charAt(0).toUpperCase() + planName.slice(1)
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                {formatPlanName(userPlan.subscription.plan_name)} Plan
              </CardTitle>
              <CardDescription>
                <Badge variant={userPlan.subscription.status === "active" ? "default" : "destructive"} className="mt-1">
                  {userPlan.subscription.status}
                </Badge>
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleManageBilling}>
              Manage Billing
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {userPlan.subscription.current_period_end && (
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              {userPlan.subscription.cancel_at_period_end ? "Cancels" : "Renews"} on{" "}
              {new Date(userPlan.subscription.current_period_end).toLocaleDateString()}
            </div>
          )}

          {userPlan.subscription.cancel_at_period_end && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                Your subscription will cancel at the end of the current period. You'll retain access until then.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Usage This Month
          </CardTitle>
          <CardDescription>Track your monthly usage and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Interviews */}
          {plan.limits.interviews > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Voice Interviews</span>
                <span>
                  {/* Starter plan: usage is 1 - resume_credits_remaining out of 1 */}
                  {plan.name === "starter"
                    ? `${1 - (userPlan.usage.resume_credits_remaining ?? 0)} / 1`
                    : plan.getUsageMessage("interview", userPlan.usage)}
                  {plan.limits.interviews === -1 && " (∞)"}
                </span>
              </div>
              <Progress 
                value={plan.name === "starter"
                  ? (1 - (userPlan.usage.resume_credits_remaining ?? 0)) * 100
                  : userPlan.usage.getPercentage("interview", plan.limits.interviews)
                }
                className="h-2" 
              />
              {/* Depletion message for Starter plan */}
              {plan.name === "starter"
                ? (userPlan.usage.resume_credits_remaining ?? 0) <= 0 && (
                    <p className="text-sm text-red-600">You've used all your interviews this month</p>
                  )
                : userPlan.isUsageDepleted("interview") && (
                    <p className="text-sm text-red-600">You've used all your interviews this month</p>
                  )}
            </div>
          )}

          {/* Cover Letters */}
          {plan.limits.coverLetters > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cover Letters</span>
                <span>
                  {plan.getUsageMessage("cover_letter", userPlan.usage)}
                  {plan.limits.coverLetters === -1 && " (∞)"}
                </span>
              </div>
              <Progress 
                value={userPlan.usage.getPercentage("cover_letter", plan.limits.coverLetters)} 
                className="h-2" 
              />
              {userPlan.isUsageDepleted("cover_letter") && (
                <p className="text-sm text-red-600">You've used all your cover letters this month</p>
              )}
            </div>
          )}

          {/* Upgrade suggestion */}
          {(plan.name === "starter"
            ? (userPlan.usage.resume_credits_remaining ?? 0) <= 0
            : userPlan.isUsageDepleted()) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">You've used all your monthly allowances!</p>
              <Button size="sm" onClick={onUpgrade}>
                Upgrade Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Upgrade Options */}
      {userPlan.subscription.plan_name !== "coach" && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>Get more features and higher limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {userPlan.subscription.plan_name === "starter" && (
              <>
                <Button className="w-full justify-between" onClick={() => handleUpgrade("pro", "monthly")}>
                  <span>Upgrade to Pro</span>
                  <span>$39/month</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleUpgrade("pro", "yearly")}
                >
                  <span>Upgrade to Pro (Yearly)</span>
                  <span>$299/year</span>
                </Button>
              </>
            )}
            {userPlan.subscription.plan_name === "pro" && (
              <>
                <Button className="w-full justify-between" onClick={() => handleUpgrade("career", "monthly")}>
                  <span>Upgrade to Career+</span>
                  <span>$59/month</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleUpgrade("career", "yearly")}
                >
                  <span>Upgrade to Career+ (Yearly)</span>
                  <span>$449/year</span>
                </Button>
              </>
            )}
            {userPlan.subscription.plan_name === "career" && (
              <Button className="w-full justify-between" onClick={() => handleUpgrade("coach", "monthly")}>
                <span>Upgrade to Coach/Agency</span>
                <span>$129/month</span>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Debug Section */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Tools</CardTitle>
          <CardDescription>Developer tools for troubleshooting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            onClick={handleDebugUsage} 
            className="w-full"
          >
            Debug Usage Data
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSyncPayments} 
            className="w-full"
          >
            Sync Payments
          </Button>
          <Button 
            variant="outline" 
            onClick={handleResetUsage} 
            className="w-full"
          >
            Reset Usage
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
