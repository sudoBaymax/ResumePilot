"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, Square, Play, Pause, Loader2, Save, Trash2, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VoiceRecorderProps {
  onTranscriptReady: (audioBlob: Blob, duration: number) => Promise<void>
  isProcessing: boolean
  currentQuestion: string
  onNextQuestion: () => void
  isLastQuestion: boolean
}

export function VoiceRecorder({
  onTranscriptReady,
  isProcessing,
  currentQuestion,
  onNextQuestion,
  isLastQuestion,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [microphonePermission, setMicrophonePermission] = useState<"granted" | "denied" | "prompt">("prompt")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast } = useToast()

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission()
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [audioUrl])

  const checkMicrophonePermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: "microphone" as PermissionName })
      setMicrophonePermission(permission.state)

      permission.addEventListener("change", () => {
        setMicrophonePermission(permission.state)
      })
    } catch (error) {
      console.error("Error checking microphone permission:", error)
    }
  }

  const startRecording = async () => {
    try {
      setError(null)
      audioChunksRef.current = []

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      })

      streamRef.current = stream
      setMicrophonePermission("granted")

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        console.warn("audio/webm not supported, falling back to default")
      }

      // Create media recorder with appropriate options
      const options = MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : {}

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm"
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(audioBlob)
        setAudioBlob(audioBlob)
        setAudioUrl(url)

        // Stop all tracks in the stream
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event)
        setError("Recording error occurred")
        setIsRecording(false)
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setIsPaused(false)
      setAudioBlob(null)
      setAudioUrl(null)

      // Start timer
      let seconds = 0
      timerRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)
      }, 1000)

      toast({
        title: "Recording Started",
        description: "Speak clearly and provide detailed answers for best results.",
      })
    } catch (error) {
      console.error("Error accessing microphone:", error)
      setMicrophonePermission("denied")
      setError("Microphone access denied. Please enable microphone permissions and try again.")
      toast({
        title: "Microphone Access Error",
        description: "Please ensure you've granted permission to use the microphone.",
        variant: "destructive",
      })
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        // Resume recording
        mediaRecorderRef.current.resume()
        setIsPaused(false)

        // Resume timer
        let seconds = recordingTime
        timerRef.current = setInterval(() => {
          seconds++
          setRecordingTime(seconds)
        }, 1000)
      } else {
        // Pause recording
        mediaRecorderRef.current.pause()
        setIsPaused(true)

        // Pause timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      toast({
        title: "Recording Stopped",
        description: "You can now review your recording or submit it for processing.",
      })
    }
  }

  const resetRecording = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setError(null)
  }

  const handleSubmit = async () => {
    if (audioBlob) {
      try {
        setError(null)
        await onTranscriptReady(audioBlob, recordingTime)
        resetRecording()
      } catch (error) {
        console.error("Error processing audio:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        setError(`Processing failed: ${errorMessage}`)
        toast({
          title: "Processing Error",
          description: "There was an error processing your recording. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Voice Interview</CardTitle>
        <CardDescription>Answer the question below by recording your voice</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-1">Question:</h3>
          <p className="text-blue-700">{currentQuestion}</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {microphonePermission === "denied" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Microphone access is required for voice interviews. Please enable microphone permissions in your browser
              settings and refresh the page.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center space-y-4">
          {/* Recording timer and progress */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Recording time</span>
              <span>{formatTime(recordingTime)}</span>
            </div>
            <Progress value={Math.min((recordingTime / 180) * 100, 100)} className="h-2" />
            {recordingTime > 150 && (
              <p className="text-sm text-amber-600">Consider wrapping up your answer soon (3 minute limit)</p>
            )}
          </div>

          {/* Recording controls */}
          <div className="flex space-x-3">
            {!isRecording && !audioBlob && microphonePermission !== "denied" && (
              <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700" size="lg">
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <>
                <Button onClick={pauseRecording} variant="outline" size="icon" className="h-12 w-12 rounded-full">
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </Button>
                <Button onClick={stopRecording} variant="destructive" size="icon" className="h-12 w-12 rounded-full">
                  <Square className="h-5 w-5" />
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <div className="flex flex-col items-center space-y-2">
                  <audio src={audioUrl || undefined} controls className="w-full max-w-md" />
                  <div className="flex space-x-2">
                    <Button onClick={resetRecording} variant="outline" size="icon">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                    <Button onClick={startRecording} variant="outline" size="icon">
                      <Mic className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end space-x-3">
          {audioBlob && !isRecording && (
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Submit Answer
                </>
              )}
            </Button>
          )}

          {!isLastQuestion && (
            <Button onClick={onNextQuestion} variant="outline">
              Skip Question
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
