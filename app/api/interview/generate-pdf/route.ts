import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { latexContent, filename } = await request.json()

    if (!latexContent) {
      return NextResponse.json({ error: "Missing LaTeX content" }, { status: 400 })
    }

    console.log("Generating PDF for user:", user.id)

    // Use a LaTeX compilation service
    // For this implementation, we'll use a free LaTeX compilation service
    const pdfResponse = await compileLatexToPDF(latexContent, filename)

    if (!pdfResponse.success) {
      throw new Error(pdfResponse.error || "PDF generation failed")
    }

    return NextResponse.json({
      success: true,
      pdfUrl: pdfResponse.pdfUrl,
      filename: filename.replace('.tex', '.pdf')
    })

  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json({
      error: "Failed to generate PDF",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function compileLatexToPDF(latexContent: string, filename: string): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  try {
    // Use a LaTeX compilation service
    // For this example, we'll use a simple approach with a free service
    // In production, you might want to use services like:
    // - Overleaf API (paid)
    // - LaTeX.Online
    // - Custom LaTeX compilation server
    
    console.log("Attempting LaTeX compilation...")
    
    const response = await fetch("https://latex.ytotech.com/builds/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resources: [
          {
            path: "main.tex",
            content: latexContent
          }
        ],
        main: "main.tex",
        compiler: "pdflatex",
        options: {
          timeout: 30
        }
      })
    })

    if (!response.ok) {
      console.error(`LaTeX compilation failed with status: ${response.status}`)
      throw new Error(`LaTeX compilation failed: ${response.status}`)
    }

    const result = await response.json()
    console.log("LaTeX compilation result:", result)

    if (result.status === "success" && result.pdf) {
      // Convert base64 PDF to blob URL
      const pdfBlob = base64ToBlob(result.pdf, "application/pdf")
      const pdfUrl = URL.createObjectURL(pdfBlob)
      
      return {
        success: true,
        pdfUrl
      }
    } else {
      console.error("LaTeX compilation failed:", result.error || "Unknown error")
      throw new Error(result.error || "PDF generation failed")
    }

  } catch (error) {
    console.error("LaTeX compilation error:", error)
    
    // Fallback: return error with suggestion
    return {
      success: false,
      error: `LaTeX compilation failed: ${error instanceof Error ? error.message : "Unknown error"}. Please use the LaTeX file with Overleaf or a local LaTeX compiler.`
    }
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
} 