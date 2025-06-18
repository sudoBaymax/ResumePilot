import { type NextRequest, NextResponse } from "next/server"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const resumeFile = formData.get("resume") as File | null

    if (!resumeFile) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 })
    }

    if (resumeFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` }, { status: 413 })
    }

    console.log("Processing resume file:", {
      name: resumeFile.name,
      size: resumeFile.size,
      type: resumeFile.type,
    })

    // Helper to figure out the mime if browser left it blank
    const getExt = (name: string) => name.split(".").pop()?.toLowerCase() || ""
    const mime = resumeFile.type || `.${getExt(resumeFile.name)}`

    let text = ""

    if (mime === "text/plain" || mime === ".txt") {
      text = await resumeFile.text()
    } else if (mime === "application/pdf" || mime === ".pdf") {
      // Simple PDF text extraction for browser environment
      const arrayBuffer = await resumeFile.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Convert to string and try to extract readable text
      const decoder = new TextDecoder("utf-8", { fatal: false })
      const rawText = decoder.decode(uint8Array)

      // Basic PDF text extraction - look for readable text patterns
      // This is a simple approach that works for basic PDFs
      text = rawText
        .replace(/[^\x20-\x7E\n\r\t]/g, " ") // Keep only printable ASCII + whitespace
        .replace(/\s+/g, " ") // Normalize whitespace
        .split(" ")
        .filter((word) => word.length > 1 && /[a-zA-Z]/.test(word)) // Keep words with letters
        .join(" ")
        .trim()

      // If we didn't get much readable text, provide a helpful message
      if (text.length < 100) {
        return NextResponse.json(
          {
            error:
              "Could not extract text from this PDF. Please try converting it to a text file or use a different PDF.",
            suggestion: "For best results, copy and paste your resume text directly or save as a .txt file.",
          },
          { status: 400 },
        )
      }
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === ".docx" ||
      mime === "application/msword" ||
      mime === ".doc"
    ) {
      // For Word documents, we can't parse them in the browser without libraries
      return NextResponse.json(
        {
          error: "Word documents are not supported yet. Please convert to PDF or text format.",
          suggestion: "Save your resume as a PDF or copy the text and paste it into a .txt file.",
        },
        { status: 415 },
      )
    } else {
      return NextResponse.json(
        {
          error: "Unsupported file type. Please upload PDF or TXT files.",
          suggestion: "Supported formats: PDF (.pdf) and Text (.txt) files.",
        },
        { status: 415 },
      )
    }

    // Basic text cleaning
    text = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim()

    if (text.length < 50) {
      return NextResponse.json(
        {
          error: "Could not extract enough readable text from the file.",
          suggestion: "Please try a different file format or copy and paste your resume text directly.",
        },
        { status: 400 },
      )
    }

    console.log("Successfully extracted text, length:", text.length)

    return NextResponse.json(
      {
        filename: resumeFile.name,
        mimetype: mime,
        text: text.slice(0, 10_000), // First 10k chars
        success: true,
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error("Resume parsing error:", err?.message || err)
    return NextResponse.json(
      {
        error: "Failed to process the resume file",
        details: err?.message || "Unknown error",
        suggestion: "Please try a different file or convert to text format.",
      },
      { status: 500 },
    )
  }
}
