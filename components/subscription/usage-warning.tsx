"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/auth/auth-provider"
import { AlertTriangle, TrendingUp, Crown } from "lucide-react"
import { useRouter } from "next/navigation"
import { getUserSubscription, getUserUsage, PLAN_LIMITS } from "@/lib/subscription"

interface UsageWarningProps {
  action?: "interview" | "cover_letter"
  showAlways?: boolean
}

export function UsageWarning({ action, showAlways = false }: UsageWarningProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [usage, setUsage] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUsageData()
    }
  }, [user])

  const fetchUsageData = async () => {
    if (!user) return

    try {
      const [subData, usageData] = await Promise.all([getUserSubscription(user.id), getUserUsage(user.id)])

      setSubscription(subData)
      setUsage(usageData)
    } catch (error) {
      console.error("Error fetching usage data:", error)
      // Set default values instead of failing
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

  if (loading || !user || !subscription || !usage) {
    return null
  }

  const planLimits = PLAN_LIMITS[subscription.plan_name as keyof typeof PLAN_LIMITS]
  if (!planLimits) return null

  const interviewsUsed = usage.interviews_used || 0
  const coverLettersUsed = usage.cover_letters_used || 0

  const interviewsLimit = planLimits.interviews
  const coverLettersLimit = planLimits.coverLetters

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const interviewPercentage = getUsagePercentage(interviewsUsed, interviewsLimit)
  const coverLetterPercentage = getUsagePercentage(coverLettersUsed, coverLettersLimit)

  // Determine if we should show warning
  const shouldShowWarning = () => {
    if (showAlways) return true

    if (action === "interview") {
      return interviewPercentage >= 80 || interviewsUsed >= interviewsLimit
    }

    if (action === "cover_letter") {
      return coverLetterPercentage >= 80 || coverLettersUsed >= coverLettersLimit
    }

    // Show if any usage is high
    return interviewPercentage >= 80 || coverLetterPercentage >= 80
  }

  if (!shouldShowWarning()) {
    return null
  }

  const isAtLimit =
    (action === "interview" && interviewsUsed >= interviewsLimit) ||
    (action === "cover_letter" && coverLettersUsed >= coverLettersLimit)

  const getWarningMessage = () => {
    if (isAtLimit) {
      return `You've reached your monthly ${action === "interview" ? "interview" : "cover letter"} limit.`
    }

    if (action === "interview" && interviewPercentage >= 80) {
      return `You're approaching your monthly interview limit (${interviewsUsed}/${interviewsLimit}).`
    }

    if (action === "cover_letter" && coverLetterPercentage >= 80) {
      return `You're approaching your monthly cover letter limit (${coverLettersUsed}/${coverLettersLimit}).`
    }

    return "You're approaching your monthly usage limits."
  }

  const getUpgradeRecommendation = () => {
    switch (subscription.plan_name) {
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
    <Alert className={`border-2 ${isAtLimit ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}`}>
      <AlertTriangle className={`h-4 w-4 ${isAtLimit ? "text-red-600" : "text-orange-600"}`} />
      <AlertDescription className="space-y-4">
        <div>
          <p className={`font-medium ${isAtLimit ? "text-red-800" : "text-orange-800"}`}>{getWarningMessage()}</p>
        </div>

        {/* Usage Progress */}
        <div className="space-y-3">
          {action !== "cover_letter" && interviewsLimit !== -1 && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Voice Interviews</span>
                <span>
                  {interviewsUsed} / {interviewsLimit}
                </span>
              </div>
              <Progress value={interviewPercentage} className="h-2" />
            </div>
          )}

          {action !== "interview" && coverLettersLimit > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Cover Letters</span>
                <span>
                  {coverLettersUsed} / {coverLettersLimit}
                </span>
              </div>
              <Progress value={coverLetterPercentage} className="h-2" />
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
