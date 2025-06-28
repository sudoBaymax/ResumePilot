"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { isAdminUser, PLAN_LIMITS, PlanType } from "@/lib/subscription"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PLAN_OPTIONS: { label: string; value: PlanType }[] = [
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Career+", value: "career" },
  { label: "Coach", value: "coach" },
]

export default function AdminSimDashboardPage() {
  const { user, loading } = useAuth()
  const [simPlan, setSimPlan] = useState<PlanType | null>(null)
  const [selectValue, setSelectValue] = useState<PlanType>("starter")

  // Load simulation state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("adminSimPlan")
      if (stored && PLAN_OPTIONS.some(opt => opt.value === stored)) {
        setSimPlan(stored as PlanType)
        setSelectValue(stored as PlanType)
      }
    }
  }, [])

  // Save simulation state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (simPlan) {
        localStorage.setItem("adminSimPlan", simPlan)
      } else {
        localStorage.removeItem("adminSimPlan")
      }
    }
  }, [simPlan])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user || !isAdminUser(user.email || "")) {
    return (
      <Card className="max-w-lg mx-auto mt-20">
        <CardHeader>
          <CardTitle>Admin Access Required</CardTitle>
          <CardDescription>You must be logged in as an admin to view this page.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">Admin Simulation Dashboard <Badge className="ml-2">Admin Only</Badge></CardTitle>
          <CardDescription>
            Simulate your account as a specific plan. This is for testing and QA only. When simulation is active, your account will behave as if it is on the selected plan (in supported areas of the app).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="plan-select" className="block mb-2 font-medium">Select a plan to simulate:</label>
            <select
              id="plan-select"
              className="border rounded px-3 py-2 w-full"
              value={selectValue}
              onChange={e => setSelectValue(e.target.value as PlanType)}
            >
              {PLAN_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setSimPlan(selectValue)} disabled={simPlan === selectValue}>
              Simulate as {PLAN_OPTIONS.find(opt => opt.value === selectValue)?.label}
            </Button>
            <Button variant="outline" onClick={() => setSimPlan(null)} disabled={!simPlan}>
              Reset Simulation
            </Button>
          </div>
          {simPlan && (
            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded mt-4">
              <p className="text-yellow-800 font-medium mb-1">Simulation Active: <span className="font-bold">{PLAN_OPTIONS.find(opt => opt.value === simPlan)?.label}</span></p>
              <p className="text-yellow-700 text-sm">Your account is currently simulating the <b>{simPlan}</b> plan. In a real app, this would override your plan context globally. For now, this state is stored in localStorage and can be used by other components to test plan-specific features.</p>
            </div>
          )}
        </CardContent>
      </Card>
      <AdminDashboard />
    </div>
  )
} 