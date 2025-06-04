"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle } from "lucide-react"

export function WaitlistForm() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("")
  const [referredBy, setReferredBy] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from("waitlist_submissions").insert([
        {
          email,
          role: role || null,
          referred_by: referredBy || null,
        },
      ])

      if (error) throw error

      setSubmitted(true)
      toast({
        title: "Welcome to the waitlist!",
        description: "We'll notify you when ResumePilot is ready.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message.includes("duplicate")
          ? "You're already on our waitlist!"
          : "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h3 className="text-lg font-semibold">You're on the list!</h3>
          <p className="text-gray-600">We'll email you as soon as ResumePilot is ready for early access.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Join the Waitlist</CardTitle>
        <CardDescription>Be the first to try ResumePilot when we launch</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Current Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new-grad">New Grad</SelectItem>
                <SelectItem value="junior-swe">Junior SWE</SelectItem>
                <SelectItem value="mid-swe">Mid-level SWE</SelectItem>
                <SelectItem value="senior-swe">Senior SWE</SelectItem>
                <SelectItem value="staff-swe">Staff+ SWE</SelectItem>
                <SelectItem value="frontend">Frontend Engineer</SelectItem>
                <SelectItem value="backend">Backend Engineer</SelectItem>
                <SelectItem value="fullstack">Full Stack Engineer</SelectItem>
                <SelectItem value="devops">DevOps Engineer</SelectItem>
                <SelectItem value="mobile">Mobile Engineer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referredBy">How did you hear about us?</Label>
            <Input
              id="referredBy"
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
              placeholder="Twitter, friend, etc."
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Join Waitlist
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
