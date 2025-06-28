"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { isAdminUser } from "@/lib/subscription"
import { Users, CreditCard, TrendingUp, AlertCircle, Crown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AdminStats {
  totalUsers: number
  activeSubscriptions: number
  totalRevenue: number
  monthlyRevenue: number
  planDistribution: {
    plan_name: string
    count: number
  }[]
  recentSubscriptions: {
    email: string
    plan_name: string
    status: string
    created_at: string
  }[]
}

export function AdminDashboard() {
  const { user, token } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && isAdminUser(user.email || "")) {
      fetchAdminStats()
    }
  }, [user])

  const fetchAdminStats = async () => {
    try {
      const response = await fetch("/api/admin/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch admin stats")
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching admin stats:", error)
      toast({
        title: "Error",
        description: "Failed to load admin statistics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Check if user is admin
  if (!user || !isAdminUser(user.email || "")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            Access Denied
          </CardTitle>
          <CardDescription>You don't have permission to view this page.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>Unable to load statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchAdminStats}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor subscriptions, usage, and revenue</p>
        </div>
        <Badge variant="outline" className="flex items-center">
          <Crown className="w-4 h-4 mr-1" />
          Admin Access
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Distribution</CardTitle>
          <CardDescription>Active subscriptions by plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.planDistribution.map((plan) => (
              <div key={plan.plan_name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{plan.plan_name}</Badge>
                  <span className="text-sm text-gray-600">
                    {((plan.count / stats.activeSubscriptions) * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="font-medium">{plan.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Subscriptions</CardTitle>
          <CardDescription>Latest subscription activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentSubscriptions.map((subscription, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{subscription.email}</p>
                  <p className="text-sm text-gray-600">
                    {subscription.plan_name} • {subscription.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {new Date(subscription.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
          <CardDescription>Quick actions for system management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => window.open("/api/admin/export-users", "_blank")}>
              Export User Data
            </Button>
            <Button variant="outline" onClick={() => window.open("/api/admin/export-subscriptions", "_blank")}>
              Export Subscriptions
            </Button>
            <Button variant="outline" onClick={() => window.open("/api/admin/usage-report", "_blank")}>
              Usage Report
            </Button>
            <Button variant="outline" onClick={() => window.open("/api/admin/revenue-report", "_blank")}>
              Revenue Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 