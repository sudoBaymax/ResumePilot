"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { InterviewSession } from "@/components/interview/interview-session"
import { SubscriptionGuard } from "@/components/subscription/subscription-guard"
import { ChevronDown, LogOut, Mic, FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"

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

export default function InterviewPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const params = useParams()
  const templateId = params.templateId as string
  const [generatedBullets, setGeneratedBullets] = useState<any[]>([])

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

  const handleInterviewComplete = (bullets: any[]) => {
    setGeneratedBullets(bullets)
    // You can save these bullets to the user's profile or resume
    // For now, we'll just store them in state
  }

  const handleContinueToResume = () => {
    // Navigate to the resume builder with the generated bullets
    router.push(`/resume-builder/${templateId}?bullets=${encodeURIComponent(JSON.stringify(generatedBullets))}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="rounded-lg">
                <img
                  src="/images/resumepilot-logo.png"
                  alt="ResumePilot Logo"
                  className="object-contain"
                  style={{ width: "40px", height: "40px", borderRadius: "9px" }}
                />
              </div>
              <span className="text-xl font-bold text-gray-900">ResumePilot</span>
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.back()} className="flex items-center">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Voice Interview</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-gray-600">Template:</span>
                  <Badge variant="secondary">{template.name}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Interview Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="w-5 h-5 mr-2 text-blue-600" />
                Interview Instructions
              </CardTitle>
              <CardDescription>Answer the following questions to generate personalized resume content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-gray-700">
                  This interview will help us create tailored resume bullet points in the XYZ format:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>
                    <strong>X</strong>: What you did (action verb)
                  </li>
                  <li>
                    <strong>Y</strong>: How you did it (tools, methods, team size)
                  </li>
                  <li>
                    <strong>Z</strong>: The result or impact (quantifiable metrics)
                  </li>
                </ul>
                <p className="text-gray-700 mt-2">
                  For best results, include specific details, metrics, and technologies in your answers.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Interview Session */}
          <SubscriptionGuard action="interview">
            <InterviewSession userId={user.id} roleType="software engineer" onComplete={handleInterviewComplete} />
          </SubscriptionGuard>

          {/* Continue Button */}
          {generatedBullets.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={handleContinueToResume} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <FileText className="w-4 h-4 mr-2" />
                Continue to Resume Builder
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
