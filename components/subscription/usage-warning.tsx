"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/auth/auth-provider"
import { AlertTriangle, TrendingUp, Crown } from "lucide-react"
import { useRouter } from "next/navigation"
import { createUserPlan, type FeatureType } from "@/lib/subscription"

interface UsageWarningProps {
  action?: FeatureType
  showAlways?: boolean
}

export function UsageWarning({ action, showAlways = false }: UsageWarningProps) {
  const { user } = useAuth()
  const router = useRouter()
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
      const plan = await createUserPlan(user.id, user.email)
      setUserPlan(plan)
    } catch (error) {
      console.error("Error fetching user plan:", error)
      setUserPlan(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !user || !userPlan) {
    return null
  }

  // Admin users don't need warnings
  if (userPlan.isAdmin) {
    return null
  }

  const plan = userPlan.getPlan()
  if (!plan) return null

  // Check if we should show warning
  const shouldShowWarning = () => {
    if (showAlways) return true

    if (action) {
      return userPlan.isUsageDepleted(action)
    }

    // Show if any usage is depleted
    return userPlan.isUsageDepleted()
  }

  if (!shouldShowWarning()) {
    return null
  }

  const getWarningMessage = () => {
    if (action) {
      return plan.getDepletionMessage(action)
    }

    const interviewDepleted = userPlan.isUsageDepleted("interview")
    const coverLetterDepleted = userPlan.isUsageDepleted("cover_letter")

    if (interviewDepleted && coverLetterDepleted) {
      return "You've used all your monthly allowances."
    }

    return "You're out of monthly usage."
  }

  const getUpgradeRecommendation = () => {
    const planName = userPlan.subscription?.plan_name || "starter"
    
    switch (planName) {
      case "starter":
        return { plan: "Pro", price: "$39/month", features: "10 interviews/month + all templates" }
      case "pro":
        return { plan: "Career+", price: "$59/month", features: "30 interviews + 3 cover letters/month" }
      case "career":
        return { plan: "Coach", price: "$129/month", features: "Unlimited everything + team features" }
      default:
        return { plan: "Pro", price: "$39/month", features: "10 interviews/month + all templates" }
    }
  }

  const recommendation = getUpgradeRecommendation()

  return (
    <Alert className="border-2 border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="space-y-4">
        <div>
          <p className="font-medium text-red-800">{getWarningMessage()}</p>
        </div>

        {/* Usage Progress */}
        <div className="space-y-3">
          {plan.limits.interviews > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Voice Interviews</span>
                <span>
                  {plan.getUsageMessage("interview", userPlan.usage)}
                  {plan.limits.interviews === -1 && " (∞)"}
                </span>
              </div>
              <Progress 
                value={userPlan.usage.getPercentage("interview", plan.limits.interviews)} 
                className="h-2" 
              />
            </div>
          )}

          {plan.limits.coverLetters > 0 && (
            <div className="space-y-1">
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
            </div>
          )}
        </div>

        {/* Upgrade CTA */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Upgrade to {recommendation.plan}</p>
              <p className="text-sm text-gray-600">{recommendation.features}</p>
            </div>
          </div>
          <div className="text-right">
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600"
              onClick={() => router.push("/pricing")}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              {recommendation.price}
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
