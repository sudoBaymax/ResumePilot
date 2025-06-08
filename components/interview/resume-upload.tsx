"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ResumeUploadProps {
  onResumeUploaded: (resumeText: string, fileName: string) => void
  isProcessing?: boolean
}

export function ResumeUpload({ onResumeUploaded, isProcessing = false }: ResumeUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
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
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, Word document, or text file.",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
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

      if (!response.ok) {
        throw new Error("Failed to parse resume")
      }

      const { text } = await response.json()

      toast({
        title: "Resume Uploaded Successfully",
        description: "We've analyzed your resume and will use it to personalize your interview.",
      })

      onResumeUploaded(text, file.name)
    } catch (error) {
      console.error("Error uploading resume:", error)
      toast({
        title: "Upload Failed",
        description: "There was an error processing your resume. Please try again.",
        variant: "destructive",
      })
      setUploadedFile(null)
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
                <p className="text-sm text-gray-500">Supports PDF, Word documents, and text files (max 10MB)</p>
              </div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileInput}
                className="hidden"
                id="resume-upload"
                disabled={isProcessing}
              />
              <label htmlFor="resume-upload">
                <Button asChild className="cursor-pointer">
                  <span>Choose File</span>
                </Button>
              </label>
            </div>
          )}
        </div>

        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your resume will be used only to personalize your interview questions and will not be stored permanently.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
