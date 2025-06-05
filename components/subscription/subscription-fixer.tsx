"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { AlertTriangle, Loader2, CheckCircle } from "lucide-react"

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

      const response = await fetch("/api/subscription/fix-subscription-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planName: "starter" }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Subscription Fixed",
          description: "Your subscription has been successfully updated. You may need to refresh the page.",
          variant: "default",
        })
        setFixed(true)
      } else {
        // If the new endpoint fails, try the original one
        const fallbackResponse = await fetch("/api/subscription/fix-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        })

        const fallbackData = await fallbackResponse.json()

        if (fallbackResponse.ok) {
          toast({
            title: "Subscription Fixed",
            description: "Your subscription has been successfully updated. You may need to refresh the page.",
            variant: "default",
          })
          setFixed(true)
        } else {
          toast({
            title: "Error",
            description: fallbackData.error || data.error || "Failed to fix subscription",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error fixing subscription:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try refreshing the page and trying again.",
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
            Your subscription has been successfully updated. Please refresh the page to see the changes.
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
          If you've made a payment but your subscription isn't showing as active, we can fix that for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleFixSubscription} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fixing...
            </>
          ) : (
            "Fix My Subscription"
          )}
        </Button>
        <div className="text-xs text-gray-600">
          <p>This will:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Create or update your subscription record</li>
            <li>Set your plan to "Starter" (1 interview)</li>
            <li>Reset your usage counter</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
