"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Send, MessageCircle, Clock, Loader2, User, Bot } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ChatInterviewProps {
  onResponseReady: (message: string) => Promise<void>
  isProcessing: boolean
  currentMessage: string
  conversationTime: number
  maxTime: number
  conversationId?: string
  turnNumber?: number
  conversation: Array<{ speaker: "ai" | "user"; message: string; timestamp: number }>
}

export function ChatInterview({
  onResponseReady,
  isProcessing,
  currentMessage,
  conversationTime,
  maxTime,
  conversationId,
  turnNumber = 1,
  conversation,
}: ChatInterviewProps) {
  const [inputMessage, setInputMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const timeRemaining = maxTime - conversationTime
  const isNearTimeLimit = timeRemaining < 120 // 2 minutes remaining

  useEffect(() => {
    scrollToBottom()
  }, [conversation])

  useEffect(() => {
    // Focus input when not processing
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isProcessing])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputMessage.trim() || isProcessing) {
      return
    }

    const message = inputMessage.trim()
    setInputMessage("")
    setError(null)

    try {
      await onResponseReady(message)
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message. Please try again.")
      toast({
        title: "Error",
        description: "Failed to send your message. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
            Chat Interview
          </CardTitle>
          <div className={`flex items-center text-sm ${isNearTimeLimit ? "text-amber-600" : "text-gray-500"}`}>
            <Clock className="w-4 h-4 mr-1" />
            {formatTime(timeRemaining)} remaining
          </div>
        </div>
        <CardDescription>
          Type your responses naturally - I'll ask follow-up questions to help create great resume bullets
        </CardDescription>
      </CardHeader>

      {/* Chat Messages */}
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversation.map((turn, index) => (
            <div key={index} className={`flex ${turn.speaker === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] p-3 rounded-lg flex items-start space-x-2 ${
                  turn.speaker === "user"
                    ? "bg-blue-600 text-white flex-row-reverse space-x-reverse"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    turn.speaker === "user" ? "bg-blue-700" : "bg-blue-600"
                  }`}
                >
                  {turn.speaker === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{turn.message}</p>
                  <p className={`text-xs mt-1 opacity-70`}>
                    {new Date(turn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* AI Typing Indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-900 flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center space-x-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 pt-0">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Time Warning */}
        {isNearTimeLimit && (
          <div className="p-4 pt-0">
            <Alert className="bg-amber-50 border-amber-200">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Less than 2 minutes remaining. We'll wrap up the conversation soon.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isProcessing ? "AI is responding..." : "Type your response..."}
              disabled={isProcessing || timeRemaining < 10}
              className="flex-1"
              maxLength={1000}
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || isProcessing || timeRemaining < 10}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>{inputMessage.length}/1000</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
