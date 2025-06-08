"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, Square, Volume2, Loader2, MessageCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ConversationalRecorderProps {
  onResponseReady: (audioBlob: Blob, duration: number) => Promise<void>
  isProcessing: boolean
  currentMessage: string
  isAITalking: boolean
  conversationTime: number
  maxTime: number
}

export function ConversationalRecorder({
  onResponseReady,
  isProcessing,
  currentMessage,
  isAITalking,
  conversationTime,
  maxTime,
}: ConversationalRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [microphonePermission, setMicrophonePermission] = useState<"granted" | "denied" | "prompt">("prompt")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    checkMicrophonePermission()
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const checkMicrophonePermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: "microphone" as PermissionName })
      setMicrophonePermission(permission.state)
    } catch (error) {
      console.error("Error checking microphone permission:", error)
    }
  }

  const startRecording = async () => {
    try {
      setError(null)
      audioChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      })

      streamRef.current = stream
      setMicrophonePermission("granted")

      const options = MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : {}
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm"
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })

        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        await onResponseReady(audioBlob, recordingTime)
      }

      mediaRecorder.start(1000)
      setIsRecording(true)

      let seconds = 0
      timerRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)

        // Auto-stop after 30 seconds for conversational flow
        if (seconds >= 30) {
          stopRecording()
        }
      }, 1000)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      setMicrophonePermission("denied")
      setError("Microphone access denied. Please enable microphone permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setRecordingTime(0)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const timeRemaining = maxTime - conversationTime
  const isNearTimeLimit = timeRemaining < 120 // 2 minutes remaining

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
            Conversational Interview
          </CardTitle>
          <div className={`flex items-center text-sm ${isNearTimeLimit ? "text-amber-600" : "text-gray-500"}`}>
            <Clock className="w-4 h-4 mr-1" />
            {formatTime(timeRemaining)} remaining
          </div>
        </div>
        <CardDescription>
          Have a natural conversation - speak when I ask questions, I'll respond and ask follow-ups
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Message Display */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-blue-800 font-medium mb-1">AI Interviewer:</p>
              <p className="text-blue-700">{currentMessage}</p>
              {isAITalking && (
                <div className="flex items-center mt-2 text-blue-600">
                  <Volume2 className="w-4 h-4 mr-1 animate-pulse" />
                  <span className="text-sm">Speaking...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isNearTimeLimit && (
          <Alert className="bg-amber-50 border-amber-200">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Less than 2 minutes remaining. We'll wrap up the conversation soon.
            </AlertDescription>
          </Alert>
        )}

        {/* Recording Controls */}
        <div className="flex flex-col items-center space-y-4">
          {isRecording && (
            <div className="text-center">
              <div className="text-2xl font-mono text-red-600 mb-2">{formatTime(recordingTime)}</div>
              <p className="text-sm text-gray-500">
                {recordingTime > 20 ? "Consider wrapping up your response" : "Speak naturally, take your time"}
              </p>
            </div>
          )}

          <div className="flex space-x-4">
            {!isRecording && !isProcessing && !isAITalking && microphonePermission !== "denied" && (
              <Button
                onClick={startRecording}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
                disabled={timeRemaining < 10}
              >
                <Mic className="w-5 h-5 mr-2" />
                Respond
              </Button>
            )}

            {isRecording && (
              <Button onClick={stopRecording} variant="destructive" size="lg" className="animate-pulse">
                <Square className="w-5 w-5 mr-2" />
                Stop Recording
              </Button>
            )}

            {isProcessing && (
              <Button disabled size="lg">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </Button>
            )}

            {isAITalking && (
              <Button disabled size="lg" variant="outline">
                <Volume2 className="w-5 h-5 mr-2 animate-pulse" />
                AI Speaking...
              </Button>
            )}
          </div>

          <div className="text-center text-sm text-gray-500 max-w-md">
            <p>
              💡 <strong>Tip:</strong> Keep responses conversational and concise (20-30 seconds). I'll ask follow-up
              questions to get the details we need.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
