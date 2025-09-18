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
import { ThemeToggle } from "@/components/theme-provider"
import { useRef } from "react"

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showWaitlist, setShowWaitlist] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()
  const heroVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  useEffect(() => {
    // Check URL parameters for signin or signup
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.has("signin") || searchParams.has("signup")) {
      setShowAuthModal(true)
    }
  }, [])

  // Loop video from 40s to end
  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return
    const handleTimeUpdate = () => {
      if (video.currentTime < 40) {
        video.currentTime = 40
      }
    }
    const handleLoadedMetadata = () => {
      if (video.currentTime < 40) {
        video.currentTime = 40
      }
    }
    const handleEnded = () => {
      video.currentTime = 40
      video.play()
    }
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)
    // Set start time if already loaded
    if (video.readyState >= 1 && video.currentTime < 40) {
      video.currentTime = 40
    }
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
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
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">ResumePilot</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#how-it-works" className="text-gray-600 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="#demo" className="text-gray-600 hover:text-gray-900 transition-colors">
                Demo
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/affiliate" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors font-semibold">
                Affiliate
              </Link>
              <Link href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors">
                FAQ
              </Link>
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => setShowAuthModal(true)}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center">
            <div className="space-y-4 text-center w-full">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 mx-auto">
                <Zap className="w-3 h-3 mr-1" />
                AI-Powered Resume Builder
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                Let Your Voice Build the{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Resume
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed text-center max-w-2xl mx-auto">
                ResumePilot uses voice interviews and AI to craft tailored, ATS-optimized resumes with STAR and XYZ
                format bullets for software engineers.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white dark:text-white"
                onClick={() => (user ? (window.location.href = "/dashboard") : setShowAuthModal(true))}
              >
                <Play className="w-4 h-4 mr-2 text-white" />
                {user ? "Go to Dashboard" : "Try the Demo"}
              </Button>
              <Button variant="outline" size="lg">
                How It Works
              </Button>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500 justify-center mt-6">
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
            {/* Large autoplaying video below all hero content */}
            <div className="relative w-full flex justify-center mt-10 mb-8">
              <div className="relative w-full max-w-3xl">
                <video
                  src="/videos/DEMO1.mp4"
                  autoPlay
                  muted
                  playsInline
                  className="w-full rounded-2xl shadow-2xl border"
                  style={{ objectFit: 'cover', maxHeight: '420px' }}
                  aria-label="ResumePilot Demo Video"
                  ref={heroVideoRef}
                >
                  Your browser does not support the video tag.
                </video>
                {/* Gradient overlay at the bottom of the video */}
                <div
                  className="pointer-events-none absolute left-0 right-0 bottom-0 h-20 rounded-b-2xl"
                  style={{
                    background: 'linear-gradient(to top, rgba(255,255,255,0.45) 60%, rgba(255,255,255,0) 100%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100">The Resume Problem Engineers Actually Face</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: Target,
                title: "Design Over Substance",
                description: "Most resume builders focus on design, not substance.",
                color: "from-red-400 to-red-600",
                badge: "01",
              },
              {
                icon: Brain,
                title: "Generic AI Tools",
                description: "AI tools don't ask the right questions or know your projects.",
                color: "from-red-400 to-red-600",
                badge: "02",
              },
              {
                icon: FileText,
                title: "Generic Results",
                description: "You end up with generic bullets that don't reflect your skills.",
                color: "from-red-400 to-red-600",
                badge: "03",
              },
            ].map((problem, index) => (
              <div
                key={index}
                className="relative group bg-white/70 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 flex flex-col items-center transition-transform duration-200 hover:-translate-y-2 hover:shadow-2xl"
                style={{ minHeight: 320 }}
              >
                {/* Numbered badge */}
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-900 to-gray-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg tracking-widest">
                  {problem.badge}
                </span>
                {/* Icon in gradient/glass circle */}
                <div
                  className={`mb-6 w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br ${problem.color} shadow-lg group-hover:scale-110 transition-transform duration-200`}
                  style={{ backdropFilter: 'blur(6px)' }}
                >
                  <problem.icon className="w-8 h-8 text-white drop-shadow" />
                </div>
                {/* Title */}
                <h3 className="font-extrabold text-lg text-gray-900 dark:text-gray-100 mb-2 text-center tracking-tight">
                  {problem.title}
                </h3>
                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 text-base text-center leading-relaxed">
                  {problem.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <div className="relative">
        <section id="how-it-works" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50 dark:bg-gradient-to-br dark:from-blue-950 dark:to-purple-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100">How ResumePilot Works</h2>
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
                <Card key={index} className="border-0 shadow-lg bg-white dark:bg-gray-900">
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
                      <Badge variant="secondary" className="absolute -top-2 -right-2 bg-white border-2 border-gray-100 dark:bg-gray-900 dark:text-white dark:border-gray-700">
                        {step.step}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{step.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        <div
          className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100%\\' height=\\'100%\\'><filter id=\\'noise\\'><feTurbulence type=\\'fractalNoise\\' baseFrequency=\\'1.5\\' numOctaves=\\'6\\' stitchTiles=\\'stitch\\'/></filter><rect width=\\'100%\\' height=\\'100%\\' filter=\\'url(%23noise)\\' opacity=\\'0.18\\'/></svg>')",
            opacity: 0.18,
            mixBlendMode: 'overlay',
          }}
        />
      </div>

      {/* Product Demo Section */}
      <section id="demo" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100">See It in Action</h2>
          </div>
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white dark:from-gray-950 dark:to-gray-900">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-600">
                    <Mic className="w-3 h-3 mr-1" />
                    Voice Interview
                  </Badge>
                  <h3 className="text-2xl font-bold">Interactive Demo</h3>
                  <p className="text-gray-300 dark:text-gray-200">
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
                {/* Replace placeholder image with DEMO1.mp4 video */}
                <div className="relative w-full flex justify-center">
                  <video
                    src="/videos/DEMO1.mp4"
                    controls
                    playsInline
                    className="w-full max-w-7xl rounded-2xl border border-gray-700 shadow-xl"
                    style={{ maxHeight: '900px', objectFit: 'cover' }}
                    aria-label="ResumePilot Demo Video"
                  >
                    Your browser does not support the video tag.
                  </video>
                  {/* Optional: If you want a subtle gradient, place it only at the bottom and pointer-events-none */}
                  <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-16 rounded-b-2xl" style={{background: 'linear-gradient(to top, rgba(255,255,255,0.25) 60%, rgba(255,255,255,0) 100%)'}} />
                </div>
                {/* <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent rounded-lg" /> */}

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <div className="relative">
        <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50 dark:bg-gradient-to-br dark:from-blue-950 dark:to-purple-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100">Loved by Engineers</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: "Sarah C.",
                  role: "Software Engineer",
                  company: "Spotify",
                  quote:
                    "This finally captured what I actually built at my first job. The AI understood the technical complexity better than I could explain it myself.",
                  rating: 5,
                },
                {
                  name: "Marcus R.",
                  role: "Frontend Developer",
                  company: "Shopify",
                  quote:
                    "I've tried every resume builder out there. ResumePilot is the first one that actually gets what developers do day-to-day. The STAR and XYZ format bullets perfectly captured my impact.",
                  rating: 5,
                },
                {
                  name: "Emily Z.",
                  role: "Full Stack Developer",
                  company: "Stripe",
                  quote:
                    "The voice interview felt natural and the questions were spot-on. My resume now actually reflects my development work properly.",
                  rating: 5,
                },
              ].map((testimonial, index) => (
                <Card key={index} className="border-0 shadow-lg bg-white dark:bg-gray-900">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex space-x-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 italic">"{testimonial.quote}"</p>
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{testimonial.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        {testimonial.role} at {testimonial.company}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        <div
          className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100%\\' height=\\'100%\\'><filter id=\\'noise\\'><feTurbulence type=\\'fractalNoise\\' baseFrequency=\\'1.5\\' numOctaves=\\'6\\' stitchTiles=\\'stitch\\'/></filter><rect width=\\'100%\\' height=\\'100%\\' filter=\\'url(%23noise)\\' opacity=\\'0.18\\'/></svg>')",
            opacity: 0.18,
            mixBlendMode: 'overlay',
          }}
        />
      </div>

      {/* Waitlist Section */}
      <section id="waitlist" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100">Join the Waitlist</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Be the first to experience ResumePilot when we launch</p>
          </div>
          <div className="flex justify-center">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <div className="relative">
        <section id="faq" className="py-20 bg-gray-50 dark:bg-gradient-to-br dark:from-blue-950 dark:to-purple-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
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
                <div key={index} className="bg-white rounded-lg shadow-md p-6 dark:bg-gray-900">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{faq.question}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div
          className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100%\\' height=\\'100%\\'><filter id=\\'noise\\'><feTurbulence type=\\'fractalNoise\\' baseFrequency=\\'1.5\\' numOctaves=\\'6\\' stitchTiles=\\'stitch\\'/></filter><rect width=\\'100%\\' height=\\'100%\\' filter=\\'url(%23noise)\\' opacity=\\'0.18\\'/></svg>')",
            opacity: 0.18,
            mixBlendMode: 'overlay',
          }}
        />
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="rounded-lg">
                  <img
                    src="/images/resumepilot-logo.png"
                    alt="ResumePilot Logo"
                    className="object-contain"
                    style={{ width: "40px", height: "40px", borderRadius: "9px" }}
                  />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">ResumePilot</span>
              </div>
              <p className="text-gray-400 dark:text-gray-300 text-sm">
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
                <Link href="/affiliate" className="block text-blue-400 hover:text-white transition-colors font-semibold">
                  Affiliate
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
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400 dark:text-gray-300">
            <p>&copy; 2024 ResumePilot. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}
