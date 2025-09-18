"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ChevronDown,
  LogOut,
  Check,
  Mic,
  Download,
  Zap,
  Star,
  Crown,
  Briefcase,
  Users,
  ChevronUp,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-provider"

// 1. Update plan data to match new requirements
const pricingPlans = [
  {
    id: "starter",
    name: "Starter (One-Time Payment)",
    icon: Zap,
    tagline: "One-time access, no renewal",
    price: 9,
    monthly: 9,
    yearly: 9,
    monthlyEquivalent: 9,
    billingNote: "One-time payment",
    description: "3 AI Interview Attempts. Access to all question types.",
    features: [
      "3 AI Interview Attempts",
      "Access to all question types",
      "One-time access, no renewal"
    ],
    cta: "Try It For $9",
    highlight: false,
    color: "gray",
    period: "one-time",
    featureMap: [3, true, false, false, false, false, false, false, false, false],
  },
  {
    id: "pro",
    name: "Pro",
    icon: Star,
    tagline: "Great for frequent practice & solo job-seekers",
    price: 49,
    monthly: 49,
    yearly: 349,
    monthlyEquivalent: 29,
    billingNote: "Billed yearly",
    description: "30 AI Interview Attempts/month. Model answers & feedback. Analytics dashboard.",
    features: [
      "30 AI Interview Attempts/month",
      "Model answers & feedback",
      "Analytics dashboard"
    ],
    cta: "Start Building",
    highlight: true,
    color: "blue",
    period: "month",
    featureMap: [30, true, true, true, false, false, true, false, false, false],
  },
  {
    id: "career",
    name: "Career+",
    icon: Briefcase,
    tagline: "Designed for active job-hunters & career switchers",
    price: 69,
    monthly: 69,
    yearly: 499,
    monthlyEquivalent: 41.5,
    billingNote: "Billed yearly",
    description: "100 AI Interview Attempts/month. Career insights dashboard. Resume/LinkedIn help. Custom interview sets.",
    features: [
      "100 AI Interview Attempts/month",
      "Career insights dashboard",
      "Resume/LinkedIn help",
      "Custom interview sets"
    ],
    cta: "Upgrade to Career+",
    highlight: false,
    color: "green",
    period: "month",
    featureMap: [100, true, true, true, true, true, true, true, true, false],
  },
  {
    id: "coach",
    name: "Coach",
    icon: Users,
    tagline: "Designed for professionals and institutions",
    price: 129,
    monthly: 129,
    yearly: 999,
    monthlyEquivalent: 83,
    billingNote: "Billed yearly (starts at)",
    description: "Unlimited interviews. 1:1 career coaching. Org/team account features. Resume feedback & portfolio reviews.",
    features: [
      "Unlimited interviews",
      "1:1 career coaching",
      "Org/team account features",
      "Resume feedback & portfolio reviews"
    ],
    cta: "Contact Sales",
    highlight: false,
    color: "purple",
    period: "month",
    featureMap: ["Unlimited", true, true, true, true, true, true, true, true, true],
  },
]

// 2. Feature matrix for table
const featureMatrix = [
  "AI-Powered Interview Attempts",
  "Access to All Question Types",
  "Access to Model Answers",
  "Personalized Feedback",
  "Career Insights Dashboard",
  "Custom Interview Sets",
  "Analytics + Progress Tracking",
  "Resume & LinkedIn Optimization",
  "1:1 Coach Support",
  "Team / Org Management Features"
]

const faqs = [
  {
    question: "What's the difference between STAR and XYZ format bullets?",
    answer:
      "STAR format (Situation, Task, Action, Result) is great for detailed project descriptions, while XYZ format (Accomplished X as measured by Y by doing Z) is perfect for quantifiable achievements. Our AI automatically chooses the best format for each bullet point.",
  },
  {
    question: "Can I upgrade or downgrade my plan anytime?",
    answer:
      "Yes! You can upgrade immediately and start using new features right away. Downgrades take effect at your next billing cycle. No penalties or fees for changes.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund. The $9 Starter plan is non-refundable due to its one-time nature.",
  },
  {
    question: "How does the voice interview work?",
    answer:
      "Our AI conducts a 10-15 minute conversation asking about your experience, projects, and achievements. The interview is processed to generate professional resume bullets in STAR and XYZ formats.",
  },
  {
    question: "Are the resumes ATS-friendly?",
    answer:
      "Yes! All our templates are optimized for Applicant Tracking Systems (ATS) and follow industry best practices for formatting and keyword optimization.",
  },
  {
    question: "What happens if I exceed my monthly interview limit?",
    answer:
      "You can purchase additional interviews for $4 each, or upgrade to a higher plan. We'll notify you when you're approaching your limit.",
  },
]

export default function PricingPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  // 3. Default to yearly pricing
  const [billingCycle, setBillingCycle] = useState<'yearly' | 'monthly'>("yearly")
  const [expandedFeatures, setExpandedFeatures] = useState<string[]>([])
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const handleGetStarted = async (planId: string) => {
    if (!user) {
      router.push(`/?signup=true&plan=${planId}`)
      return
    }

    if (planId === "coach") {
      // For coach plan, redirect to contact
      window.open("mailto:info@resumepilot.com?subject=Coach/Agency Plan Inquiry", "_blank")
      return
    }

    setProcessingPlan(planId)
    setCheckoutUrl(null)

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey: planId,
          userId: user.id,
          billingCycle,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Instead of redirecting, store the URL and show a button
      if (data.url) {
        setCheckoutUrl(data.url)
        toast({
          title: "Checkout Ready",
          description: "Click the button to complete your purchase in a new tab",
        })
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start payment process. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingPlan(null)
    }
  }

  const toggleFeatures = (planId: string) => {
    setExpandedFeatures((prev) => (prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]))
  }

  const calculateSavings = (monthly: number, yearly: number) => {
    const monthlyCost = monthly * 12
    const savings = ((monthlyCost - yearly) / monthlyCost) * 100
    return Math.round(savings)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="rounded-lg">
                <img
                  src="/images/resumepilot-logo.png"
                  alt="ResumePilot Logo"
                  className="object-contain"
                  style={{ width: "40px", height: "40px", borderRadius: "9px" }}
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">ResumePilot</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/#how-it-works" className="text-gray-600 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="/#demo" className="text-gray-600 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white transition-colors">
                Demo
              </Link>
              <Link href="/pricing" className="text-gray-600 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">
                Pricing
              </Link>
              <Link href="/#faq" className="text-gray-600 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white transition-colors">
                FAQ
              </Link>
              <ThemeToggle />
              {user ? (
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
              ) : (
                <Button variant="outline" size="sm" onClick={() => router.push("/?signin=true")}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Checkout Modal */}
      {checkoutUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Complete Your Purchase</h3>
            <p className="text-gray-600 mb-6">
              Click the button below to open Stripe checkout in a new tab and complete your purchase.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                onClick={() => window.open(checkoutUrl, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Checkout
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setCheckoutUrl(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto dark:text-gray-300">
            Get AI-powered resume building with STAR and XYZ format bullets. Start with our $9 trial or choose a plan
            that fits your career goals.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            <span className={`text-sm ${billingCycle === "monthly" ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingCycle === "yearly" ? "bg-blue-600 dark:bg-blue-700" : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === "yearly" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === "yearly" ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
              Yearly
            </span>
            {billingCycle === "yearly" && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Save up to 36%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-20">
          {pricingPlans.map((plan, index) => (
            <Card
              key={index}
              className={`relative transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                plan.highlight
                  ? "border-2 border-blue-500 shadow-2xl scale-105 bg-gradient-to-b from-blue-50 to-white dark:from-blue-900 dark:to-gray-950"
                  : "border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-400 bg-white dark:bg-gray-900"
              }`}
            >
              {/* Most Popular badge removed, not needed */}
              <CardHeader className="text-center pb-4">
                <div className="space-y-3">
                  <div
                    className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${
                      plan.highlight
                        ? "bg-gradient-to-r from-blue-500 to-purple-500"
                        : plan.color === "green"
                          ? "bg-green-100 dark:bg-green-900"
                          : plan.color === "purple"
                            ? "bg-purple-100 dark:bg-purple-900"
                            : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  >
                    <plan.icon
                      className={`w-6 h-6 ${
                        plan.highlight
                          ? "text-white"
                          : plan.color === "green"
                            ? "text-green-600 dark:text-green-400"
                            : plan.color === "purple"
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-gray-600 dark:text-gray-300"
                      }`}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1 dark:text-gray-300">{plan.tagline}</CardDescription>
                  </div>
                </div>
                {/* Pricing display */}
                <div className="space-y-2 mt-4">
                  {plan.period === "one-time" ? (
                    <>
                      <div className="flex items-baseline justify-center space-x-1">
                        <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">${plan.price}</span>
                        <span className="text-gray-500 dark:text-gray-300">One-Time</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-300">{plan.billingNote}</div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-center space-x-1">
                        <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                          ${billingCycle === "yearly" ? plan.monthlyEquivalent : plan.monthly}
                        </span>
                        <span className="text-gray-500 dark:text-gray-300">/mo</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-300">
                        {billingCycle === "yearly"
                          ? `Billed $${plan.yearly} yearly`
                          : `Billed $${plan.monthly} monthly`}
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-gray-600 text-center dark:text-gray-300">{plan.description}</p>
                <ul className="space-y-2 text-left mx-auto max-w-xs">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-gray-700 dark:text-gray-200">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                      : plan.color === "green"
                        ? "bg-green-600 hover:bg-green-700"
                        : plan.color === "purple"
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-gray-600 hover:bg-gray-700"
                  } text-white transition-all duration-200 dark:text-white`}
                  onClick={() => handleGetStarted(plan.id)}
                  disabled={processingPlan === plan.id}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Matrix Table */}
        <div className="overflow-x-auto mb-20">
          <table className="min-w-full border-collapse rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-md">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800">Feature</th>
                {pricingPlans.map((plan, idx) => (
                  <th key={plan.id} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800">
                    {plan.name.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureMatrix.map((feature, rowIdx) => (
                <tr key={feature} className={rowIdx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 font-medium">{feature}</td>
                  {pricingPlans.map((plan, colIdx) => {
                    const value = plan.featureMap[rowIdx];
                    return (
                      <td key={plan.id} className="px-4 py-2 text-center">
                        {typeof value === 'boolean' ? (
                          value ? <span className="text-green-500">&#10003;</span> : <span className="text-gray-400">&#8212;</span>
                        ) : typeof value === 'number' ? (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{value}</span>
                        ) : value === 'Unlimited' ? (
                          <span className="font-semibold text-purple-600 dark:text-purple-400">Unlimited</span>
                        ) : (
                          <span className="text-gray-400">&#8212;</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">All features at a glance. <span className="font-medium">Save 30% with annual billing.</span></div>
        </div>

        {/* Features Comparison */}
        <div className="mb-20">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Why Choose ResumePilot?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">Advanced AI technology meets professional resume writing</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Mic,
                title: "AI Voice Interviews",
                description: "Natural conversation with our AI to extract your best experiences and achievements",
              },
              {
                icon: Zap,
                title: "STAR & XYZ Formats",
                description: "Professional bullet points in both STAR and XYZ formats, optimized for your industry",
              },
              {
                icon: Download,
                title: "ATS-Optimized",
                description: "All templates pass through Applicant Tracking Systems with high success rates",
              },
            ].map((feature, index) => (
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-gray-900">
                <CardContent className="p-8 space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-20">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">Everything you need to know about ResumePilot</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <Card key={index} className="border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow bg-white dark:bg-gray-900">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{faq.question}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="text-center space-y-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white dark:from-blue-900 dark:to-purple-900 dark:text-white">
          <h2 className="text-3xl font-bold">Not sure which plan is right for you?</h2>
          <p className="text-xl opacity-90">Start with a $9 trial — you can upgrade anytime.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => handleGetStarted("starter")}
              disabled={processingPlan === "starter"}
            >
              {processingPlan === "starter" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Try It For $9"
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-blue-600"
              onClick={() => router.push("/#demo")}
            >
              Watch Demo
            </Button>
          </div>
          <p className="text-sm opacity-75">No subscription. No auto-renew. Perfect for testing our platform.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              {/* Footer Logo */}
              <div className="flex items-center space-x-2">
                <div className="rounded-lg">
                  <img
                    src="/images/resumepilot-logo.png"
                    alt="ResumePilot Logo"
                    className="object-contain"
                    style={{ width: "40px", height: "40px", borderRadius: "9px" }}
                  />
                </div>
                <span className="text-xl font-bold dark:text-gray-100">ResumePilot</span>
              </div>
              <p className="text-gray-400 dark:text-gray-300 text-sm">
                AI-powered resume builder that helps software engineers craft compelling, ATS-optimized resumes with
                STAR and XYZ format bullets through voice interviews.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Product</h4>
              <div className="space-y-2 text-sm">
                <Link href="/#how-it-works" className="block text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors">
                  How It Works
                </Link>
                <Link href="/#demo" className="block text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors">
                  Demo
                </Link>
                <Link href="/pricing" className="block text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors">
                  Pricing
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Company</h4>
              <div className="space-y-2 text-sm">
                <Link href="/about" className="block text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors">
                  About
                </Link>
                <Link href="/contact" className="block text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors">
                  Contact
                </Link>
                <Link href="/privacy" className="block text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors">
                  Privacy
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Connect</h4>
              <div className="space-y-2 text-sm">
                <a
                  href="https://github.com/resumepilot"
                  className="block text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://twitter.com/ResumePilot"
                  className="block text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors"
                >
                  Twitter (@ResumePilot)
                </a>
                <a
                  href="mailto:info@resumepilot.com"
                  className="block text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors"
                >
                  info@resumepilot.com
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 ResumePilot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
