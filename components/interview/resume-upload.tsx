"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ResumeUploadProps {
  onResumeUploaded: (resumeText: string, fileName: string) => void
  isProcessing?: boolean
}

export function ResumeUpload({ onResumeUploaded, isProcessing = false }: ResumeUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)
  const [resumeText, setResumeText] = useState("")
  const { toast } = useToast()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelection(files[0])
    }
  }, [])

  const handleFileSelection = async (file: File) => {
    // Validate file type
    const allowedTypes = ["application/pdf", "text/plain"]

    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    const allowedExtensions = ["pdf", "txt"]

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || "")) {
      toast({
        title: "File Type Not Supported",
        description: "Please upload a PDF or text file. For Word documents, please save as PDF first.",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 2MB.",
        variant: "destructive",
      })
      return
    }

    setUploadedFile(file)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("resume", file)

      const response = await fetch("/api/interview/parse-resume", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to parse resume")
      }

      toast({
        title: "Resume Uploaded Successfully",
        description: "We've analyzed your resume and will use it to personalize your interview.",
      })

      onResumeUploaded(result.text, file.name)
    } catch (error: any) {
      console.error("Error uploading resume:", error)

      // Show helpful error message
      toast({
        title: "Upload Failed",
        description:
          error.message || "There was an error processing your resume. Please try again or use the text input option.",
        variant: "destructive",
      })

      setUploadedFile(null)

      // Suggest text input as alternative
      setTimeout(() => {
        toast({
          title: "Alternative Option",
          description: "You can also copy and paste your resume text directly using the text input option below.",
        })
      }, 2000)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelection(file)
    }
  }

  const handleTextSubmit = () => {
    if (resumeText.trim().length < 50) {
      toast({
        title: "Text Too Short",
        description: "Please enter at least 50 characters of resume text.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Resume Text Added",
      description: "We'll use your resume text to personalize your interview.",
    })

    onResumeUploaded(resumeText.trim(), "resume-text.txt")
    setShowTextInput(false)
  }

  if (uploadedFile && !isUploading) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <CheckCircle className="w-5 h-5 mr-2" />
            Resume Uploaded Successfully
          </CardTitle>
          <CardDescription className="text-green-700">
            {uploadedFile.name} - Ready to start your personalized interview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              setUploadedFile(null)
              onResumeUploaded("", "")
            }}
            className="text-green-700 border-green-300 hover:bg-green-100"
          >
            Upload Different Resume
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (showTextInput) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Paste Your Resume Text
          </CardTitle>
          <CardDescription>Copy and paste your resume text directly for the most reliable results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..."
            className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <Button onClick={handleTextSubmit} disabled={resumeText.trim().length < 50}>
              Use This Text
            </Button>
            <Button variant="outline" onClick={() => setShowTextInput(false)}>
              Back to File Upload
            </Button>
          </div>
          <p className="text-sm text-gray-500">{resumeText.length} characters (minimum 50 required)</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="w-5 h-5 mr-2 text-blue-600" />
          Upload Your Current Resume
        </CardTitle>
        <CardDescription>
          Upload your existing resume so we can have a more personalized conversation about your experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
              <p className="text-gray-600">Processing your resume...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <FileText className="w-12 h-12 mx-auto text-gray-400" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">Drop your resume here, or click to browse</p>
                <p className="text-sm text-gray-500">Supports PDF and text files (max 2MB)</p>
              </div>
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileInput}
                className="hidden"
                id="resume-upload"
                disabled={isProcessing}
              />
              <div className="flex gap-2 justify-center">
                <label htmlFor="resume-upload">
                  <Button asChild className="cursor-pointer">
                    <span>Choose File</span>
                  </Button>
                </label>
                <Button variant="outline" onClick={() => setShowTextInput(true)}>
                  Paste Text Instead
                </Button>
              </div>
            </div>
          )}
        </div>

        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Best results:</strong> Use PDF files or paste text directly. Word documents should be saved as PDF
            first.
          </AlertDescription>
        </Alert>

        <Alert className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your resume will be used only to personalize your interview questions and will not be stored permanently.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
