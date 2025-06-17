"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResumeUpload } from "@/components/interview/resume-upload"
import { ConversationalRecorder } from "@/components/interview/conversational-recorder"
import { ChatInterview } from "@/components/interview/chat-interview"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { FileText, CheckCircle, MessageCircle, ArrowRight, AlertTriangle, Mic, MessageSquare } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus"
import { useRouter } from "next/navigation"

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

type InterviewMode = "voice" | "chat"

export function ConversationalSession({ userId, roleType, onComplete }: ConversationalSessionProps) {
  const [step, setStep] = useState<"upload" | "mode-select" | "interview" | "complete">("upload")
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("voice")
  const [resumeText, setResumeText] = useState("")
  const [resumeFileName, setResumeFileName] = useState("")
  const [conversation, setConversation] = useState<ConversationTurn[]>([])
  const [currentAIMessage, setCurrentAIMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAITalking, setIsAITalking] = useState(false)
  const [conversationStartTime, setConversationStartTime] = useState<number>(0)
  const [generatedBullets, setGeneratedBullets] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const [conversationId, setConversationId] = useState<string>("")
  const [turnNumber, setTurnNumber] = useState(1)

  const MAX_CONVERSATION_TIME = 15 * 60 // 15 minutes in seconds
  const currentTime = conversationStartTime > 0 ? Math.floor((Date.now() - conversationStartTime) / 1000) : 0

  const router = useRouter()

  const { subscription, usage, limits, loading: subLoading } = useSubscriptionStatus()

  // Block interview if no active subscription or over limit
  const overLimit =
    subscription && usage && limits &&
    ((limits.interviews !== undefined && usage.interviews_used >= limits.interviews && limits.interviews !== -1))
  const noActive = !subLoading && (!subscription || subscription.status !== "active")

  useEffect(() => {
    if (step === "interview" && conversation.length === 0) {
      startConversation()
    }
  }, [step])

  const handleResumeUploaded = (text: string, fileName: string) => {
    setResumeText(text)
    setResumeFileName(fileName)
    if (text.trim()) {
      setStep("mode-select")
    }
  }

  const handleModeSelect = (mode: InterviewMode) => {
    setInterviewMode(mode)
    setStep("interview")
  }

  const generatePersonalizedOpener = (resumeText: string): string => {
    const text = resumeText.toLowerCase()

    // Extract key technologies or roles from resume
    const technologies = []
    if (text.includes("react")) technologies.push("React")
    if (text.includes("node")) technologies.push("Node.js")
    if (text.includes("python")) technologies.push("Python")
    if (text.includes("aws")) technologies.push("AWS")
    if (text.includes("kubernetes")) technologies.push("Kubernetes")
    if (text.includes("docker")) technologies.push("Docker")

    const roles = []
    if (text.includes("senior")) roles.push("senior")
    if (text.includes("lead")) roles.push("lead")
    if (text.includes("full stack")) roles.push("full-stack")
    if (text.includes("frontend")) roles.push("frontend")
    if (text.includes("backend")) roles.push("backend")

    let opener = "Hi! I've reviewed your resume and I'm excited to learn more about your experience. "

    if (technologies.length > 0) {
      opener += `I see you work with ${technologies.slice(0, 2).join(" and ")}. `
    }

    if (roles.length > 0) {
      opener += `As a ${roles[0]} developer, `
    }

    opener +=
      "let's dive into a specific project you've worked on recently. Can you tell me about one project you're particularly proud of and what technologies you used to build it?"

    return opener
  }

  const startConversation = async () => {
    setConversationStartTime(Date.now())
    setError(null)

    const newConversationId = crypto.randomUUID()
    setConversationId(newConversationId)

    // Generate a personalized opener based on the resume
    const initialMessage = resumeText
      ? generatePersonalizedOpener(resumeText)
      : "Hi! Let's talk about your recent work experience. Can you tell me about a specific project you've worked on recently? I'd love to hear about what you built and what technologies you used."

    setCurrentAIMessage(initialMessage)
    setConversation([
      {
        speaker: "ai",
        message: initialMessage,
        timestamp: Date.now(),
      },
    ])

    // Simulate AI speaking time for voice mode
    if (interviewMode === "voice") {
      setIsAITalking(true)
      setTimeout(() => setIsAITalking(false), 4000)
    }
  }

  const handleVoiceResponse = async (audioBlob: Blob, duration: number) => {
    setIsProcessing(true)
    setError(null)

    try {
      console.log("Processing voice response...")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("No authentication token available")
      }

      // Transcribe user response
      console.log("Transcribing audio...")
      const formData = new FormData()
      formData.append("audio", audioBlob, `conversation-${Date.now()}.webm`)
      formData.append("question", currentAIMessage)
      formData.append("duration", duration.toString())
      formData.append("conversationId", conversationId)
      formData.append("turnNumber", turnNumber.toString())

      const transcribeResponse = await fetch("/api/interview/transcribe", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!transcribeResponse.ok) {
        const errorText = await transcribeResponse.text()
        console.error("Transcription failed:", errorText)
        throw new Error(`Transcription failed: ${transcribeResponse.status}`)
      }

      const transcribeData = await transcribeResponse.json()
      const { transcript } = transcribeData

      if (!transcript || transcript.trim().length === 0) {
        throw new Error("No transcript received - please try speaking again")
      }

      await processUserMessage(transcript)
    } catch (error) {
      console.error("Error processing voice response:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
      toast({
        title: "Processing Error",
        description: "There was an error processing your response. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setTurnNumber((prev) => prev + 1)
    }
  }

  const handleChatResponse = async (message: string) => {
    setIsProcessing(true)
    setError(null)

    try {
      await processUserMessage(message)
    } catch (error) {
      console.error("Error processing chat response:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
      toast({
        title: "Processing Error",
        description: "There was an error processing your message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setTurnNumber((prev) => prev + 1)
    }
  }

  const processUserMessage = async (message: string) => {
    console.log("Processing user message:", message.substring(0, 100))

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

    // Check if we should end the conversation
    const userResponses = updatedConversation.filter((turn) => turn.speaker === "user")
    const shouldEndNow = currentTime >= MAX_CONVERSATION_TIME - 180 || userResponses.length >= 8

    if (shouldEndNow) {
      console.log("Ending conversation due to time/turn limit")
      const endMessage =
        "Perfect! I have excellent material from our conversation. Let me generate your professional resume bullets now."

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

    // Generate AI follow-up using the appropriate API
    console.log("Generating AI follow-up...")

    let followUpData
    try {
      const apiEndpoint = interviewMode === "chat" ? "/api/interview/chat" : "/api/interview/generate-followup"

      const requestBody =
        interviewMode === "chat"
          ? {
              conversation: updatedConversation,
              userMessage: message,
              resumeText,
              roleType,
              conversationTime: currentTime,
              maxTime: MAX_CONVERSATION_TIME,
              userEmail: session.user.email,
            }
          : {
              conversation: updatedConversation,
              resumeText,
              roleType,
              conversationTime: currentTime,
              maxTime: MAX_CONVERSATION_TIME,
              userEmail: session.user.email,
            }

      const followUpResponse = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text()
        console.error(`Follow-up API failed: ${followUpResponse.status}`, errorText)
        throw new Error(`Follow-up API failed: ${followUpResponse.status}`)
      }

      followUpData = await followUpResponse.json()
      console.log("Follow-up response:", followUpData)
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

      followUpData = {
        message: fallbackMessage,
        shouldEnd: false,
        bullets: [],
      }
    }

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
  }

  const endConversation = async (bullets: any[]) => {
    console.log("Ending conversation with", bullets.length, "bullets")

    // If no bullets provided, try to generate them from the conversation
    if (bullets.length === 0 && conversation.length > 2) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const conversationHistory = conversation
            .map((turn) => `${turn.speaker.toUpperCase()}: ${turn.message}`)
            .join("\n\n")

          const bulletsResponse = await fetch("/api/interview/generate-bullets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              transcript: conversationHistory,
              question: "Full conversation summary",
              role: roleType || "Software Engineer",
              context: `${interviewMode} interview`,
            }),
          })

          if (bulletsResponse.ok) {
            const { bullets: generatedBullets } = await bulletsResponse.json()
            bullets = generatedBullets || []
          }
        }
      } catch (error) {
        console.error("Error generating final bullets:", error)
      }
    }

    setStep("complete")
    setGeneratedBullets(bullets)

    toast({
      title: "Interview Complete!",
      description: `Generated ${bullets.length} resume bullet points from our conversation.`,
    })

    onComplete(bullets)
  }

  // Add fix subscription handler
  const handleFixSubscription = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No authentication token");
      const res = await fetch("/api/subscription/fix-subscription-smart", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.success) {
        router.refresh();
      } else {
        alert(json.error || "Failed to fix subscription");
      }
    } catch (e) {
      alert("Error fixing subscription");
    }
  };

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
            <div className="grid md:grid-cols-2 gap-6">
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
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-200"
                onClick={() => handleModeSelect("chat")}
              >
                <CardContent className="p-6 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-semibold mb-2">Chat Interview</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Type your responses in a chat interface. Perfect if you prefer writing or are in a quiet
                    environment.
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Type at your own pace</li>
                    <li>• Edit before sending</li>
                    <li>• No microphone needed</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Both formats will generate the same high-quality resume bullets. Choose what works best for you!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "interview") {
    return (
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Subscription/usage status */}
        {subLoading ? (
          <div>Loading subscription status...</div>
        ) : noActive ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <AlertDescription>
              No active subscription found. Please subscribe to continue.
            </AlertDescription>
          </Alert>
        ) : overLimit ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <AlertDescription>
              Interview limit reached ({usage?.interviews_used} / {limits?.interviews === Infinity ? "∞" : limits?.interviews}).
              Please upgrade your plan or wait for the next period.
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Fix Subscription Button */}
        <div className="my-4 flex justify-center">
          <Button variant="outline" onClick={handleFixSubscription}>
            Fix Subscription
          </Button>
        </div>

        {interviewMode === "voice" ? (
          <ConversationalRecorder
            onResponseReady={handleVoiceResponse}
            isProcessing={isProcessing}
            currentMessage={currentAIMessage}
            isAITalking={isAITalking}
            conversationTime={currentTime}
            maxTime={MAX_CONVERSATION_TIME}
            conversationId={conversationId}
            turnNumber={turnNumber}
          />
        ) : (
          <ChatInterview
            onResponseReady={handleChatResponse}
            isProcessing={isProcessing}
            currentMessage={currentAIMessage}
            conversationTime={currentTime}
            maxTime={MAX_CONVERSATION_TIME}
            conversationId={conversationId}
            turnNumber={turnNumber}
            conversation={conversation}
          />
        )}

        {/* Mode Switch */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Current mode: <strong>{interviewMode === "voice" ? "Voice" : "Chat"}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("mode-select")}
                disabled={conversation.length > 2}
              >
                Switch Mode
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "complete") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <CheckCircle className="w-5 h-5 mr-2" />
            Interview Complete!
          </CardTitle>
          <CardDescription className="text-green-700">
            Generated {generatedBullets.length} professional resume bullet points from our {interviewMode} conversation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {generatedBullets.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-green-800">Generated Bullets:</h4>
              <ul className="space-y-2">
                {generatedBullets.slice(0, 3).map((bullet, index) => (
                  <li key={index} className="flex items-start">
                    <ArrowRight className="h-4 w-4 text-green-600 mt-1 mr-2 flex-shrink-0" />
                    <p className="text-sm text-green-700">{bullet.text}</p>
                  </li>
                ))}
              </ul>
              {generatedBullets.length > 3 && (
                <p className="text-sm text-green-600">+{generatedBullets.length - 3} more bullets generated</p>
              )}
            </div>
          )}

          <Button onClick={() => onComplete(generatedBullets)} className="bg-green-600 hover:bg-green-700">
            <FileText className="w-4 h-4 mr-2" />
            Continue to Resume Builder
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
