"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FileText, ChevronDown, LogOut, Mic, Play, Download, Save, AlertCircle } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { SubscriptionGuard } from "@/components/subscription/subscription-guard"
import { useToast } from "@/hooks/use-toast"

const templateData = {
  "jakes-resume": {
    name: "Jake's Resume",
    category: "Professional",
    description: "Clean, ATS-friendly template perfect for software engineers",
  },
  "modern-tech": {
    name: "Modern Tech",
    category: "Modern",
    description: "Contemporary design with subtle tech elements",
  },
  "classic-professional": {
    name: "Classic Professional",
    category: "Professional",
    description: "Traditional layout optimized for corporate environments",
  },
  "minimalist-modern": {
    name: "Minimalist Modern",
    category: "Modern",
    description: "Clean lines and plenty of white space",
  },
  "academic-research": {
    name: "Academic Research",
    category: "Academic",
    description: "Perfect for PhD candidates and research positions",
  },
  "startup-focused": {
    name: "Startup Focused",
    category: "Modern",
    description: "Dynamic template for fast-paced startup environments",
  },
  "senior-executive": {
    name: "Senior Executive",
    category: "Professional",
    description: "Sophisticated design for leadership roles",
  },
  "graduate-student": {
    name: "Graduate Student",
    category: "Academic",
    description: "Ideal for recent graduates and entry-level positions",
  },
}

export default function ResumeBuilderPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const templateId = params.templateId as string
  const [startingInterview, setStartingInterview] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    router.push("/")
    return null
  }

  const template = templateData[templateId as keyof typeof templateData]

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Template Not Found</h1>
          <p className="text-gray-600">The requested template could not be found.</p>
          <Link href="/dashboard">
            <Button>Back to Templates</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const handleStartInterview = async () => {
    setStartingInterview(true)

    try {
      // Check access and increment usage
      const response = await fetch("/api/subscription/start-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: "interview",
        }),
      })

      const result = await response.json()

      if (!result.success) {
        toast({
          title: "Interview Limit Reached",
          description: result.error || "You've reached your monthly interview limit",
          variant: "destructive",
        })
        return
      }

      // Start the actual interview
      toast({
        title: "Interview Started!",
        description: "Your voice interview session has begun.",
      })

      // TODO: Implement actual interview logic here
      console.log("Starting interview for template:", templateId)
    } catch (error) {
      console.error("Error starting interview:", error)
      toast({
        title: "Error",
        description: "Failed to start interview. Please try again.",
        variant: "destructive",
      })
    } finally {
      setStartingInterview(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="w-12 h-12 rounded-lg border-[25px] border-blue-200 p-1 bg-gradient-to-r from-blue-600 to-purple-600">
                  <img
                    src="/images/resumepilot-logo.png"
                    alt="ResumePilot Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xl font-bold text-gray-900">ResumePilot</span>
              </div>
            </div>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">{user.email}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Template Info */}
            <SubscriptionGuard action="template_access">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="secondary">{template.category}</Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
              </Card>
            </SubscriptionGuard>

            {/* Voice Interview */}
            <SubscriptionGuard
              action="interview"
              fallback={
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                      Interview Limit Reached
                    </CardTitle>
                    <CardDescription>
                      You've reached your monthly interview limit. Upgrade to continue building resumes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                      onClick={() => router.push("/pricing")}
                    >
                      Upgrade Plan
                    </Button>
                  </CardContent>
                </Card>
              }
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Mic className="w-5 h-5 mr-2 text-blue-600" />
                    Voice Interview
                  </CardTitle>
                  <CardDescription>
                    Let our AI interview you to generate personalized resume content with STAR and XYZ format bullets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                    onClick={handleStartInterview}
                    disabled={startingInterview}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {startingInterview ? "Starting..." : "Start Interview"}
                  </Button>
                  <div className="text-sm text-gray-600">
                    <p>• 10-15 minute conversation</p>
                    <p>• AI asks about your experience</p>
                    <p>• Generates STAR & XYZ format bullets</p>
                    <p>• ATS-optimized content</p>
                  </div>
                </CardContent>
              </Card>
            </SubscriptionGuard>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <SubscriptionGuard
                  action="export_pdf"
                  fallback={
                    <Button variant="outline" className="w-full" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF (Upgrade Required)
                    </Button>
                  }
                >
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </SubscriptionGuard>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Resume Preview */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Resume Preview</CardTitle>
                <CardDescription>Your resume will appear here as you complete the voice interview</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center min-h-[600px]">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Ready to Build Your Resume?</h3>
                    <p className="text-gray-600 max-w-md">
                      Start the voice interview to generate personalized content for your {template.name} template with
                      STAR and XYZ format bullets.
                    </p>
                  </div>
                  <SubscriptionGuard action="interview">
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                      onClick={handleStartInterview}
                      disabled={startingInterview}
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      {startingInterview ? "Starting Interview..." : "Begin Voice Interview"}
                    </Button>
                  </SubscriptionGuard>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
