"use client"

import { useState, useEffect } from "react"
import { AuthModal } from "@/components/auth/auth-modal"
import { WaitlistForm } from "@/components/waitlist/waitlist-form"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, Brain, FileText, CheckCircle, Star, Github, Twitter, Mail, Play, Zap, Target } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showWaitlist, setShowWaitlist] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="rounded-lg border-[25px] border-white/20 p-1 bg-white/10">
                <img
                  src="/images/resumepilot-logo.png"
                  alt="ResumePilot Logo"
                  className="object-contain"
                  style={{ width: "40px", height: "40px", borderRadius: "9px" }}
                />
              </div>
              <span className="text-xl font-bold text-gray-900">ResumePilot</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">
                How It Works
              </Link>
              <Link href="#demo" className="text-gray-600 hover:text-gray-900 transition-colors">
                Demo
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors">
                FAQ
              </Link>
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  <Zap className="w-3 h-3 mr-1" />
                  AI-Powered Resume Builder
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Let Your Voice Build the{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Resume
                  </span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  ResumePilot uses voice interviews and AI to craft tailored, ATS-optimized resumes with STAR and XYZ
                  format bullets for software engineers.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => (user ? (window.location.href = "/dashboard") : setShowAuthModal(true))}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {user ? "Go to Dashboard" : "Try the Demo"}
                </Button>
                <Button variant="outline" size="lg">
                  How It Works
                </Button>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>ATS-Optimized</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>STAR & XYZ Format</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>SWE Focused</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 border">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Resume Preview</h3>
                    <Badge variant="secondary">Live Demo</Badge>
                  </div>
                  <img
                    src="/placeholder.svg?height=400&width=300"
                    alt="Resume mockup"
                    className="w-full rounded-lg border"
                  />
                  <div className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="flex space-x-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-8 bg-gradient-to-t from-blue-400 to-purple-400 rounded-full animate-pulse"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600 ml-2">Voice interview in progress...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">The Resume Problem Engineers Actually Face</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Design Over Substance",
                description: "Most resume builders focus on design, not substance.",
              },
              {
                icon: Brain,
                title: "Generic AI Tools",
                description: "AI tools don't ask the right questions or know your projects.",
              },
              {
                icon: FileText,
                title: "Generic Results",
                description: "You end up with generic bullets that don't reflect your skills.",
              },
            ].map((problem, index) => (
              <Card key={index} className="border-2 border-red-100 bg-red-50/50">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto">
                    <problem.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{problem.title}</h3>
                  <p className="text-gray-600">{problem.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">How ResumePilot Works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "Step 1",
                icon: Mic,
                title: "We Interview You",
                description: "AI voice assistant asks deep, recruiter-style questions.",
                color: "blue",
              },
              {
                step: "Step 2",
                icon: Brain,
                title: "Context is Parsed",
                description: "Extract tech stack, impact, and ownership from answers.",
                color: "purple",
              },
              {
                step: "Step 3",
                icon: FileText,
                title: "Bullet Points Are Generated",
                description: "STAR and XYZ format results tailored for SWE roles.",
                color: "green",
              },
            ].map((step, index) => (
              <Card key={index} className="border-0 shadow-lg bg-white">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="relative">
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${
                        step.color === "blue"
                          ? "from-blue-500 to-blue-600"
                          : step.color === "purple"
                            ? "from-purple-500 to-purple-600"
                            : "from-green-500 to-green-600"
                      } rounded-xl flex items-center justify-center mx-auto`}
                    >
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <Badge variant="secondary" className="absolute -top-2 -right-2 bg-white border-2 border-gray-100">
                      {step.step}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Product Demo Section */}
      <section id="demo" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">See It in Action</h2>
          </div>
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-600">
                    <Mic className="w-3 h-3 mr-1" />
                    Voice Interview
                  </Badge>
                  <h3 className="text-2xl font-bold">Interactive Demo</h3>
                  <p className="text-gray-300">
                    Experience how our AI conducts a real interview and generates professional resume content.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100"
                  onClick={() => (user ? (window.location.href = "/dashboard") : setShowAuthModal(true))}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {user ? "Start Interview" : "Try a Sample Interview"}
                </Button>
              </div>
              <div className="relative">
                <img
                  src="/placeholder.svg?height=300&width=400"
                  alt="Demo interface"
                  className="w-full rounded-lg border border-gray-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent rounded-lg" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm">Recording: "Tell me about your most challenging project..."</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Loved by Engineers</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Chen",
                role: "Senior Frontend Engineer",
                company: "TechCorp",
                quote:
                  "This finally captured what I actually built at my last job. The AI understood the technical complexity better than I could explain it myself.",
                rating: 5,
              },
              {
                name: "Marcus Rodriguez",
                role: "Full Stack Developer",
                company: "StartupXYZ",
                quote:
                  "I've tried every resume builder out there. ResumePilot is the first one that actually gets what software engineers do day-to-day. The STAR and XYZ format bullets perfectly captured my impact.",
                rating: 5,
              },
              {
                name: "Emily Zhang",
                role: "DevOps Engineer",
                company: "CloudScale",
                quote:
                  "The voice interview felt natural and the questions were spot-on. My resume now actually reflects my infrastructure work properly.",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg bg-white">
                <CardContent className="p-6 space-y-4">
                  <div className="flex space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 italic">"{testimonial.quote}"</p>
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Join the Waitlist</h2>
            <p className="text-xl text-gray-600">Be the first to experience ResumePilot when we launch</p>
          </div>
          <div className="flex justify-center">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                question: "How does the voice interview work?",
                answer:
                  "Our AI voice assistant guides you through a structured interview, asking questions about your experience, projects, and skills.",
              },
              {
                question: "Is my data secure?",
                answer:
                  "Yes, we use industry-standard security measures to protect your data. Your information is encrypted and stored securely.",
              },
              {
                question: "What format do you use for resume bullets?",
                answer:
                  "We generate resume bullets in both STAR (Situation, Task, Action, Result) and XYZ (Accomplished X as measured by Y by doing Z) formats. Our AI automatically chooses the best format based on your specific experience and the type of achievement you're describing.",
              },
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                <p className="text-gray-600 mt-2">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="rounded-lg border-[25px] border-white/20 p-1 bg-white/10">
                  <img
                    src="/images/resumepilot-logo.png"
                    alt="ResumePilot Logo"
                    className="object-contain"
                    style={{ width: "40px", height: "40px", borderRadius: "9px" }}
                  />
                </div>
                <span className="text-xl font-bold">ResumePilot</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered resume builder that helps software engineers craft compelling, ATS-optimized resumes through
                voice interviews.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Product</h4>
              <div className="space-y-2 text-sm">
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">
                  How It Works
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Demo
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Company</h4>
              <div className="space-y-2 text-sm">
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">
                  About
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Contact
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Privacy
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Connect</h4>
              <div className="flex space-x-4">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Github className="w-5 h-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 ResumePilot. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}
