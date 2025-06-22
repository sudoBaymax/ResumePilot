"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { FileText, Sparkles, Loader2 } from "lucide-react"

interface ResumeGenerationButtonProps {
  conversation: Array<{ speaker: "ai" | "user"; message: string; timestamp: number }>
  resumeText: string
  roleType?: string
  onResumeGenerated: (resumeData: any, template: string, downloads: any) => void
}

export function ResumeGenerationButton({ 
  conversation, 
  resumeText, 
  roleType, 
  onResumeGenerated 
}: ResumeGenerationButtonProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateResume = async () => {
    if (conversation.length < 2) {
      toast({
        title: "Not Enough Data",
        description: "Please have at least one exchange before generating a resume.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch("/api/interview/generate-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation,
          resumeText,
          roleType: roleType || "Software Engineer",
          templateName: "jakes-resume",
          userInfo: {
            name: "User",
            email: "",
          }
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate resume")
      }

      const result = await response.json()
      
      onResumeGenerated(result.data, result.template, result.downloads)
      
      toast({
        title: "Resume Generated!",
        description: "Your professional resume is ready for download.",
      })
    } catch (error) {
      console.error("Error generating resume:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
          Generate Resume
        </CardTitle>
        <CardDescription>
          Create a professional resume with XYZ-format bullets from your conversation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleGenerateResume}
          disabled={isGenerating || conversation.length < 2}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Resume...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Generate Professional Resume
            </>
          )}
        </Button>
        
        {conversation.length < 2 && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            Have at least one conversation exchange to generate a resume
          </p>
        )}
      </CardContent>
    </Card>
  )
} 