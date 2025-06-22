"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Search, MessageSquare, Loader2, Sparkles, FileText } from "lucide-react"

interface ResumeAnalyzerProps {
  resumeText: string
}

const SUGGESTED_QUESTIONS = [
  "What technologies and skills are listed on my resume?",
  "What experience do I have?",
  "What projects are mentioned?",
  "How can I improve my resume?",
  "What's missing from my resume?",
  "What are my strongest points?",
  "What should I highlight for a software engineering role?",
  "How can I make my bullet points more impactful?"
]

export function ResumeAnalyzer({ resumeText }: ResumeAnalyzerProps) {
  const { toast } = useToast()
  const [question, setQuestion] = useState("")
  const [analysis, setAnalysis] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [recentQuestions, setRecentQuestions] = useState<string[]>([])

  const handleAnalyze = async () => {
    if (!question.trim()) {
      toast({
        title: "Question Required",
        description: "Please enter a question about your resume.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    setAnalysis("")

    try {
      const response = await fetch("/api/interview/analyze-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText,
          question: question.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze resume")
      }

      const result = await response.json()
      setAnalysis(result.analysis)
      
      // Add to recent questions
      setRecentQuestions(prev => [question.trim(), ...prev.slice(0, 4)])
      
      toast({
        title: "Analysis Complete",
        description: "Your resume has been analyzed successfully.",
      })
    } catch (error) {
      console.error("Error analyzing resume:", error)
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze your resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSuggestedQuestion = (suggestedQuestion: string) => {
    setQuestion(suggestedQuestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAnalyze()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
            Resume Analysis
          </CardTitle>
          <CardDescription>
            Ask specific questions about your resume and get personalized insights and recommendations.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Question Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ask About Your Resume</CardTitle>
          <CardDescription>
            Type your question below or select from suggested questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., What technologies do I know? How can I improve my resume?"
              className="flex-1"
              disabled={isAnalyzing}
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !question.trim()}
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Suggested Questions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Suggested Questions:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((suggestedQuestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedQuestion(suggestedQuestion)}
                  disabled={isAnalyzing}
                  className="text-xs"
                >
                  {suggestedQuestion}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
              Analysis Results
            </CardTitle>
            <CardDescription>
              Detailed analysis of your resume based on your question
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {analysis}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Questions */}
      {recentQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Questions</CardTitle>
            <CardDescription>
              Your recently asked questions for quick reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentQuestions.map((recentQuestion, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{recentQuestion}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuestion(recentQuestion)}
                    className="text-xs"
                  >
                    Ask Again
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resume Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2 text-green-600" />
            Resume Preview
          </CardTitle>
          <CardDescription>
            Your uploaded resume content (first 500 characters)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {resumeText ? (
                <>
                  {resumeText.substring(0, 500)}
                  {resumeText.length > 500 && "..."}
                  <Badge variant="outline" className="ml-2">
                    {resumeText.length} characters
                  </Badge>
                </>
              ) : (
                "No resume uploaded"
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 