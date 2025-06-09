import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { OpenAI } from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Track conversation context for better responses
interface ConversationAnalysis {
  mentionedTechnologies: string[]
  mentionedProjects: string[]
  mentionedMetrics: boolean
  mentionedTeamSize: boolean
  mentionedChallenges: boolean
  mentionedTimeframe: boolean
  mentionedBusinessImpact: boolean
  askedAboutTech: boolean
  askedAboutMetrics: boolean
  askedAboutTeam: boolean
  askedAboutChallenges: boolean
}

function analyzeConversation(conversation: any[]): ConversationAnalysis {
  const userMessages = conversation.filter((turn) => turn.speaker === "user").map((turn) => turn.message.toLowerCase())
  const aiMessages = conversation.filter((turn) => turn.speaker === "ai").map((turn) => turn.message.toLowerCase())

  const allUserText = userMessages.join(" ")
  const allAiText = aiMessages.join(" ")

  // Extract mentioned technologies
  const techKeywords = [
    "react",
    "vue",
    "angular",
    "node",
    "python",
    "javascript",
    "typescript",
    "java",
    "c#",
    "php",
    "ruby",
    "go",
    "rust",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "sql",
    "mongodb",
    "redis",
    "postgresql",
    "mysql",
    "api",
    "rest",
    "graphql",
    "microservice",
    "frontend",
    "backend",
    "fullstack",
    "database",
    "cloud",
    "git",
    "ci/cd",
    "jenkins",
    "terraform",
    "ansible",
    "express",
    "django",
    "flask",
    "spring",
    "laravel",
  ]
  const mentionedTechnologies = techKeywords.filter((tech) => allUserText.includes(tech))

  // Extract project indicators
  const projectKeywords = [
    "project",
    "application",
    "system",
    "platform",
    "website",
    "app",
    "service",
    "tool",
    "dashboard",
    "feature",
  ]
  const mentionedProjects = projectKeywords.filter((proj) => allUserText.includes(proj))

  return {
    mentionedTechnologies,
    mentionedProjects,
    mentionedMetrics:
      /\d+%|\d+x|improved|increased|decreased|reduced|saved|faster|slower|million|thousand|users|requests|performance/.test(
        allUserText,
      ),
    mentionedTeamSize: /team|colleague|developer|engineer|people|person|solo|alone|pair|group/.test(allUserText),
    mentionedChallenges: /challenge|problem|issue|difficult|hard|struggle|obstacle|bug|error/.test(allUserText),
    mentionedTimeframe: /week|month|year|day|hour|sprint|quarter|deadline|timeline/.test(allUserText),
    mentionedBusinessImpact: /revenue|cost|customer|user|business|company|sales|profit|efficiency/.test(allUserText),
    askedAboutTech: /what.*technolog|which.*tool|what.*stack|what.*language|what.*framework/.test(allAiText),
    askedAboutMetrics: /how much|what.*metric|what.*number|how many|percentage|improve/.test(allAiText),
    askedAboutTeam: /team.*size|how many.*people|who.*work|team.*member/.test(allAiText),
    askedAboutChallenges: /challenge|difficult|problem|obstacle/.test(allAiText),
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Chat Interview API Called ===")

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
          message: "Can you tell me about a specific project you've worked on recently?",
          shouldEnd: false,
          bullets: [],
        },
        { status: 200 },
      )
    }

    const { conversation, userMessage, resumeText, roleType, conversationTime, maxTime } = body

    // Validate input
    if (!userMessage || typeof userMessage !== "string") {
      console.error("Invalid user message:", userMessage)
      return NextResponse.json(
        {
          message: "I didn't receive your message properly. Can you try typing it again?",
          shouldEnd: false,
          bullets: [],
        },
        { status: 200 },
      )
    }

    const timeRemaining = maxTime - conversationTime
    const shouldWrapUp = timeRemaining < 180 // Less than 3 minutes
    const userResponses = conversation.filter((turn: any) => turn.speaker === "user")

    console.log("Chat conversation analysis:", {
      totalTurns: conversation.length,
      userResponses: userResponses.length,
      timeRemaining,
      shouldWrapUp,
      lastMessage: userMessage.substring(0, 100),
    })

    // If we have enough conversation or should wrap up, end the conversation
    if (shouldWrapUp || userResponses.length >= 8) {
      console.log("Ending chat conversation - generating final bullets")

      let bullets = []
      try {
        const conversationHistory = conversation
          .map((turn: any) => `${turn.speaker.toUpperCase()}: ${turn.message}`)
          .join("\n\n")

        const bulletsResponse = await fetch(`${request.nextUrl.origin}/api/interview/generate-bullets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transcript: conversationHistory + `\nUSER: ${userMessage}`,
            question: "Full conversation summary",
            role: roleType || "Software Engineer",
            context: "Chat interview",
          }),
        })

        if (bulletsResponse.ok) {
          const bulletData = await bulletsResponse.json()
          bullets = bulletData.bullets || []
          console.log("Generated bullets from chat:", bullets.length)
        }
      } catch (bulletError) {
        console.error("Error generating bullets:", bulletError)
      }

      return NextResponse.json({
        message:
          "Perfect! I have excellent material from our conversation. Let me generate your professional resume bullets now.",
        shouldEnd: true,
        bullets: bullets,
      })
    }

    // Analyze the conversation for context
    const analysis = analyzeConversation([...conversation, { speaker: "user", message: userMessage }])

    console.log("Chat analysis:", {
      mentionedTech: analysis.mentionedTechnologies,
      mentionedProjects: analysis.mentionedProjects.length,
      hasMetrics: analysis.mentionedMetrics,
    })

    let aiMessage = null

    // Try to use OpenAI for contextual follow-up generation
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn("OpenAI API key not configured, using fallback")
        throw new Error("OpenAI not configured")
      }

      const conversationHistory = conversation
        .map((turn: any) => `${turn.speaker.toUpperCase()}: ${turn.message}`)
        .join("\n\n")

      const prompt = `You are an expert resume coach conducting a chat-based interview. The user just sent: "${userMessage}"

CONVERSATION HISTORY:
${conversationHistory}

ANALYSIS:
- Technologies mentioned: ${analysis.mentionedTechnologies.join(", ") || "none"}
- Has metrics: ${analysis.mentionedMetrics}
- Mentioned team: ${analysis.mentionedTeamSize}
- Asked about tech: ${analysis.askedAboutTech}
- Asked about metrics: ${analysis.askedAboutMetrics}

INSTRUCTIONS:
1. Respond naturally to what the user just said
2. Ask ONE specific follow-up question to get quantifiable details for resume bullets
3. Focus on technologies, metrics, team size, challenges, or business impact
4. Be conversational and encouraging (under 50 words)
5. Avoid asking the same type of question twice

EXAMPLES:
- User mentions "React dashboard" → "That sounds great! What specific React features did you use and how many users does the dashboard serve?"
- User mentions "improved performance" → "Excellent! By how much did performance improve? What metrics did you track?"
- User mentions "worked with team" → "Nice! How big was the team and what was your specific role in the project?"

Generate a natural, encouraging response with ONE specific follow-up question:`

      console.log("Making OpenAI API call for chat response...")

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a friendly resume coach conducting a chat interview. Be encouraging and ask specific follow-up questions to get quantifiable details. Keep responses under 50 words.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 150,
      })

      aiMessage = completion.choices[0].message.content?.trim()
      console.log("OpenAI chat response:", aiMessage)

      // Validate the AI response
      if (!aiMessage || aiMessage.length < 10) {
        throw new Error("Invalid AI response")
      }
    } catch (openaiError) {
      console.error("OpenAI error:", openaiError)
      aiMessage = null
    }

    // Use AI message or contextual fallback
    let finalMessage = aiMessage
    if (!finalMessage) {
      // Generate contextual fallback based on user's message
      const message = userMessage.toLowerCase()

      if (message.includes("react") || message.includes("frontend")) {
        finalMessage = "That's great! What specific React features did you implement and how many users does it serve?"
      } else if (message.includes("api") || message.includes("backend")) {
        finalMessage = "Interesting! What was the scale of this API and how did you optimize its performance?"
      } else if (message.includes("database") || message.includes("sql")) {
        finalMessage =
          "Nice work! How did you design the database schema and what performance improvements did you achieve?"
      } else if (message.includes("team") || message.includes("collaborate")) {
        finalMessage = "Great! How big was the team and what was your specific role in the project?"
      } else if (message.includes("improve") || message.includes("optimize")) {
        finalMessage = "Excellent! What specific metrics improved and by how much?"
      } else {
        finalMessage =
          "That sounds interesting! Can you tell me more about the specific technologies you used and the impact it had?"
      }

      console.log("Using contextual chat fallback:", finalMessage)
    }

    return NextResponse.json({
      message: finalMessage,
      shouldEnd: false,
      bullets: [],
    })
  } catch (error) {
    console.error("=== Critical Error in Chat Interview ===")
    console.error("Error details:", error)

    // Always return a valid response
    return NextResponse.json(
      {
        message: "I'm having trouble processing that. Can you tell me more about your recent work experience?",
        shouldEnd: false,
        bullets: [],
      },
      { status: 200 },
    )
  }
}
