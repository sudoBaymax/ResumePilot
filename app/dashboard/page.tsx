"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, ChevronDown, LogOut, Star, Zap, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { SubscriptionManager } from "@/components/subscription/subscription-manager"
import { UsageWarning } from "@/components/subscription/usage-warning"
import { SubscriptionFixer } from "@/components/subscription/subscription-fixer"

const resumeTemplates = [
  {
    id: "jakes-resume",
    name: "Jake's Resume",
    category: "Professional",
    description: "Clean, ATS-friendly template perfect for software engineers",
    featured: true,
    preview: "/placeholder.svg?height=400&width=300&text=Jake's+Resume",
  },
  {
    id: "modern-tech",
    name: "Modern Tech",
    category: "Modern",
    description: "Contemporary design with subtle tech elements",
    featured: false,
    preview: "/placeholder.svg?height=400&width=300&text=Modern+Tech",
  },
  {
    id: "classic-professional",
    name: "Classic Professional",
    category: "Professional",
    description: "Traditional layout optimized for corporate environments",
    featured: false,
    preview: "/placeholder.svg?height=400&width=300&text=Classic+Pro",
  },
  {
    id: "minimalist-modern",
    name: "Minimalist Modern",
    category: "Modern",
    description: "Clean lines and plenty of white space",
    featured: false,
    preview: "/placeholder.svg?height=400&width=300&text=Minimalist",
  },
  {
    id: "academic-research",
    name: "Academic Research",
    category: "Academic",
    description: "Perfect for PhD candidates and research positions",
    featured: false,
    preview: "/placeholder.svg?height=400&width=300&text=Academic",
  },
  {
    id: "startup-focused",
    name: "Startup Focused",
    category: "Modern",
    description: "Dynamic template for fast-paced startup environments",
    featured: false,
    preview: "/placeholder.svg?height=400&width=300&text=Startup",
  },
  {
    id: "senior-executive",
    name: "Senior Executive",
    category: "Professional",
    description: "Sophisticated design for leadership roles",
    featured: false,
    preview: "/placeholder.svg?height=400&width=300&text=Executive",
  },
  {
    id: "graduate-student",
    name: "Graduate Student",
    category: "Academic",
    description: "Ideal for recent graduates and entry-level positions",
    featured: false,
    preview: "/placeholder.svg?height=400&width=300&text=Graduate",
  },
]

const categories = ["All", "Professional", "Modern", "Academic"]

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState("All")

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

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  const filteredTemplates =
    selectedCategory === "All"
      ? resumeTemplates
      : resumeTemplates.filter((template) => template.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Update the logo in the header */}
            <div className="flex items-center space-x-2">
              <div className="rounded-lg flex items-center justify-center">
                <img
                  src="/images/resumepilot-logo.png"
                  alt="ResumePilot Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to a simple icon if image fails to load
                    e.currentTarget.style.display = "none"
                    e.currentTarget.parentElement!.innerHTML = '<div class="text-white text-xs font-bold">RP</div>'
                  }}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="templates" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Resume Templates</TabsTrigger>
            <TabsTrigger value="subscription">
              <Settings className="w-4 h-4 mr-2" />
              Subscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-8">
            {/* Page Header */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Choose Your Resume Template</h1>
              <p className="text-xl text-gray-600">Select an ATS-optimized template to start building your resume</p>
            </div>

            {/* Usage Warning */}
            <UsageWarning showAlways={false} />

            {/* Category Filter */}
            <div className="flex justify-center">
              <div className="flex space-x-2 bg-white rounded-lg p-1 border">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={selectedCategory === category ? "bg-blue-600 text-white" : ""}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200"
                >
                  <CardHeader className="p-0">
                    <div className="relative">
                      <img
                        src={template.preview || "/placeholder.svg"}
                        alt={`${template.name} preview`}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      {template.featured && (
                        <Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-900">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      <Badge variant="secondary" className="absolute top-2 right-2 bg-white/90 text-gray-700">
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">{template.name}</CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1">{template.description}</CardDescription>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Zap className="w-3 h-3" />
                      <span>ATS-Optimized</span>
                    </div>

                    <Link href={`/resume-builder/${template.id}`} className="block">
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        Use Template
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600">Try selecting a different category</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscription">
            <div className="max-w-4xl mx-auto">
              <div className="text-center space-y-4 mb-8">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Subscription Management</h1>
                <p className="text-xl text-gray-600">Manage your plan, usage, and billing</p>
              </div>
              <div className="space-y-6">
                <SubscriptionFixer />
                <SubscriptionManager onUpgrade={handleUpgrade} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
