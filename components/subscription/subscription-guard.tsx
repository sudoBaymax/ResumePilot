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
import { createUserPlan, type FeatureType } from "@/lib/subscription"

interface SubscriptionGuardProps {
  action: FeatureType
  children: React.ReactNode
  fallback?: React.ReactNode
  onAccessDenied?: () => void
}

export function SubscriptionGuard({ action, children, fallback, onAccessDenied }: SubscriptionGuardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [userPlan, setUserPlan] = useState<any>(null)
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
      const plan = await createUserPlan(user.id, user.email)
      setUserPlan(plan)

      const accessResult = plan.canUseFeature(action)
      
      if (!accessResult.allowed && onAccessDenied) {
        onAccessDenied()
      }
    } catch (error) {
      console.error("Error checking access:", error)
      
      toast({
        title: "Connection Error",
        description: "Unable to verify subscription access. Please try again.",
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

  if (!userPlan?.canUseFeature(action).allowed) {
    if (fallback) {
      return <>{fallback}</>
    }

    return <AccessDeniedCard userPlan={userPlan} onUpgrade={handleUpgrade} action={action} />
  }

  return <>{children}</>
}

interface AccessDeniedCardProps {
  userPlan: any
  onUpgrade: () => void
  action: FeatureType
}

function AccessDeniedCard({ userPlan, onUpgrade, action }: AccessDeniedCardProps) {
  const getActionDisplayName = (action: FeatureType) => {
    switch (action) {
      case "interview":
        return "voice interviews"
      case "cover_letter":
        return "cover letters"
      default:
        return "this feature"
    }
  }

  const getUpgradeRecommendation = (currentPlan?: string, action?: FeatureType) => {
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

  const plan = userPlan?.getPlan()
  const currentPlan = userPlan?.subscription?.plan_name
  const recommendation = getUpgradeRecommendation(currentPlan, action)
  const accessResult = userPlan?.canUseFeature(action)

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
        {currentPlan && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div>
              <p className="text-sm font-medium text-gray-900">Current Plan</p>
              <p className="text-sm text-gray-600 capitalize">{currentPlan}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {userPlan.subscription?.status || "inactive"}
            </Badge>
          </div>
        )}

        {/* Usage Progress */}
        {plan && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Current Usage</h4>
            
            {plan.limits.interviews > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Voice Interviews</span>
                  <span>{plan.getUsageMessage("interview", userPlan.usage)}</span>
                </div>
                <Progress 
                  value={userPlan.usage.getPercentage("interview", plan.limits.interviews)} 
                  className="h-2" 
                />
              </div>
            )}

            {plan.limits.coverLetters > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Cover Letters</span>
                  <span>{plan.getUsageMessage("cover_letter", userPlan.usage)}</span>
                </div>
                <Progress 
                  value={userPlan.usage.getPercentage("cover_letter", plan.limits.coverLetters)} 
                  className="h-2" 
                />
              </div>
            )}
          </div>
        )}

        {/* Upgrade CTA */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Upgrade to {recommendation.plan}</p>
                <p className="text-sm text-gray-600">Get unlimited access to {getActionDisplayName(action)}</p>
              </div>
            </div>
            <Button onClick={onUpgrade} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Zap className="w-4 h-4 mr-2" />
              {recommendation.price}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">What you'll get:</h4>
          <div className="space-y-2">
            {action === "interview" && (
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">More voice interviews per month</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Advanced AI coaching</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Detailed performance analytics</span>
                </div>
              </>
            )}
            {action === "cover_letter" && (
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">AI-powered cover letter generation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Multiple cover letter templates</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Role-specific customization</span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
