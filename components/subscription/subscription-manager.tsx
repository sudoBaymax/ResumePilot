"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import {
  getUserSubscription,
  getUserUsage,
  PLAN_LIMITS,
  type Subscription,
  type UsageTracking,
} from "@/lib/subscription"
import { CreditCard, Calendar, TrendingUp, AlertCircle } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface SubscriptionManagerProps {
  onUpgrade?: () => void
}

export function SubscriptionManager({ onUpgrade }: SubscriptionManagerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<UsageTracking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchSubscriptionData()
    }
  }, [user])

  const fetchSubscriptionData = async () => {
    if (!user) return

    try {
      const [subData, usageData] = await Promise.all([getUserSubscription(user.id), getUserUsage(user.id)])

      setSubscription(subData)
      setUsage(usageData)
    } catch (error) {
      console.error("Error fetching subscription data:", error)
      // Don't show error toast for missing subscription - this is normal for new users
      setSubscription(null)
      setUsage({
        id: "",
        user_id: user.id,
        month_year: new Date().toISOString().slice(0, 7),
        interviews_used: 0,
        cover_letters_used: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
            No Active Subscription
          </CardTitle>
          <CardDescription>You don't have an active subscription. Choose a plan to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onUpgrade} className="w-full">
            View Plans
          </Button>
        </CardContent>
      </Card>
    )
  }

  const planLimits = PLAN_LIMITS[subscription.plan_name as keyof typeof PLAN_LIMITS]
  const interviewsUsed = usage?.interviews_used || 0
  const coverLettersUsed = usage?.cover_letters_used || 0

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // unlimited
    return Math.min((used / limit) * 100, 100)
  }

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
                {formatPlanName(subscription.plan_name)} Plan
              </CardTitle>
              <CardDescription>
                <Badge variant={subscription.status === "active" ? "default" : "destructive"} className="mt-1">
                  {subscription.status}
                </Badge>
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleManageBilling}>
              Manage Billing
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription.current_period_end && (
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              {subscription.cancel_at_period_end ? "Cancels" : "Renews"} on{" "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </div>
          )}

          {subscription.cancel_at_period_end && (
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
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Voice Interviews</span>
              <span>
                {interviewsUsed} / {planLimits.interviews === -1 ? "∞" : planLimits.interviews}
              </span>
            </div>
            <Progress value={getUsagePercentage(interviewsUsed, planLimits.interviews)} className="h-2" />
          </div>

          {/* Cover Letters */}
          {planLimits.coverLetters > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cover Letters</span>
                <span>
                  {coverLettersUsed} / {planLimits.coverLetters === -1 ? "∞" : planLimits.coverLetters}
                </span>
              </div>
              <Progress value={getUsagePercentage(coverLettersUsed, planLimits.coverLetters)} className="h-2" />
            </div>
          )}

          {/* Upgrade suggestion */}
          {(getUsagePercentage(interviewsUsed, planLimits.interviews) > 80 ||
            getUsagePercentage(coverLettersUsed, planLimits.coverLetters) > 80) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">You're approaching your monthly limits!</p>
              <Button size="sm" onClick={onUpgrade}>
                Upgrade Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Upgrade Options */}
      {subscription.plan_name !== "coach" && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>Get more features and higher limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription.plan_name === "starter" && (
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
            {subscription.plan_name === "pro" && (
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
            {subscription.plan_name === "career" && (
              <Button className="w-full justify-between" onClick={() => handleUpgrade("coach", "monthly")}>
                <span>Upgrade to Coach/Agency</span>
                <span>$129/month</span>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
