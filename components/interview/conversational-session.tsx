"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResumeUpload } from "@/components/interview/resume-upload"
import { ConversationalRecorder } from "@/components/interview/conversational-recorder"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { FileText, CheckCircle, MessageCircle, ArrowRight, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

export function ConversationalSession({ userId, roleType, onComplete }: ConversationalSessionProps) {
  const [step, setStep] = useState<"upload" | "interview" | "complete">("upload")
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

  useEffect(() => {
    if (step === "interview" && conversation.length === 0) {
      startConversation()
    }
  }, [step])

  const handleResumeUploaded = (text: string, fileName: string) => {
    setResumeText(text)
    setResumeFileName(fileName)
    if (text.trim()) {
      setStep("interview")
    }
  }

  const startConversation = async () => {
    setConversationStartTime(Date.now())
    setError(null)

    const newConversationId = crypto.randomUUID()
    setConversationId(newConversationId)

    const initialMessage = `Hi! I've reviewed your resume and I'm excited to learn more about your experience. Let's have a conversation about your work - I'll ask questions and we can dive deeper into the projects and achievements that would make great resume bullet points. 

Let's start simple: Can you tell me about your current role and what you've been working on recently?`

    setCurrentAIMessage(initialMessage)
    setConversation([
      {
        speaker: "ai",
        message: initialMessage,
        timestamp: Date.now(),
      },
    ])

    // Simulate AI speaking time
    setIsAITalking(true)
    setTimeout(() => setIsAITalking(false), 3000)
  }

  const handleUserResponse = async (audioBlob: Blob, duration: number) => {
    setIsProcessing(true)
    setError(null)

    try {
      console.log("Processing user response...")

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

      const { transcript } = await transcribeResponse.json()
      console.log("Transcription successful:", transcript?.substring(0, 100))

      if (!transcript || transcript.trim().length === 0) {
        throw new Error("No transcript received - please try speaking again")
      }

      // Add user response to conversation
      const userTurn: ConversationTurn = {
        speaker: "user",
        message: transcript,
        timestamp: Date.now(),
        audioBlob,
      }

      setConversation((prev) => [...prev, userTurn])

      // Generate AI follow-up
      console.log("Generating AI follow-up...")
      const followUpResponse = await fetch("/api/interview/generate-followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversation: [...conversation, userTurn],
          resumeText,
          roleType,
          conversationTime: currentTime,
          maxTime: MAX_CONVERSATION_TIME,
        }),
      })

      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text()
        console.error("Follow-up generation failed:", errorText)

        // Use fallback response instead of throwing error
        const fallbackMessage =
          currentTime >= MAX_CONVERSATION_TIME - 180
            ? "Thank you for sharing your experience! Let me generate your resume bullets now."
            : "Can you tell me more about the specific technologies you used and the impact of your work?"

        const aiTurn: ConversationTurn = {
          speaker: "ai",
          message: fallbackMessage,
          timestamp: Date.now(),
        }

        setConversation((prev) => [...prev, aiTurn])
        setCurrentAIMessage(fallbackMessage)

        // Check if we should end
        if (currentTime >= MAX_CONVERSATION_TIME - 180) {
          setTimeout(() => {
            endConversation([])
          }, 2000)
        }

        return
      }

      const followUpData = await followUpResponse.json()
      console.log("Follow-up response:", followUpData)

      const { message: aiMessage, shouldEnd, bullets } = followUpData

      // Add AI response to conversation
      const aiTurn: ConversationTurn = {
        speaker: "ai",
        message: aiMessage || "Can you tell me more about that?",
        timestamp: Date.now(),
      }

      setConversation((prev) => [...prev, aiTurn])
      setCurrentAIMessage(aiMessage || "Can you tell me more about that?")

      // Simulate AI speaking
      setIsAITalking(true)
      setTimeout(() => setIsAITalking(false), Math.min((aiMessage?.length || 50) * 50, 4000))

      // Check if conversation should end
      if (shouldEnd || currentTime >= MAX_CONVERSATION_TIME - 60) {
        setTimeout(() => {
          endConversation(bullets || [])
        }, 2000)
      }
    } catch (error) {
      console.error("Error processing response:", error)
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

  const endConversation = async (bullets: any[]) => {
    console.log("Ending conversation with", bullets.length, "bullets")
    setStep("complete")
    setGeneratedBullets(bullets)

    toast({
      title: "Interview Complete!",
      description: `Generated ${bullets.length} resume bullet points from our conversation.`,
    })

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
                <h4 className="font-medium text-gray-900">Conversational Format</h4>
                <p className="text-sm text-gray-600">
                  We'll have a natural back-and-forth conversation about your experience, not long monologue recordings.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">15 Minutes Total</h4>
                <p className="text-sm text-gray-600">
                  Short, focused conversation that respects your time while gathering the details needed for great
                  resume bullets.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Personalized Questions</h4>
                <p className="text-sm text-gray-600">
                  Questions based on your uploaded resume to dive deeper into your specific experience and achievements.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">XYZ Format Bullets</h4>
                <p className="text-sm text-gray-600">
                  We'll generate professional bullet points in the proven XYZ format with quantified results.
                </p>
              </div>
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

        <ConversationalRecorder
          onResponseReady={handleUserResponse}
          isProcessing={isProcessing}
          currentMessage={currentAIMessage}
          isAITalking={isAITalking}
          conversationTime={currentTime}
          maxTime={MAX_CONVERSATION_TIME}
          conversationId={conversationId}
          turnNumber={turnNumber}
        />

        {/* Conversation History */}
        {conversation.length > 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversation So Far</CardTitle>
              <CardDescription>
                {conversation.filter((t) => t.speaker === "user").length} responses recorded
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-60 overflow-y-auto space-y-3">
              {conversation.slice(-6).map((turn, index) => (
                <div key={index} className={`flex ${turn.speaker === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      turn.speaker === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{turn.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
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
            Generated {generatedBullets.length} professional resume bullet points from our conversation
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
