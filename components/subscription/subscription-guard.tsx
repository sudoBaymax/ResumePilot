"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, Crown, Zap, ArrowRight, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import type { SubscriptionCheckResult } from "@/lib/middleware/subscription-guard"

interface SubscriptionGuardProps {
  action: "interview" | "cover_letter" | "template_access" | "export_pdf"
  children: React.ReactNode
  fallback?: React.ReactNode
  onAccessDenied?: () => void
}

export function SubscriptionGuard({ action, children, fallback, onAccessDenied }: SubscriptionGuardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [accessResult, setAccessResult] = useState<SubscriptionCheckResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      checkAccess()
    }
  }, [user, action])

  const checkAccess = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/subscription/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action }),
      })

      const result = await response.json()
      setAccessResult(result)

      if (!result.allowed && onAccessDenied) {
        onAccessDenied()
      }
    } catch (error) {
      console.error("Error checking access:", error)
      toast({
        title: "Error",
        description: "Unable to verify subscription access",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6 text-center space-y-4">
          <Lock className="w-12 h-12 text-orange-500 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-900">Sign In Required</h3>
          <p className="text-gray-600">Please sign in to access this feature</p>
          <Button onClick={() => router.push("/?signin=true")}>Sign In</Button>
        </CardContent>
      </Card>
    )
  }

  if (!accessResult?.allowed) {
    if (fallback) {
      return <>{fallback}</>
    }

    return <AccessDeniedCard accessResult={accessResult} onUpgrade={handleUpgrade} action={action} />
  }

  return <>{children}</>
}

interface AccessDeniedCardProps {
  accessResult: SubscriptionCheckResult | null
  onUpgrade: () => void
  action: string
}

function AccessDeniedCard({ accessResult, onUpgrade, action }: AccessDeniedCardProps) {
  const getActionDisplayName = (action: string) => {
    switch (action) {
      case "interview":
        return "voice interviews"
      case "cover_letter":
        return "cover letters"
      case "template_access":
        return "premium templates"
      case "export_pdf":
        return "PDF exports"
      default:
        return "this feature"
    }
  }

  const getUpgradeRecommendation = (currentPlan?: string, action?: string) => {
    if (!currentPlan) return { plan: "Pro", price: "$39/month" }

    switch (currentPlan) {
      case "starter":
        return { plan: "Pro", price: "$39/month" }
      case "pro":
        if (action === "cover_letter") {
          return { plan: "Career+", price: "$59/month" }
        }
        return { plan: "Career+", price: "$59/month" }
      case "career":
        return { plan: "Coach", price: "$129/month" }
      default:
        return { plan: "Pro", price: "$39/month" }
    }
  }

  const recommendation = getUpgradeRecommendation(accessResult?.currentPlan, action)
  const usage = accessResult?.usage

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-gray-900">Upgrade Required</CardTitle>
            <CardDescription>
              {accessResult?.reason || `You've reached your limit for ${getActionDisplayName(action)}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan Info */}
        {accessResult?.currentPlan && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div>
              <p className="text-sm font-medium text-gray-900">Current Plan</p>
              <p className="text-sm text-gray-600 capitalize">{accessResult.currentPlan}</p>
            </div>
            <Badge variant="secondary">{accessResult.currentPlan}</Badge>
          </div>
        )}

        {/* Usage Display */}
        {usage && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Monthly Usage</h4>

            {/* Interviews */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Voice Interviews</span>
                <span>
                  {usage.interviews_used} / {usage.interviews_limit === -1 ? "∞" : usage.interviews_limit}
                </span>
              </div>
              <Progress
                value={usage.interviews_limit === -1 ? 0 : (usage.interviews_used / usage.interviews_limit) * 100}
                className="h-2"
              />
            </div>

            {/* Cover Letters */}
            {usage.cover_letters_limit > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Cover Letters</span>
                  <span>
                    {usage.cover_letters_used} / {usage.cover_letters_limit === -1 ? "∞" : usage.cover_letters_limit}
                  </span>
                </div>
                <Progress
                  value={
                    usage.cover_letters_limit === -1 ? 0 : (usage.cover_letters_used / usage.cover_letters_limit) * 100
                  }
                  className="h-2"
                />
              </div>
            )}
          </div>
        )}

        {/* Upgrade CTA */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold flex items-center">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to {recommendation.plan}
              </h4>
              <p className="text-sm opacity-90">Get unlimited access and more features</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{recommendation.price}</p>
              <p className="text-xs opacity-75">per month</p>
            </div>
          </div>
          <Button className="w-full mt-3 bg-white text-blue-600 hover:bg-gray-100" onClick={onUpgrade}>
            <Zap className="w-4 h-4 mr-2" />
            Upgrade Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Feature Comparison */}
        <div className="text-center">
          <Button variant="outline" onClick={onUpgrade} className="w-full">
            View All Plans & Features
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
