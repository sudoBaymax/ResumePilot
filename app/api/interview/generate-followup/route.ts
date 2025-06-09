import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Simple fallback questions for different conversation stages
const FALLBACK_QUESTIONS = [
  "Can you tell me more about the specific technologies you used in that project?",
  "What was the impact or result of that work? Any metrics you can share?",
  "How big was the team you worked with on this?",
  "What challenges did you face and how did you overcome them?",
  "Can you walk me through your role in that project?",
  "What specific improvements or optimizations did you make?",
  "How did you measure the success of that implementation?",
  "What was the business impact of your work?",
]

const WRAP_UP_MESSAGES = [
  "Thank you for sharing your experience! I have great material to work with for your resume bullets.",
  "That's excellent information! Let me generate some professional bullet points from our conversation.",
  "Perfect! I've gathered enough details to create compelling resume bullets for you.",
]

export async function POST(request: NextRequest) {
  try {
    console.log("=== Generate Follow-up API Called ===")

    // Validate authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      console.error("No authorization header")
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return NextResponse.json(
        {
          message: "Can you tell me more about your recent work experience?",
          shouldEnd: false,
          bullets: [],
        },
        { status: 200 },
      )
    }

    console.log("Request body parsed:", {
      conversationLength: body.conversation?.length,
      hasResumeText: !!body.resumeText,
      roleType: body.roleType,
      conversationTime: body.conversationTime,
    })

    const { conversation, resumeText, roleType, conversationTime, maxTime } = body

    // Validate conversation data
    if (!conversation || !Array.isArray(conversation)) {
      console.error("Invalid conversation data:", conversation)
      return NextResponse.json(
        {
          message: "Let's start fresh - can you tell me about your current role?",
          shouldEnd: false,
          bullets: [],
        },
        { status: 200 },
      )
    }

    const timeRemaining = maxTime - conversationTime
    const shouldWrapUp = timeRemaining < 180 // Less than 3 minutes
    const userResponses = conversation.filter((turn) => turn.speaker === "user")

    console.log("Conversation analysis:", {
      totalTurns: conversation.length,
      userResponses: userResponses.length,
      timeRemaining,
      shouldWrapUp,
    })

    // If we have enough conversation or should wrap up, end the conversation
    if (shouldWrapUp || userResponses.length >= 8) {
      console.log("Ending conversation - generating final bullets")

      let bullets = []
      try {
        // Try to generate bullets from the conversation
        const conversationHistory = conversation
          .map((turn) => `${turn.speaker.toUpperCase()}: ${turn.message}`)
          .join("\n\n")

        const bulletsResponse = await fetch(`${request.nextUrl.origin}/api/interview/generate-bullets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transcript: conversationHistory,
            question: "Full conversation summary",
            role: roleType || "Software Engineer",
            context: "Conversational interview",
          }),
        })

        if (bulletsResponse.ok) {
          const bulletData = await bulletsResponse.json()
          bullets = bulletData.bullets || []
          console.log("Generated bullets:", bullets.length)
        } else {
          console.error("Bullet generation failed:", bulletsResponse.status)
        }
      } catch (bulletError) {
        console.error("Error generating bullets:", bulletError)
      }

      const wrapUpMessage = WRAP_UP_MESSAGES[Math.floor(Math.random() * WRAP_UP_MESSAGES.length)]

      return NextResponse.json({
        message: wrapUpMessage,
        shouldEnd: true,
        bullets: bullets,
      })
    }

    // Try to use OpenAI for follow-up generation
    let aiMessage = null
    try {
      // Check if OpenAI is available
      if (!process.env.OPENAI_API_KEY) {
        console.warn("OpenAI API key not configured, using fallback")
        throw new Error("OpenAI not configured")
      }

      const { OpenAI } = await import("openai")
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      const conversationHistory = conversation
        .map((turn) => `${turn.speaker.toUpperCase()}: ${turn.message}`)
        .join("\n\n")

      const prompt = `You are an expert resume coach conducting a conversational interview. Based on the conversation below, ask ONE specific follow-up question to get quantifiable details for resume bullets.

Conversation:
${conversationHistory}

Ask about:
- Specific metrics, numbers, percentages
- Technologies used
- Team size
- Time saved/improved
- Business impact

Respond with ONLY the question (under 30 words). Be conversational and specific.`

      console.log("Making OpenAI API call...")

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a resume coach. Ask specific, short follow-up questions to get quantifiable details.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      })

      aiMessage = completion.choices[0].message.content?.trim()
      console.log("OpenAI response:", aiMessage)
    } catch (openaiError) {
      console.error("OpenAI error:", openaiError)
      aiMessage = null
    }

    // Use AI message or fallback
    let finalMessage = aiMessage
    if (!finalMessage || finalMessage.length < 10) {
      // Use a contextual fallback based on conversation
      const lastUserMessage = userResponses[userResponses.length - 1]?.message || ""

      if (lastUserMessage.toLowerCase().includes("project")) {
        finalMessage = "What specific technologies did you use in that project?"
      } else if (lastUserMessage.toLowerCase().includes("team")) {
        finalMessage = "How big was the team and what was your specific role?"
      } else if (
        lastUserMessage.toLowerCase().includes("improve") ||
        lastUserMessage.toLowerCase().includes("optimize")
      ) {
        finalMessage = "What metrics improved and by how much?"
      } else {
        // Random fallback
        finalMessage = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)]
      }

      console.log("Using fallback message:", finalMessage)
    }

    return NextResponse.json({
      message: finalMessage,
      shouldEnd: false,
      bullets: [],
    })
  } catch (error) {
    console.error("=== Critical Error in Generate Follow-up ===")
    console.error("Error details:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace")

    // Always return a valid response, never throw
    return NextResponse.json(
      {
        message: "Can you tell me more about your recent work and the impact you've made?",
        shouldEnd: false,
        bullets: [],
      },
      { status: 200 },
    )
  }
}
