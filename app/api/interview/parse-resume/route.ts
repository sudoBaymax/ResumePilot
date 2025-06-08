import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const resumeFile = formData.get("resume") as File

    if (!resumeFile) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 })
    }

    console.log("Processing resume file:", {
      name: resumeFile.name,
      size: resumeFile.size,
      type: resumeFile.type,
    })

    let text = ""

    // Handle different file types
    if (resumeFile.type === "text/plain") {
      text = await resumeFile.text()
    } else if (resumeFile.type === "application/pdf") {
      // For PDF files, we'll use a simple text extraction
      // In production, you might want to use a proper PDF parsing library
      const arrayBuffer = await resumeFile.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Simple PDF text extraction (this is basic and might not work for all PDFs)
      const decoder = new TextDecoder("utf-8")
      text = decoder.decode(uint8Array)

      // Clean up the text
      text = text
        .replace(/[^\x20-\x7E\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    } else {
      // For Word documents, we'll need to handle them differently
      // For now, we'll return an error asking for PDF or text
      return NextResponse.json(
        {
          error: "Please convert your resume to PDF or text format for best results",
        },
        { status: 400 },
      )
    }

    if (!text || text.length < 50) {
      return NextResponse.json(
        {
          error: "Could not extract text from resume. Please try a different format.",
        },
        { status: 400 },
      )
    }

    console.log("Extracted text length:", text.length)

    return NextResponse.json({
      text: text.substring(0, 10000), // Limit to first 10k characters
      success: true,
    })
  } catch (error) {
    console.error("Error parsing resume:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
