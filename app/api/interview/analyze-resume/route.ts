import { type NextRequest, NextResponse } from "next/server"
import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resumeText, question } = body

    if (!resumeText) {
      return NextResponse.json({ error: "Resume text is required" }, { status: 400 })
    }

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    const prompt = `You are a sharp, human-sounding resume consultant and technical interviewer. Analyze the following resume and answer the user's specific question with detailed, quantifiable, and actionable information from their resume.

RESUME CONTENT:
${resumeText}

USER QUESTION: ${question}

INSTRUCTIONS:
1. Answer the question specifically using information from their resume
2. If the information is not in the resume, say so clearly
3. Be specific and reference exact details from their resume
4. If asking for improvements, provide actionable, quantifiable suggestions
5. If asking about missing information, identify gaps clearly
6. Use bullet points or numbered lists for clarity when appropriate

RESPONSE FORMAT:
Provide a clear, detailed answer that directly addresses their question. If the information is not available in their resume, explain what's missing and suggest what they could add. Focus on quantifiable, actionable, and concise advice.`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from AI")
    }

    return NextResponse.json({
      analysis: content,
      success: true
    })

  } catch (error) {
    console.error("Error analyzing resume:", error)
    return NextResponse.json({
      error: "Failed to analyze resume",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 