"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { AlertTriangle, Loader2, CheckCircle, Info } from "lucide-react"

export function SubscriptionFixer() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fixed, setFixed] = useState(false)

  const handleFixSubscription = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get the user's session token
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: "Authentication Error",
          description: "Please sign out and sign back in, then try again.",
          variant: "destructive",
        })
        return
      }

      // Try to determine the correct plan from payment history
      const response = await fetch("/api/subscription/fix-subscription-smart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Subscription Fixed",
          description: `Your subscription has been updated to ${data.planName}. Please refresh the page.`,
          variant: "default",
        })
        setFixed(true)
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
        description: "An unexpected error occurred. Please contact support.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (fixed) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Subscription Fixed</CardTitle>
          </div>
          <CardDescription>
            Your subscription has been successfully updated based on your payment history. Please refresh the page to
            see the changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()} className="w-full">
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg">Payment Processed But Subscription Not Active?</CardTitle>
        </div>
        <CardDescription>
          If you've made a payment but your subscription isn't showing as active, we can automatically fix that based on
          your payment history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">This will automatically:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Check your payment history with Stripe</li>
              <li>Set your plan to match what you actually paid for</li>
              <li>Reset your usage counter for the current month</li>
              <li>Activate your subscription immediately</li>
            </ul>
          </div>
        </div>

        <Button onClick={handleFixSubscription} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing payments and fixing...
            </>
          ) : (
            "Fix My Subscription Automatically"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
