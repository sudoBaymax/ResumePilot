"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VoiceRecorder } from "@/components/interview/voice-recorder"
import { getInterviewQuestions, type InterviewQuestion } from "@/lib/interview/questions"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Mic, FileText, CheckCircle, AlertTriangle, ArrowRight, Loader2 } from "lucide-react"

interface InterviewSessionProps {
  userId: string
  roleType?: string
  onComplete: (bullets: any[]) => void
}

export function InterviewSession({ userId, roleType, onComplete }: InterviewSessionProps) {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcripts, setTranscripts] = useState<Record<string, string>>({})
  const [bullets, setBullets] = useState<Record<string, any[]>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [activeTab, setActiveTab] = useState("interview")
  const { toast } = useToast()

  useEffect(() => {
    // Load interview questions
    const interviewQuestions = getInterviewQuestions(roleType, 5)
    setQuestions(interviewQuestions)
  }, [roleType])

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleTranscriptReady = async (audioBlob: Blob, duration: number) => {
    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion) return

    setIsProcessing(true)

    try {
      // Get the user's session token for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("No authentication token available")
      }

      // Create form data for the audio file
      const formData = new FormData()
      formData.append("audio", audioBlob, `interview-${Date.now()}.webm`)
      formData.append("question", currentQuestion.text)
      formData.append("duration", duration.toString())

      console.log("Sending audio to transcription API...")

      // Send audio to Whisper API
      const transcribeResponse = await fetch("/api/interview/transcribe", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      console.log("Transcription response status:", transcribeResponse.status)

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json()
        console.error("Transcription error:", errorData)
        throw new Error(errorData.details || errorData.error || "Transcription failed")
      }

      const { transcript, transcript_id } = await transcribeResponse.json()
      console.log("Transcription successful:", { transcript: transcript.substring(0, 100) + "..." })

      if (!transcript || transcript.trim().length === 0) {
        throw new Error("No speech detected in the recording. Please try speaking more clearly.")
      }

      // Store transcript
      setTranscripts((prev) => ({
        ...prev,
        [currentQuestion.id]: transcript,
      }))

      console.log("Generating bullets from transcript...")

      // Generate bullets from transcript
      const generateResponse = await fetch("/api/interview/generate-bullets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          transcript,
          question: currentQuestion.text,
          role: roleType,
        }),
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json()
        console.error("Bullet generation error:", errorData)
        throw new Error(errorData.details || errorData.error || "Failed to generate bullets")
      }

      const { bullets: generatedBullets } = await generateResponse.json()
      console.log("Bullets generated:", generatedBullets)

      // Store bullets
      setBullets((prev) => ({
        ...prev,
        [currentQuestion.id]: generatedBullets || [],
      }))

      toast({
        title: "Answer Processed",
        description: `Generated ${generatedBullets?.length || 0} resume bullet points from your answer.`,
        variant: "default",
      })

      // Move to next question or complete interview
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      } else {
        setIsCompleted(true)
        setActiveTab("results")

        // Combine all bullets
        const allBullets = Object.values({ ...bullets, [currentQuestion.id]: generatedBullets }).flat()
        onComplete(allBullets)
      }
    } catch (error) {
      console.error("Error processing interview:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="interview">
            <Mic className="w-4 h-4 mr-2" />
            Interview
          </TabsTrigger>
          <TabsTrigger value="results" disabled={Object.keys(bullets).length === 0}>
            <FileText className="w-4 h-4 mr-2" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interview" className="space-y-4 mt-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
            <span>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</span>
          </div>

          {/* Voice recorder */}
          <VoiceRecorder
            onTranscriptReady={handleTranscriptReady}
            isProcessing={isProcessing}
            currentQuestion={currentQuestion.text}
            onNextQuestion={handleNextQuestion}
            isLastQuestion={isLastQuestion}
          />

          {/* Completion alert */}
          {isCompleted && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Interview Completed!</AlertTitle>
              <AlertDescription>
                You've completed all questions. View your generated resume bullets in the Results tab.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-6 mt-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTitle>Resume Bullets Generated</AlertTitle>
            <AlertDescription>
              These bullets are formatted in XYZ format (Did X using Y resulting in Z) for maximum impact.
            </AlertDescription>
          </Alert>

          {questions.map((question, index) => {
            const questionBullets = bullets[question.id] || []
            const hasTranscript = !!transcripts[question.id]

            return (
              <Card key={question.id} className={hasTranscript ? "" : "opacity-50"}>
                <CardHeader>
                  <CardTitle className="text-base">{question.text}</CardTitle>
                  {!hasTranscript && (
                    <CardDescription className="flex items-center text-amber-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Question skipped
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {questionBullets.length > 0 ? (
                    <ul className="space-y-3">
                      {questionBullets.map((bullet, i) => (
                        <li key={i} className="flex items-start">
                          <ArrowRight className="h-4 w-4 text-blue-600 mt-1 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-gray-900">{bullet.text}</p>
                            {bullet.context && <p className="text-sm text-gray-500 mt-1">Context: {bullet.context}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : hasTranscript ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                      <span>Generating bullets...</span>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No data available for this question.</p>
                  )}
                </CardContent>
              </Card>
            )
          })}

          <div className="flex justify-end">
            <Button
              onClick={() => onComplete(Object.values(bullets).flat())}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Use These Bullets
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
