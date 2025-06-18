"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Send, MessageCircle, Loader2, User, Bot, Sparkles, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface AiResumeChatbotProps {
  onComplete: (summary: string) => void
  resumeText?: string
  roleType?: string
  overleafTemplate?: string
}

interface ChatMessage {
  speaker: "ai" | "user"
  message: string
  timestamp: number
}

export function AiResumeChatbot({
  onComplete,
  resumeText = "",
  roleType = "Software Engineer",
  overleafTemplate = "",
}: AiResumeChatbotProps) {
  const [conversation, setConversation] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationStarted, setConversationStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!conversationStarted) {
      startConversation()
    }
  }, [conversationStarted])

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

  const getAuthToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token
  }

  const startConversation = async () => {
    setConversationStarted(true)
    setIsProcessing(true)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error("No authentication token available")
      }

      // Get initial AI greeting
      const response = await fetch("/api/interview/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [],
          resumeText,
          roleType,
          overleafTemplate,
          userMessage: "Hello! I'd like help building my resume.",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start conversation")
      }

      const data = await response.json()

      const aiMessage: ChatMessage = {
        speaker: "ai",
        message: data.message,
        timestamp: Date.now(),
      }

      setConversation([aiMessage])
    } catch (error) {
      console.error("Error starting conversation:", error)
      // Fallback greeting
      const fallbackMessage: ChatMessage = {
        speaker: "ai",
        message:
          "Hi! I'm your AI resume consultant. I'm here to help you create an outstanding resume that will catch recruiters' attention. Let's start by learning about your background - what's your current role or the position you're targeting?",
        timestamp: Date.now(),
      }
      setConversation([fallbackMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputMessage.trim() || isProcessing) {
      return
    }

    const message = inputMessage.trim()
    setInputMessage("")
    setError(null)
    setIsProcessing(true)

    // Add user message to conversation
    const userMessage: ChatMessage = {
      speaker: "user",
      message: message,
      timestamp: Date.now(),
    }

    const updatedConversation = [...conversation, userMessage]
    setConversation(updatedConversation)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch("/api/interview/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: updatedConversation,
          userMessage: message,
          resumeText,
          roleType,
          overleafTemplate,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()

      const aiMessage: ChatMessage = {
        speaker: "ai",
        message: data.message,
        timestamp: Date.now(),
      }

      setConversation((prev) => [...prev, aiMessage])

      // Check if conversation should end
      if (data.shouldEnd || updatedConversation.length >= 20) {
        setTimeout(() => {
          handleConversationComplete()
        }, 2000)
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message. Please try again.")
      toast({
        title: "Error",
        description: "Failed to send your message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConversationComplete = () => {
    // Generate a summary of the conversation for the resume builder
    const conversationSummary = conversation.map((msg) => `${msg.speaker.toUpperCase()}: ${msg.message}`).join("\n\n")

    onComplete(conversationSummary)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Sparkles className="w-5 h-5 mr-2" />
            AI Resume Consultant
          </CardTitle>
          <CardDescription className="text-blue-700">
            I'm your personal AI resume expert. I'll ask targeted questions to help build your perfect resume for{" "}
            {roleType} roles.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="w-full h-[600px] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
              Resume Building Chat
            </CardTitle>
            <div className="flex items-center text-sm text-gray-500">
              <Bot className="w-4 h-4 mr-1" />
              {conversation.length} messages
            </div>
          </div>
          <CardDescription>
            Answer my questions naturally - I'll help you identify your strongest achievements and skills
          </CardDescription>
        </CardHeader>

        {/* Chat Messages */}
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversation.map((turn, index) => (
              <div key={index} className={`flex ${turn.speaker === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] p-4 rounded-lg flex items-start space-x-3 ${
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
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{turn.message}</p>
                    <p className={`text-xs mt-2 opacity-70`}>
                      {new Date(turn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* AI Typing Indicator */}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-4 rounded-lg bg-gray-100 text-gray-900 flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI is analyzing your response...</span>
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

          {/* Input Area */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isProcessing ? "AI is thinking..." : "Type your response..."}
                disabled={isProcessing}
                className="flex-1"
                maxLength={2000}
              />
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span>{inputMessage.length}/2000</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handleConversationComplete} disabled={conversation.length < 4}>
          <FileText className="w-4 h-4 mr-2" />
          Finish & Build Resume
        </Button>

        <div className="text-sm text-gray-500">
          {conversation.length >= 4
            ? "Ready to build your resume!"
            : `${Math.max(0, 4 - conversation.length)} more exchanges recommended`}
        </div>
      </div>
    </div>
  )
}
