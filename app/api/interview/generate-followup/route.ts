import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { OpenAI } from "openai"

// Initialize OpenAI client at the top level
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Track what types of questions have been asked to avoid repetition
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
  try {
    const userMessages = conversation
      .filter((turn) => turn.speaker === "user")
      .map((turn) => turn.message?.toLowerCase() || "")
    const aiMessages = conversation
      .filter((turn) => turn.speaker === "ai")
      .map((turn) => turn.message?.toLowerCase() || "")

    const allUserText = userMessages.join(" ")
    const allAiText = aiMessages.join(" ")

    // Extract mentioned technologies
    const techKeywords = [
      "react",
      "node",
      "python",
      "javascript",
      "typescript",
      "aws",
      "docker",
      "kubernetes",
      "sql",
      "mongodb",
      "redis",
      "api",
      "microservice",
      "frontend",
      "backend",
      "database",
      "cloud",
      "azure",
      "gcp",
      "git",
      "ci/cd",
      "jenkins",
      "terraform",
      "vue",
      "angular",
      "express",
      "django",
      "flask",
      "spring",
      "java",
      "c#",
      "php",
      "ruby",
      "go",
      "rust",
      "swift",
      "kotlin",
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
  } catch (error) {
    console.error("Error analyzing conversation:", error)
    // Return safe defaults
    return {
      mentionedTechnologies: [],
      mentionedProjects: [],
      mentionedMetrics: false,
      mentionedTeamSize: false,
      mentionedChallenges: false,
      mentionedTimeframe: false,
      mentionedBusinessImpact: false,
      askedAboutTech: false,
      askedAboutMetrics: false,
      askedAboutTeam: false,
      askedAboutChallenges: false,
    }
  }
}

function generateContextualQuestion(lastUserMessage: string, analysis: ConversationAnalysis): string {
  try {
    const message = (lastUserMessage || "").toLowerCase()

    // If user mentioned specific technologies, ask about implementation details
    if (analysis.mentionedTechnologies.length > 0 && !analysis.askedAboutTech) {
      const tech = analysis.mentionedTechnologies[0]
      return `You mentioned ${tech} - what specific features or functionality did you build with it?`
    }

    // If user mentioned a project but no metrics, ask for quantifiable results
    if (analysis.mentionedProjects.length > 0 && !analysis.mentionedMetrics && !analysis.askedAboutMetrics) {
      return `That project sounds interesting! What measurable impact did it have? Any performance improvements, user growth, or time savings?`
    }

    // If user mentioned working on something but no team context, ask about collaboration
    if (
      !analysis.mentionedTeamSize &&
      !analysis.askedAboutTeam &&
      (message.includes("built") || message.includes("developed") || message.includes("created"))
    ) {
      return `Did you work on this alone or with a team? What was your specific role in the development?`
    }

    // If user mentioned challenges or problems, dig deeper
    if (analysis.mentionedChallenges && !analysis.askedAboutChallenges) {
      return `You mentioned some challenges - how did you solve them and what was the outcome?`
    }

    // If user mentioned improvements but no specific metrics
    if (
      (message.includes("improve") || message.includes("optimize") || message.includes("enhance")) &&
      !analysis.mentionedMetrics
    ) {
      return `What specific metrics improved? Can you quantify the before and after results?`
    }

    // If user mentioned users/customers but no business impact
    if ((message.includes("user") || message.includes("customer")) && !analysis.mentionedBusinessImpact) {
      return `How did this impact the users or business? Any feedback or measurable results you can share?`
    }

    // If user mentioned building something, ask about scale
    if (
      (message.includes("built") || message.includes("developed")) &&
      !message.includes("scale") &&
      !message.includes("user")
    ) {
      return `What was the scale of this system? How many users or requests did it handle?`
    }

    // If user mentioned a timeframe, ask about what was accomplished
    if (analysis.mentionedTimeframe && !analysis.mentionedMetrics) {
      return `What did you accomplish in that timeframe? Any specific deliverables or milestones?`
    }

    // Contextual follow-ups based on specific keywords in the last message
    if (message.includes("api")) {
      return `What kind of API was it and how did other systems integrate with it?`
    }

    if (message.includes("database")) {
      return `What database technology did you use and how did you optimize its performance?`
    }

    if (message.includes("frontend") || message.includes("ui")) {
      return `What frontend technologies did you use and how did you improve the user experience?`
    }

    if (message.includes("backend") || message.includes("server")) {
      return `What backend architecture did you implement and how did it handle load?`
    }

    if (message.includes("deploy") || message.includes("production")) {
      return `What was your deployment process and how did you ensure reliability in production?`
    }

    if (message.includes("test")) {
      return `What testing strategies did you implement and how did they improve code quality?`
    }

    // Generic but contextual fallbacks
    const fallbacks = [
      "Can you walk me through the technical implementation of that?",
      "What was the most challenging part of that work and how did you overcome it?",
      "How did you measure the success of that implementation?",
      "What specific technologies or tools made that possible?",
      "What was the business impact or user feedback from that work?",
    ]

    return fallbacks[Math.floor(Math.random() * fallbacks.length)]
  } catch (error) {
    console.error("Error generating contextual question:", error)
    return "Can you tell me more about the technical details of that project?"
  }
}

export async function POST(request: NextRequest) {
  console.log("=== Generate Follow-up API Called ===")

  try {
    // Validate authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      console.error("No authorization header")
      return NextResponse.json(
        {
          message: "Can you tell me about a specific project you've worked on recently?",
          shouldEnd: false,
          bullets: [],
        },
        { status: 200 },
      )
    }

    const token = authHeader.replace("Bearer ", "")
    let user
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser(token)

      if (authError || !authUser) {
        console.error("Auth error:", authError)
        return NextResponse.json(
          {
            message: "Let's start fresh - can you tell me about your current role and recent projects?",
            shouldEnd: false,
            bullets: [],
          },
          { status: 200 },
        )
      }
      user = authUser
    } catch (authError) {
      console.error("Authentication failed:", authError)
      return NextResponse.json(
        {
          message: "Can you tell me about a specific project you've worked on recently?",
          shouldEnd: false,
          bullets: [],
        },
        { status: 200 },
      )
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

    const { conversation = [], resumeText = "", roleType = "", conversationTime = 0, maxTime = 900 } = body

    // Validate conversation data
    if (!Array.isArray(conversation)) {
      console.error("Invalid conversation data:", typeof conversation)
      return NextResponse.json(
        {
          message: "Let's start fresh - can you tell me about your current role and recent projects?",
          shouldEnd: false,
          bullets: [],
        },
        { status: 200 },
      )
    }

    const timeRemaining = maxTime - conversationTime
    const shouldWrapUp = timeRemaining < 180 // Less than 3 minutes
    const userResponses = conversation.filter((turn) => turn?.speaker === "user" && turn?.message)

    console.log("Conversation analysis:", {
      totalTurns: conversation.length,
      userResponses: userResponses.length,
      timeRemaining,
      shouldWrapUp,
    })

    // If we have enough conversation or should wrap up, end the conversation
    if (shouldWrapUp || userResponses.length >= 8) {
      console.log("Ending conversation - generating final bullets")

      return NextResponse.json({
        message: "Perfect! I have great material to work with. Let me generate your professional resume bullets now.",
        shouldEnd: true,
        bullets: [],
      })
    }

    // Analyze the conversation for context
    const analysis = analyzeConversation(conversation)
    const lastUserMessage = userResponses[userResponses.length - 1]?.message || ""

    console.log("Conversation analysis:", {
      mentionedTech: analysis.mentionedTechnologies,
      mentionedProjects: analysis.mentionedProjects.length,
      hasMetrics: analysis.mentionedMetrics,
      lastMessage: lastUserMessage.substring(0, 100),
    })

    let aiMessage = null

    // Try to use OpenAI for more sophisticated follow-up generation
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn("OpenAI API key not configured, using contextual fallback")
        throw new Error("OpenAI not configured")
      }

      const conversationHistory = conversation
        .filter((turn) => turn?.speaker && turn?.message)
        .map((turn) => `${turn.speaker.toUpperCase()}: ${turn.message}`)
        .join("\n\n")

      const prompt = `You are a sharp, human-sounding resume coach conducting a conversational interview. Based on the user's LAST response, ask ONE specific follow-up question to get quantifiable details for resume bullets. Focus on actionable, quantifiable, and concise advice.

LAST USER RESPONSE: "${lastUserMessage}"

CONVERSATION CONTEXT:
${conversationHistory}

ANALYSIS:
- Technologies mentioned: ${analysis.mentionedTechnologies.join(", ") || "none"}
- Has metrics: ${analysis.mentionedMetrics}
- Mentioned team: ${analysis.mentionedTeamSize}
- Asked about tech: ${analysis.askedAboutTech}
- Asked about metrics: ${analysis.askedAboutMetrics}

INSTRUCTIONS:
1. Focus ONLY on the user's last response
2. Ask about specific details they mentioned but didn't elaborate on
3. If they mentioned a technology, ask HOW they used it specifically
4. If they mentioned a project, ask for quantifiable results
5. If they mentioned a problem, ask how they solved it
6. If they mentioned working with others, ask about team size and their role
7. Avoid asking the same type of question twice
8. Be conversational and specific (under 25 words)

EXAMPLES:
- User mentions "React app" → "What specific React features did you implement and how many users does it serve?"
- User mentions "improved performance" → "By how much did performance improve? What metrics did you track?"
- User mentions "worked with team" → "How big was the team and what was your specific role in the project?"

Generate ONE specific follow-up question based on their last response:`

      console.log("Making OpenAI API call for contextual follow-up...")

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a sharp, human-sounding resume coach. Ask ONE specific follow-up question based on the user's last response. Be conversational and focus on getting quantifiable details. Under 25 words.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 80,
      })

      aiMessage = completion.choices[0]?.message?.content?.trim()
      console.log("OpenAI contextual response:", aiMessage)

      // Validate the AI response
      if (!aiMessage || aiMessage.length < 10 || aiMessage.length > 200) {
        throw new Error("Invalid AI response")
      }
    } catch (openaiError) {
      console.error("OpenAI error:", openaiError)
      aiMessage = null
    }

    // Use AI message or contextual fallback
    let finalMessage = aiMessage
    if (!finalMessage) {
      finalMessage = generateContextualQuestion(lastUserMessage, analysis)
      console.log("Using contextual fallback:", finalMessage)
    }

    return NextResponse.json({
      message: finalMessage,
      shouldEnd: false,
      bullets: [],
    })
  } catch (error) {
    console.error("=== Critical Error in Generate Follow-up ===")
    console.error("Error details:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    // Always return a valid response, never throw
    return NextResponse.json(
      {
        message: "Can you tell me more about the specific technologies and impact of your recent work?",
        shouldEnd: false,
        bullets: [],
      },
      { status: 200 },
    )
  }
}
