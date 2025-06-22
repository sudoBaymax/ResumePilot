"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResumeUpload } from "@/components/interview/resume-upload"
import { ConversationalRecorder } from "@/components/interview/conversational-recorder"
import { ChatInterview } from "@/components/interview/chat-interview"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import {
  FileText,
  CheckCircle,
  MessageCircle,
  ArrowRight,
  AlertTriangle,
  Mic,
  MessageSquare,
  Sparkles,
  Clock,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AiResumeChatbot } from "@/components/interview/ai-resume-chatbot"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth/auth-provider"
import { ResumeDownload } from "./resume-download"
import { VoiceRecorder } from "@/components/interview/voice-recorder"
import { ResumeAnalyzer } from "./resume-analyzer"

interface ConversationalSessionProps {
  userId: string
  roleType?: string
  onComplete: (bullets: any[]) => void
}

interface ConversationTurn {
  speaker: "ai" | "user"
  message: string
  timestamp: number
  audioBlob?: Blob
}

type InterviewMode = "voice" | "chat" | "resume-analyzer"

const MAX_CONVERSATION_TIME = 900 // 15 minutes in seconds

export function ConversationalSession({ userId, roleType, onComplete }: ConversationalSessionProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState<"upload" | "mode-select" | "interview" | "complete">("upload")
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("chat")
  const [conversation, setConversation] = useState<ConversationTurn[]>([])
  const [currentAIMessage, setCurrentAIMessage] = useState<string>("")
  const [isAITalking, setIsAITalking] = useState(false)
  const [resumeText, setResumeText] = useState("")
  const [currentTime, setCurrentTime] = useState(0)
  const [generatedBullets, setGeneratedBullets] = useState<any[]>([])
  const [resumeData, setResumeData] = useState<any>(null)
  const [template, setTemplate] = useState<string>("")
  const [downloads, setDownloads] = useState<any>(null)
  const [isGeneratingResume, setIsGeneratingResume] = useState(false)
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [conversationId, setConversationId] = useState<string>("")
  const [turnNumber, setTurnNumber] = useState(1)

  useEffect(() => {
    if (step === "interview") {
      timeIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= MAX_CONVERSATION_TIME) {
            endConversation([])
            return prev
          }
          return prev + 1
        })
      }, 1000)
    }

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
      }
    }
  }, [step])

  const handleResumeUploaded = (text: string, fileName: string) => {
    setResumeText(text)
      setStep("mode-select")
  }

  const handleModeSelect = (mode: InterviewMode) => {
    setInterviewMode(mode)
    setStep("interview")
    startConversation()
  }

  const generatePersonalizedOpener = (resumeText: string): string => {
    if (!resumeText) {
      return `Hi! I'm excited to help you create a compelling resume for ${roleType || "Software Engineer"} roles. Let's start by learning about your background and experience. What's your current role or the position you're targeting?`
    }

    // Extract key information from resume
    const hasExperience = resumeText.toLowerCase().includes("experience") || resumeText.toLowerCase().includes("work")
    const hasProjects = resumeText.toLowerCase().includes("project") || resumeText.toLowerCase().includes("github")
    const hasEducation = resumeText.toLowerCase().includes("education") || resumeText.toLowerCase().includes("degree")

    let opener = `Hi! I can see from your resume that you have a strong background. `

    if (hasExperience) {
      opener += `I notice you have relevant experience. `
    }
    if (hasProjects) {
      opener += `You've worked on some interesting projects. `
    }
    if (hasEducation) {
      opener += `Your educational background looks great. `
    }

    opener += `Let's dive deeper to create compelling XYZ-format bullets that will make your ${roleType || "Software Engineer"} resume stand out. What's the most impactful project or experience you'd like to highlight first?`

    return opener
  }

  const startConversation = async () => {
    const opener = generatePersonalizedOpener(resumeText)
    
    const aiTurn: ConversationTurn = {
        speaker: "ai",
      message: opener,
        timestamp: Date.now(),
    }

    setConversation([aiTurn])
    setCurrentAIMessage(opener)

    // Simulate AI speaking for voice mode
    if (interviewMode === "voice") {
      setIsAITalking(true)
      setTimeout(() => setIsAITalking(false), Math.min(opener.length * 50, 4000))
    }
  }

  const handleVoiceResponse = async (audioBlob: Blob, duration: number) => {
    if (!user) return

    try {
      // Transcribe audio
      const formData = new FormData()
      formData.append("audio", audioBlob)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch("/api/interview/transcribe", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Transcription failed")
      }

      const { text } = await response.json()

      if (!text || text.trim() === "") {
        toast({
          title: "No speech detected",
          description: "Please try speaking again or use the chat mode.",
          variant: "destructive",
        })
        return
      }

      // Process the transcribed message
      await processUserMessage(text)
    } catch (error) {
      console.error("Error processing voice response:", error)
      toast({
        title: "Error",
        description: "Failed to process voice input. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleChatResponse = async (message: string) => {
    if (!message.trim()) return
      await processUserMessage(message)
  }

  const processUserMessage = async (message: string) => {
    console.log("Processing user message:", message.substring(0, 100))

    // Validate message
    if (!message || typeof message !== 'string' || message.trim() === '') {
      console.error("Invalid message received:", message)
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error("No authentication token available")
    }

    // Add user response to conversation
    const userTurn: ConversationTurn = {
      speaker: "user",
      message: message,
      timestamp: Date.now(),
    }

    const updatedConversation = [...conversation, userTurn]
    setConversation(updatedConversation)

    // Check if we should end the conversation based on context quality
    const userResponses = updatedConversation.filter((turn) => turn.speaker === "user")
    const timeLimit = currentTime >= MAX_CONVERSATION_TIME - 180
    const turnLimit = userResponses.length >= 10 // Increased from 8 to 10
    
    // Assess context quality
    const hasTechnicalDetails = message.toLowerCase().includes("react") || 
                               message.toLowerCase().includes("python") || 
                               message.toLowerCase().includes("api") || 
                               message.toLowerCase().includes("database") ||
                               message.toLowerCase().includes("algorithm") ||
                               message.toLowerCase().includes("framework")
    
    const hasMetrics = /\d+%|\d+ users|\d+ customers|\d+ projects|\d+ team|\$\d+|\d+ hours|\d+ days/.test(message)
    
    // End if we have good context or hit limits
    const shouldEndNow = timeLimit || turnLimit || (userResponses.length >= 6 && hasTechnicalDetails && hasMetrics)

    if (shouldEndNow) {
      console.log("Ending conversation due to:", {
        timeLimit,
        turnLimit,
        contextQuality: userResponses.length >= 6 && hasTechnicalDetails && hasMetrics,
        userResponses: userResponses.length
      })
      
      const endMessage = userResponses.length >= 6 
        ? "Excellent! I have comprehensive information from our conversation. Let me generate your professional resume now."
        : "Perfect! I have good material from our conversation. Let me generate your professional resume now."

      const finalAiTurn: ConversationTurn = {
        speaker: "ai",
        message: endMessage,
        timestamp: Date.now(),
      }

      setConversation((prev) => [...prev, finalAiTurn])
      setCurrentAIMessage(endMessage)

      setTimeout(() => {
        endConversation([])
      }, 2000)
      return
    }

    // Generate AI follow-up using the enhanced chat API
    console.log("Generating AI follow-up...")

    try {
      // For chat mode, use the enhanced chat API with resume context
      const response = await fetch("/api/interview/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userMessage: message,
          resumeText: resumeText,
          conversation: updatedConversation,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Chat API failed: ${response.status}`, errorText)
        throw new Error(`Chat API failed: ${response.status}`)
      }

      // Handle JSON response
      const followUpData = await response.json()
      console.log("Chat response:", followUpData)

    const { message: aiMessage, shouldEnd, bullets } = followUpData

    // Add AI response to conversation
    const aiTurn: ConversationTurn = {
      speaker: "ai",
      message: aiMessage || "Can you elaborate on the technical details of that?",
      timestamp: Date.now(),
    }

    setConversation((prev) => [...prev, aiTurn])
    setCurrentAIMessage(aiMessage || "Can you elaborate on the technical details of that?")

    // Simulate AI speaking for voice mode
    if (interviewMode === "voice") {
      setIsAITalking(true)
      setTimeout(() => setIsAITalking(false), Math.min((aiMessage?.length || 50) * 50, 4000))
    }

    // Check if conversation should end
    if (shouldEnd) {
      setTimeout(() => {
        endConversation(bullets || [])
      }, 2000)
      }
    } catch (followUpError) {
      console.error("Follow-up generation failed:", followUpError)

      // Generate a contextual fallback based on what the user just said
      const lastMessage = message.toLowerCase()
      let fallbackMessage = "That's interesting! Can you tell me more about that?"

      if (lastMessage.includes("react") || lastMessage.includes("frontend")) {
        fallbackMessage = "What specific React features did you implement and how many users does it serve?"
      } else if (lastMessage.includes("api") || lastMessage.includes("backend")) {
        fallbackMessage = "What was the scale of this API and how did you optimize its performance?"
      } else if (lastMessage.includes("database") || lastMessage.includes("sql")) {
        fallbackMessage = "How did you design the database schema and what performance improvements did you achieve?"
      } else if (lastMessage.includes("team") || lastMessage.includes("collaborate")) {
        fallbackMessage = "How big was the team and what was your specific role in the project?"
      } else if (lastMessage.includes("improve") || lastMessage.includes("optimize")) {
        fallbackMessage = "What specific metrics improved and by how much?"
      }

      const aiTurn: ConversationTurn = {
        speaker: "ai",
        message: fallbackMessage,
        timestamp: Date.now(),
      }

      setConversation((prev) => [...prev, aiTurn])
      setCurrentAIMessage(fallbackMessage)

      // Simulate AI speaking for voice mode
      if (interviewMode === "voice") {
        setIsAITalking(true)
        setTimeout(() => setIsAITalking(false), Math.min(fallbackMessage.length * 50, 4000))
      }
    }
  }

  const endConversation = async (bullets: any[]) => {
    console.log("Ending conversation with", bullets.length, "bullets")

    // Generate resume from conversation
    setIsGeneratingResume(true)
    
    try {
      // Temporarily remove authentication for testing
      // const {
      //   data: { session },
      // } = await supabase.auth.getSession()

      // if (!session?.access_token) {
      //   throw new Error("No authentication token available")
      // }

      const response = await fetch("/api/interview/generate-resume", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
          // Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
          conversation,
          resumeText,
          roleType,
          templateName: "jakes-resume",
          userInfo: {
            name: user?.user_metadata?.full_name || "User",
            email: user?.email || "",
          }
            }),
          })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Resume generation failed:", response.status, errorData)
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate resume`)
      }

      const result = await response.json()
      setResumeData(result.data)
      setTemplate(result.template)
      setDownloads(result.downloads)
      setGeneratedBullets(bullets)
    setStep("complete")

    toast({
        title: "Resume Generated!",
        description: "Your professional resume is ready for download.",
      })
    } catch (error) {
      console.error("Error generating resume:", error)
      toast({
        title: "Resume Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingResume(false)
    }

    onComplete(bullets)
  }

  if (step === "upload") {
    return (
      <div className="space-y-6">
        <ResumeUpload onResumeUploaded={handleResumeUploaded} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
              What to Expect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Choose Your Style</h4>
                <p className="text-sm text-gray-600">
                  Pick between voice conversation or text chat - whatever feels more comfortable for you.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Contextual Questions</h4>
                <p className="text-sm text-gray-600">
                  I'll ask specific follow-up questions based on what you tell me, diving deeper into technologies,
                  metrics, and impact.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">15 Minutes Total</h4>
                <p className="text-sm text-gray-600">
                  Short, focused conversation that builds on each response to gather the details needed for compelling
                  resume bullets.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Professional Results</h4>
                <p className="text-sm text-gray-600">
                  I'll help you identify specific metrics, technologies, and impact details for professional XYZ format
                  bullets.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "mode-select") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Choose Your Interview Style</CardTitle>
            <CardDescription className="text-center">
              Pick the format that feels most comfortable for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-200"
                onClick={() => handleModeSelect("voice")}
              >
                <CardContent className="p-6 text-center">
                  <Mic className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-lg font-semibold mb-2">Voice Interview</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Speak naturally and have a conversational interview. I'll ask follow-up questions based on your
                    responses.
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Natural conversation flow</li>
                    <li>• Automatic transcription</li>
                    <li>• Great for detailed explanations</li>
                  </ul>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-200"
                onClick={() => handleModeSelect("chat")}
              >
                <CardContent className="p-6 text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-lg font-semibold mb-2">Text Chat</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Type your responses and have a focused conversation. Perfect for precise technical details.
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Precise technical details</li>
                    <li>• Easy to review and edit</li>
                    <li>• Faster response times</li>
                  </ul>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-200"
                onClick={() => handleModeSelect("resume-analyzer")}
              >
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                  <h3 className="text-lg font-semibold mb-2">Resume Analysis</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Ask specific questions about your resume and get personalized insights and recommendations.
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Resume-specific questions</li>
                    <li>• Detailed analysis</li>
                    <li>• Improvement suggestions</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "interview") {
    return (
      <div className="space-y-6">
        {/* Interview Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                {interviewMode === "voice" ? (
                  <Mic className="w-5 h-5 mr-2 text-blue-600" />
                ) : (
                  <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
                )}
                {interviewMode === "voice" ? "Voice Interview" : "Text Chat"}
              </CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <Badge variant="outline">
                  {conversation.filter((turn) => turn.speaker === "user").length} responses
                </Badge>
              </div>
            </div>
            <CardDescription>
              {interviewMode === "voice"
                ? "Speak naturally and I'll ask follow-up questions to gather details for your resume."
                : "Type your responses and I'll help you create compelling XYZ-format bullets."}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Interview Interface */}
        {interviewMode === "voice" ? (
          <VoiceRecorder
            onTranscriptReady={handleVoiceResponse}
            isProcessing={isGeneratingResume}
            currentQuestion={currentAIMessage}
            onNextQuestion={() => {}}
            isLastQuestion={false}
          />
        ) : interviewMode === "chat" ? (
          <ChatInterview
            onResponseReady={handleChatResponse}
            isProcessing={isGeneratingResume}
            currentMessage={currentAIMessage}
            conversationTime={currentTime}
            maxTime={MAX_CONVERSATION_TIME}
            conversation={conversation}
          />
        ) : (
          <ResumeAnalyzer resumeText={resumeText} />
        )}

        {/* Resume Generation Progress */}
        {isGeneratingResume && (
        <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <div>
                  <h3 className="font-medium">Generating Your Resume</h3>
                  <p className="text-sm text-gray-600">
                    Creating professional XYZ-format bullets and processing your LaTeX template...
                  </p>
                </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    )
  }

  if (step === "complete") {
    return (
      <ResumeDownload
        resumeData={resumeData}
        template={template}
        downloads={downloads}
        onRegenerate={() => {
          setStep("upload")
          setConversation([])
          setCurrentAIMessage("")
          setResumeData(null)
          setTemplate("")
          setDownloads(null)
        }}
      />
    )
  }

  return null
}
