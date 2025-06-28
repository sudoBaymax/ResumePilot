import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { supabase } from "@/lib/supabase"
import { incrementUsage, isAdminUser } from "@/lib/subscription"

// Create an OpenAI API client (that's edge-compatible!).
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// IMPORTANT! Set the runtime to edge
export const runtime = "edge"

export async function POST(req: Request): Promise<Response> {
  try {
    // Extract the request body
    const body = await req.json()
    
    // Handle both simple prompt and complex conversation format
    let userMessage: string
    let resumeText: string = ""
    let conversationHistory: any[] = []
    let userId: string | null = null
    let userEmail: string | null = null
    let isInterview = false
    
    // Check for auth header (for interview usage tracking)
    const authHeader = (req as any).headers?.get?.("authorization") || (req as any).headers?.authorization
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (!error && user) {
        userId = user.id
        userEmail = user.email ?? null
      }
    }

    if (body.prompt) {
      // Simple format
      userMessage = body.prompt
    } else if (body.userMessage) {
      // Complex format from conversational session
      userMessage = body.userMessage
      resumeText = body.resumeText || ""
      conversationHistory = body.conversation || []
      isInterview = true
    } else {
      return NextResponse.json({ 
        error: "Missing required field", 
        message: "Either 'prompt' or 'userMessage' is required" 
      }, { status: 400 })
    }

    // Validate that userMessage is not null or empty
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
      return NextResponse.json({ 
        error: "Invalid message", 
        message: "Message must be a non-empty string" 
      }, { status: 400 })
    }

    // Create a comprehensive system prompt that includes resume analysis
    const systemPrompt = createSystemPrompt(resumeText, conversationHistory)

    // Build messages array with conversation history
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(turn => ({
        role: turn.speaker === "user" ? "user" : "assistant",
        content: turn.message
      })),
      { role: "user", content: userMessage }
    ]

    // Ask OpenAI for a chat completion
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: false,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    })

    // Extract the response content
    const aiMessage = response.choices?.[0]?.message?.content

    if (!aiMessage) {
      return NextResponse.json({ 
        error: "No response from AI", 
        message: "Failed to generate response" 
      }, { status: 500 })
    }

    // Determine if conversation should end based on content
    const shouldEnd = shouldEndConversation(userMessage, aiMessage, conversationHistory.length)

    // Check for admin simulation plan
    const adminSimPlan = body.adminSimPlan;

    // If simulating an unlimited plan, skip usage increment
    const isSimulatingUnlimited = adminSimPlan === "coach" || adminSimPlan === "admin";

    // Increment usage ONLY if this is the first message in a new interview session
    if (
      isInterview &&
      userId &&
      userEmail &&
      !isAdminUser(userEmail) &&
      !isSimulatingUnlimited &&
      conversationHistory.length === 0 // Only increment on the first message of a new interview
    ) {
      const success = await incrementUsage(userId, "interview");
      if (!success) {
        return NextResponse.json({
          error: "Usage limit reached",
          message: "You have reached your monthly interview limit. Please upgrade your plan to continue.",
        }, { status: 403 });
      }
    }

    // Return JSON response
    return NextResponse.json({
      message: aiMessage,
      shouldEnd,
      bullets: [],
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

function createSystemPrompt(resumeText: string, conversationHistory: any[]): string {
  let prompt = `You are a sharp, human-sounding resume consultant and technical interviewer. You've read the user's resume and conversation history. Your job is to lead the resume upgrade process with focused, concise questions and high-impact suggestions.

RESUME CONTENT:
${resumeText || "No resume uploaded yet."}

CONVERSATION HISTORY:
${conversationHistory.length > 0 ? conversationHistory.map(turn => `${turn.speaker.toUpperCase()}: ${turn.message}`).join('\n') : "No previous conversation."}

YOUR JOB:
- Take initiative. Do not wait for the user to ask questions — you drive the session.
- Always go one experience or project at a time, starting from the top of the resume.
- For each item, quickly summarize what's there and ask the user for missing context:
  - What did you actually do?
  - What tools did you use?
  - What changed because of your work (metrics, outcomes, improvements)?
- Keep your messages short, direct, and focused on upgrading one bullet at a time.
- As soon as a bullet is improved, move to the next one.
- Go through all relevant resume sections: experience, projects, skills, and education — in that order.
- Once everything is covered OR 15 minutes have passed, generate a complete upgraded resume using what you've gathered.

KEY PRINCIPLES TO FOLLOW:
- Action + Tool + Outcome = great bullet (aka XYZ format).
- Every bullet should show *impact*, not just tasks. If a bullet says "worked on app," ask what the result was.
- Always push for quantifiable results: users, dollars, percentages, time saved, performance gains.
- Never ask about or include vague buzzwords (like "team player" or "critical thinker") — show soft skills through outcomes.
- Assume the user wants a clean, 1-page LaTeX resume optimized for ATS.
- Suggest including only relevant experience for the role — ignore marketing if they're applying to software jobs.
- Ask about GitHub, portfolios, or links only if they're not already on the resume.
- Don't wait for permission to revise — rewrite weak bullets as you go, then confirm with the user.

SAMPLE RESPONSE BEHAVIOR:
Example 1:
"You listed this bullet: 'Worked on web dashboard for internal analytics.' Let's make this stronger. What did you build exactly? What stack? And did it save anyone time or improve anything?"

Example 2:
"You mentioned a project using Python and Flask. Was it deployed? How many users or what kind of problem did it solve? I'd like to reword it to show actual value."

Example 3:
"Your education section looks fine, but you included high school even though you have a degree. I'd recommend cutting that. Anything specific from university you'd like to highlight (e.g., capstone, awards, research)?"

SESSION LOGIC:
- Go bullet-by-bullet and section-by-section.
- If 15 minutes of back-and-forth pass or all resume content is covered, generate the upgraded resume in full LaTeX format.
- Be efficient and move quickly — value clarity over small talk.
- You're here to help them tell a stronger story, line by line.

- Keep individual bullets short and concise.`;

  return prompt;
}

function shouldEndConversation(userMessage: string, aiMessage: string, conversationLength: number): boolean {
  const userLower = userMessage.toLowerCase()
  const aiLower = aiMessage.toLowerCase()
  
  // End if user explicitly wants to end
  if (userLower.includes('end') || userLower.includes('finish') || userLower.includes('done') || userLower.includes('complete')) {
    return true
  }
  
  // End if AI suggests ending
  if (aiLower.includes('perfect') && aiLower.includes('material') && conversationLength > 3) {
    return true
  }
  
  // Assess context quality
  const hasTechnicalDetails = userLower.includes("react") || 
                             userLower.includes("python") || 
                             userLower.includes("api") || 
                             userLower.includes("database") ||
                             userLower.includes("algorithm") ||
                             userLower.includes("framework") ||
                             userLower.includes("node") ||
                             userLower.includes("javascript")
  
  const hasMetrics = /\d+%|\d+ users|\d+ customers|\d+ projects|\d+ team|\$\d+|\d+ hours|\d+ days|\d+ lines|\d+k/.test(userMessage)
  
  const hasLeadership = userLower.includes("led") || 
                       userLower.includes("managed") || 
                       userLower.includes("coordinated") || 
                       userLower.includes("mentored") ||
                       userLower.includes("supervised")
  
  // End if we have comprehensive context
  if (conversationLength >= 6 && hasTechnicalDetails && hasMetrics) {
    return true
  }
  
  // End if we have good leadership context
  if (conversationLength >= 5 && hasLeadership && hasMetrics) {
    return true
  }
  
  // End if conversation is getting very long
  if (conversationLength > 10) {
    return true
  }
  
  // End if user seems satisfied
  if (userLower.includes("thanks") || userLower.includes("thank you") || userLower.includes("that's all")) {
    return true
  }
  
  return false
}
