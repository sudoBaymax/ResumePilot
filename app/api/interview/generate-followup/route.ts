import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { conversation, resumeText, roleType, conversationTime, maxTime } = await request.json()

    if (!conversation || !Array.isArray(conversation)) {
      return NextResponse.json({ error: "Invalid conversation data" }, { status: 400 })
    }

    console.log("Generating follow-up for conversation with", conversation.length, "turns")

    const timeRemaining = maxTime - conversationTime
    const shouldWrapUp = timeRemaining < 180 // Less than 3 minutes

    // Build conversation context
    const conversationHistory = conversation
      .map((turn) => `${turn.speaker.toUpperCase()}: ${turn.message}`)
      .join("\n\n")

    const prompt = `You are an expert resume coach conducting a conversational interview. Your goal is to extract specific, quantifiable achievements that can be turned into compelling resume bullet points.

## Context
- Role Type: ${roleType || "Software Engineer"}
- Time Remaining: ${Math.floor(timeRemaining / 60)} minutes
- Should Wrap Up: ${shouldWrapUp ? "Yes" : "No"}

## Resume Context
${resumeText ? `Resume Summary: ${resumeText.substring(0, 1000)}...` : "No resume provided"}

## Conversation So Far
${conversationHistory}

## Instructions
Based on the conversation, generate your next response as the interviewer. You should:

1. **Ask follow-up questions** that dig deeper into:
   - Specific technologies used
   - Quantifiable results (metrics, percentages, time saved, etc.)
   - Team size and collaboration
   - Challenges overcome
   - Business impact

2. **Keep responses conversational** and under 50 words
3. **Focus on one specific aspect** at a time
4. **Probe for missing details** that would make strong bullet points

${
  shouldWrapUp
    ? `
5. **IMPORTANT**: Since time is running low, start wrapping up the conversation and prepare to generate final bullet points.
`
    : ""
}

## Response Format
Return a JSON object with:
- "message": Your next question/response (conversational, under 50 words)
- "shouldEnd": boolean (true if conversation should end)
- "bullets": array of bullet objects (only if shouldEnd is true)

## Example Follow-ups
- "That sounds impactful! What specific metrics improved after you implemented that feature?"
- "Interesting! How big was the team you worked with on this project?"
- "What technologies did you use to build that system?"
- "How much time did that automation save per week?"

Generate your response now:`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume coach conducting conversational interviews. Keep responses short, focused, and designed to extract quantifiable achievements.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    })

    const responseContent = completion.choices[0].message.content
    console.log("GPT-4o-mini follow-up response:", responseContent)

    let response
    try {
      response = JSON.parse(responseContent || "{}")
    } catch (error) {
      console.error("Error parsing GPT response:", error)
      response = {
        message: "Can you tell me more about the specific results or impact of that work?",
        shouldEnd: shouldWrapUp,
        bullets: [],
      }
    }

    // If we should end, generate final bullets
    if (response.shouldEnd || shouldWrapUp) {
      try {
        const bulletsResponse = await fetch(`${request.nextUrl.origin}/api/interview/generate-bullets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transcript: conversationHistory,
            question: "Full conversation summary",
            role: roleType,
            context: "Conversational interview",
          }),
        })

        if (bulletsResponse.ok) {
          const { bullets } = await bulletsResponse.json()
          response.bullets = bullets || []
        }
      } catch (error) {
        console.error("Error generating final bullets:", error)
      }

      response.shouldEnd = true
      response.message =
        response.message ||
        "Thank you for the great conversation! I have everything I need to create your resume bullet points."
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error generating follow-up:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
