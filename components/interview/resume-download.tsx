"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Download, FileText, FileCode, ExternalLink, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface ResumeDownloadProps {
  resumeData: any
  template: string
  downloads: any
  onRegenerate?: () => void
}

export function ResumeDownload({ resumeData, template, downloads, onRegenerate }: ResumeDownloadProps) {
  const { toast } = useToast()
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (format: string) => {
    setDownloading(format)
    
    try {
      switch (format) {
        case "latex":
          downloadLatex(template, downloads.filename)
          break
        case "pdf":
          await downloadPDF(template, downloads.filename)
          break
        case "word":
          await downloadWord(resumeData, downloads.filename)
          break
        case "overleaf":
          openOverleaf(template)
          break
      }
      
      toast({
        title: "Download Successful",
        description: `Your resume has been downloaded as ${format.toUpperCase()}`,
      })
    } catch (error) {
      console.error(`Error downloading ${format}:`, error)
      toast({
        title: "Download Failed",
        description: `Failed to download ${format.toUpperCase()} file. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setDownloading(null)
    }
  }

  const downloadLatex = (template: string, filename: string) => {
    const blob = new Blob([template], { type: "application/x-tex" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadPDF = async (template: string, filename: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch("/api/interview/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          latexContent: template,
          filename: filename
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate PDF`)
      }

      const result = await response.json()
      
      if (result.success && result.pdfUrl) {
        // Download the PDF
        const a = document.createElement("a")
        a.href = result.pdfUrl
        a.download = result.filename || filename.replace('.tex', '.pdf')
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        throw new Error("PDF generation failed")
      }
    } catch (error) {
      console.error("PDF generation error:", error)
      // Fallback: suggest using Overleaf
      toast({
        title: "PDF Generation",
        description: "PDF generation requires LaTeX compilation. Please use the LaTeX file with Overleaf or a local LaTeX compiler.",
      })
      throw error
    }
  }

  const downloadWord = async (resumeData: any, filename: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch("/api/interview/generate-word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          resumeData: resumeData,
          filename: filename
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate Word document`)
      }

      const result = await response.json()
      
      if (result.success && result.wordUrl) {
        // Download the Word document
        const a = document.createElement("a")
        a.href = result.wordUrl
        a.download = result.filename || filename.replace('.tex', '.html')
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        throw new Error("Word generation failed")
      }
    } catch (error) {
      console.error("Word generation error:", error)
      // Fallback: create a simple HTML version
      const htmlContent = createSimpleHTML(resumeData)
      const blob = new Blob([htmlContent], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename.replace('.tex', '.html')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Word Document Created",
        description: "An HTML version has been created. You can open it in Word or any web browser.",
      })
    }
  }

  const createSimpleHTML = (resumeData: any): string => {
    const { name, email, phone, linkedin, github, location, roleType, education, experience, projects, skills } = resumeData
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${name} - Resume</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .name { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .contact { font-size: 14px; color: #666; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 18px; font-weight: bold; border-bottom: 2px solid #333; margin-bottom: 15px; }
        .job { margin-bottom: 20px; }
        .job-title { font-weight: bold; }
        .job-company { font-style: italic; }
        .job-dates { color: #666; }
        .bullet { margin-left: 20px; margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="name">${name}</div>
        <div class="contact">
            ${phone} • ${email} • ${location}<br>
            ${linkedin} • ${github}
        </div>
    </div>

    <div class="section">
        <div class="section-title">EDUCATION</div>
        ${education?.map((edu: any) => `
            <div class="job">
                <div class="job-title">${edu.school}</div>
                <div class="job-company">${edu.degree}</div>
                <div class="job-dates">${edu.dates} • ${edu.location}</div>
            </div>
        `).join('') || 'No education information provided.'}
    </div>

    <div class="section">
        <div class="section-title">EXPERIENCE</div>
        ${experience?.map((exp: any) => `
            <div class="job">
                <div class="job-title">${exp.title}</div>
                <div class="job-company">${exp.company}</div>
                <div class="job-dates">${exp.dates} • ${exp.location}</div>
                ${exp.bullets?.map((bullet: string) => `
                    <div class="bullet">• ${bullet}</div>
                `).join('') || ''}
            </div>
        `).join('') || 'No experience information provided.'}
    </div>

    <div class="section">
        <div class="section-title">PROJECTS</div>
        ${projects?.map((proj: any) => `
            <div class="job">
                <div class="job-title">${proj.name}</div>
                <div class="job-company">${proj.technologies}</div>
                <div class="job-dates">${proj.dates}</div>
                ${proj.bullets?.map((bullet: string) => `
                    <div class="bullet">• ${bullet}</div>
                `).join('') || ''}
            </div>
        `).join('') || 'No projects information provided.'}
    </div>

    <div class="section">
        <div class="section-title">TECHNICAL SKILLS</div>
        ${skills ? `
            <div><strong>Languages:</strong> ${skills.languages?.join(', ') || 'Not specified'}</div>
            <div><strong>Frameworks:</strong> ${skills.frameworks?.join(', ') || 'Not specified'}</div>
            <div><strong>Developer Tools:</strong> ${skills.tools?.join(', ') || 'Not specified'}</div>
            <div><strong>Libraries:</strong> ${skills.libraries?.join(', ') || 'Not specified'}</div>
        ` : 'No skills information provided.'}
    </div>
</body>
</html>
    `
  }

  const openOverleaf = (template: string) => {
    // Create a temporary file and open Overleaf
    const blob = new Blob([template], { type: "application/x-tex" })
    const url = URL.createObjectURL(blob)
    
    // Open Overleaf in a new tab
    window.open("https://www.overleaf.com/", "_blank")
    
    toast({
      title: "Overleaf Opened",
      description: "Please upload the LaTeX file to Overleaf for PDF generation.",
    })
  }

  return (
    <div className="space-y-6">
      {/* Resume Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Resume Generated Successfully!
          </CardTitle>
          <CardDescription>
            Your professional resume has been created with XYZ-format bullets optimized for {resumeData.roleType} roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{resumeData.name}</h3>
                <p className="text-sm text-gray-600">{resumeData.email} • {resumeData.phone}</p>
                <p className="text-sm text-gray-600">{resumeData.location}</p>
              </div>
              <Badge variant="outline">{resumeData.roleType}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Experience:</span> {resumeData.experience?.length || 0} positions
              </div>
              <div>
                <span className="font-medium">Projects:</span> {resumeData.projects?.length || 0} projects
              </div>
              <div>
                <span className="font-medium">Education:</span> {resumeData.education?.length || 0} degrees
              </div>
              <div>
                <span className="font-medium">Skills:</span> {resumeData.skills?.languages?.length || 0} languages
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card>
        <CardHeader>
          <CardTitle>Download Your Resume</CardTitle>
          <CardDescription>
            Choose your preferred format. LaTeX files can be compiled to PDF using Overleaf or local LaTeX compilers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LaTeX Download */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => handleDownload("latex")}
              disabled={downloading === "latex"}
            >
              <FileCode className="w-8 h-8 text-blue-600" />
              <div className="text-center">
                <div className="font-medium">LaTeX Source</div>
                <div className="text-sm text-gray-600">Edit and compile</div>
              </div>
            </Button>

            {/* Overleaf */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => handleDownload("overleaf")}
              disabled={downloading === "overleaf"}
            >
              <ExternalLink className="w-8 h-8 text-green-600" />
              <div className="text-center">
                <div className="font-medium">Open in Overleaf</div>
                <div className="text-sm text-gray-600">Online LaTeX editor</div>
              </div>
            </Button>

            {/* PDF Download */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => handleDownload("pdf")}
              disabled={downloading === "pdf"}
            >
              <FileText className="w-8 h-8 text-red-600" />
              <div className="text-center">
                <div className="font-medium">PDF</div>
                <div className="text-sm text-gray-600">Direct download</div>
              </div>
            </Button>

            {/* Word Download */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => handleDownload("word")}
              disabled={downloading === "word"}
            >
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="text-center">
                <div className="font-medium">Word</div>
                <div className="text-sm text-gray-600">MS Word format</div>
              </div>
            </Button>
          </div>

          {downloading && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-800">Preparing {downloading.toUpperCase()} download...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regenerate Option */}
      {onRegenerate && (
        <Card>
          <CardHeader>
            <CardTitle>Need Changes?</CardTitle>
            <CardDescription>
              If you'd like to modify your resume, you can regenerate it with different information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={onRegenerate}>
              Regenerate Resume
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 