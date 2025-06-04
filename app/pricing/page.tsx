"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  FileText,
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
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const pricingPlans = [
  {
    id: "starter",
    name: "Starter",
    icon: Zap,
    tagline: "Try ResumePilot once. No strings attached.",
    price: 9,
    originalPrice: null,
    period: "one-time",
    yearlyPrice: null,
    yearlyOriginal: null,
    description: "Perfect for a quick application or testing the platform",
    features: [
      "1 voice interview session",
      "1 resume template (Jake's Template)",
      "STAR & XYZ bullet formatting",
      "Basic ATS optimization",
      "PDF export",
    ],
    limitations: ["No subscription. No auto-renew."],
    cta: "Try It For $9",
    popular: false,
    color: "gray",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    icon: Star,
    tagline: "Best value for serious job seekers",
    price: 39,
    originalPrice: 59,
    period: "month",
    yearlyPrice: 299,
    yearlyOriginal: 468,
    description: "Everything you need to land your dream job",
    features: [
      "10 voice interviews/month",
      "All 8+ premium templates",
      "Unlimited resume versions",
      "STAR & XYZ formatting",
      "Advanced ATS optimization",
      "LinkedIn + PDF export",
      "Resume analytics",
      "Interview question bank",
      "Priority email support",
      "Custom bullet point editing",
    ],
    limitations: [],
    cta: "Start Building",
    popular: true,
    color: "blue",
    highlight: true,
  },
  {
    id: "career",
    name: "Career+",
    icon: Briefcase,
    tagline: "For active job switchers",
    price: 59,
    originalPrice: null,
    period: "month",
    yearlyPrice: 449,
    yearlyOriginal: 708,
    description: "Apply smarter with tailored bullets for each job",
    features: [
      "Everything in Pro, plus:",
      "30 voice interviews/month",
      "3 AI-generated cover letters/month",
      "Role-matching: Upload job link for tailored bullets",
      "1 live resume review by AI coach (monthly)",
      "Downloadable Interview Tracker sheet",
      "Resume version control for different roles",
    ],
    limitations: [],
    cta: "Upgrade to Career+",
    popular: false,
    color: "green",
    highlight: false,
  },
  {
    id: "coach",
    name: "Coach / Agency",
    icon: Users,
    tagline: "For resume businesses or freelancers",
    price: 129,
    originalPrice: null,
    period: "month",
    yearlyPrice: 999,
    yearlyOriginal: 1548,
    description: "Professional tools for resume consultants and agencies",
    features: [
      "Everything in Career+, plus:",
      "Up to 5 sub-accounts (clients/team)",
      "Whitelabel export (no ResumePilot branding)",
      "Client dashboard",
      "API access (beta)",
      "Custom branding & templates",
      "Dedicated account manager",
      "Phone support",
    ],
    limitations: [],
    cta: "Contact Sales",
    popular: false,
    color: "purple",
    highlight: false,
  },
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
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [expandedFeatures, setExpandedFeatures] = useState<string[]>([])
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

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

    // TEMPORARY: Show alert instead of processing payment
    toast({
      title: "Setup Required",
      description: "Please create Stripe products and update price IDs in lib/stripe.ts first.",
      variant: "destructive",
    })
    return

    // UNCOMMENT THIS SECTION AFTER UPDATING PRICE IDs:
    /*
    setProcessingPlan(planId)

    try {
      const stripe = await stripePromise
      if (!stripe) throw new Error("Stripe not loaded")

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey: planId,
          userId: user.id,
          billingCycle,
        }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId })
      if (stripeError) {
        throw new Error(stripeError.message)
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Error",
        description: "Failed to start payment process. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingPlan(null)
    }
    */
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ResumePilot</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">
                How It Works
              </Link>
              <Link href="/#demo" className="text-gray-600 hover:text-gray-900 transition-colors">
                Demo
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                Pricing
              </Link>
              <Link href="/#faq" className="text-gray-600 hover:text-gray-900 transition-colors">
                FAQ
              </Link>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Setup Notice */}
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Setup Required</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  To enable payments, please create Stripe products and update the price IDs in{" "}
                  <code>lib/stripe.ts</code>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get AI-powered resume building with STAR and XYZ format bullets. Start with our $9 trial or choose a plan
            that fits your career goals.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            <span className={`text-sm ${billingCycle === "monthly" ? "text-gray-900 font-medium" : "text-gray-500"}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingCycle === "yearly" ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === "yearly" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === "yearly" ? "text-gray-900 font-medium" : "text-gray-500"}`}>
              Yearly
            </span>
            {billingCycle === "yearly" && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
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
                  ? "border-2 border-blue-500 shadow-2xl scale-105 bg-gradient-to-b from-blue-50 to-white"
                  : "border border-gray-200 hover:shadow-lg hover:border-blue-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 shadow-lg">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="space-y-3">
                  <div
                    className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${
                      plan.highlight
                        ? "bg-gradient-to-r from-blue-500 to-purple-500"
                        : plan.color === "green"
                          ? "bg-green-100"
                          : plan.color === "purple"
                            ? "bg-purple-100"
                            : "bg-gray-100"
                    }`}
                  >
                    <plan.icon
                      className={`w-6 h-6 ${
                        plan.highlight
                          ? "text-white"
                          : plan.color === "green"
                            ? "text-green-600"
                            : plan.color === "purple"
                              ? "text-purple-600"
                              : "text-gray-600"
                      }`}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">{plan.name}</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">{plan.tagline}</CardDescription>
                  </div>
                </div>

                <div className="space-y-2">
                  {plan.originalPrice && billingCycle === "monthly" && (
                    <div className="text-sm text-gray-400">
                      <span className="line-through">Previously ${plan.originalPrice}/month</span>
                    </div>
                  )}

                  <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-4xl font-bold text-gray-900">
                      ${billingCycle === "yearly" && plan.yearlyPrice ? plan.yearlyPrice : plan.price}
                    </span>
                    <span className="text-gray-500">
                      /{billingCycle === "yearly" && plan.yearlyPrice ? "year" : plan.period}
                    </span>
                  </div>

                  {billingCycle === "yearly" && plan.yearlyPrice && plan.period !== "one-time" && (
                    <div className="space-y-1">
                      <p className="text-sm text-green-600 font-medium">
                        Just ${(plan.yearlyPrice / 12).toFixed(2)}/month when billed annually
                      </p>
                      {plan.yearlyOriginal && (
                        <p className="text-xs text-gray-500">
                          <span className="line-through">${plan.yearlyOriginal}/year</span> • Save{" "}
                          {calculateSavings(plan.price, plan.yearlyPrice)}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-sm text-gray-600 text-center">{plan.description}</p>

                <div className="space-y-3">
                  <Collapsible open={expandedFeatures.includes(plan.id)} onOpenChange={() => toggleFeatures(plan.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto text-sm font-medium">
                        Features included
                        {expandedFeatures.includes(plan.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {plan.features.slice(0, 3).map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start space-x-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 3 && (
                        <div className="space-y-2">
                          {plan.features.slice(3).map((feature, featureIndex) => (
                            <div key={featureIndex + 3} className="flex items-start space-x-2">
                              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-600">{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                      : plan.color === "green"
                        ? "bg-green-600 hover:bg-green-700"
                        : plan.color === "purple"
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-gray-600 hover:bg-gray-700"
                  } text-white transition-all duration-200`}
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

                {plan.limitations.length > 0 && (
                  <div className="pt-2 text-center">
                    {plan.limitations.map((limitation, limitIndex) => (
                      <p key={limitIndex} className="text-xs text-green-600 font-medium">
                        {limitation}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mb-20">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose ResumePilot?</h2>
            <p className="text-lg text-gray-600">Advanced AI technology meets professional resume writing</p>
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
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-20">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600">Everything you need to know about ResumePilot</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="text-center space-y-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
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
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">ResumePilot</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered resume builder that helps software engineers craft compelling, ATS-optimized resumes with
                STAR and XYZ format bullets through voice interviews.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Product</h4>
              <div className="space-y-2 text-sm">
                <Link href="/#how-it-works" className="block text-gray-400 hover:text-white transition-colors">
                  How It Works
                </Link>
                <Link href="/#demo" className="block text-gray-400 hover:text-white transition-colors">
                  Demo
                </Link>
                <Link href="/pricing" className="block text-gray-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Company</h4>
              <div className="space-y-2 text-sm">
                <Link href="/about" className="block text-gray-400 hover:text-white transition-colors">
                  About
                </Link>
                <Link href="/contact" className="block text-gray-400 hover:text-white transition-colors">
                  Contact
                </Link>
                <Link href="/privacy" className="block text-gray-400 hover:text-white transition-colors">
                  Privacy
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Connect</h4>
              <div className="space-y-2 text-sm">
                <a
                  href="https://github.com/resumepilot"
                  className="block text-gray-400 hover:text-white transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://twitter.com/ResumePilot"
                  className="block text-gray-400 hover:text-white transition-colors"
                >
                  Twitter (@ResumePilot)
                </a>
                <a
                  href="mailto:info@resumepilot.com"
                  className="block text-gray-400 hover:text-white transition-colors"
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
