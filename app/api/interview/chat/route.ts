import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

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
    
    if (body.prompt) {
      // Simple format
      userMessage = body.prompt
    } else if (body.userMessage) {
      // Complex format from conversational session
      userMessage = body.userMessage
      resumeText = body.resumeText || ""
      conversationHistory = body.conversation || []
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
  let prompt = `You are an expert resume consultant and technical interviewer. You have access to the user's resume and conversation history. Your goal is to provide personalized, specific advice and ask targeted follow-up questions.

RESUME CONTENT:
${resumeText || "No resume uploaded yet."}

CONVERSATION HISTORY:
${conversationHistory.length > 0 ? conversationHistory.map(turn => `${turn.speaker.toUpperCase()}: ${turn.message}`).join('\n') : "No previous conversation."}

CORE RESPONSIBILITIES:
1. **Resume-Specific Responses**: When asked about resume content, provide specific, accurate information from their resume
2. **Personalized Questions**: Ask follow-up questions based on their actual experience and projects
3. **XYZ Bullet Enhancement**: Help them create compelling XYZ-format bullets (Action + Technology + Impact)
4. **Gap Analysis**: Identify areas where their resume could be strengthened
5. **Role-Specific Guidance**: Provide advice tailored to their target roles

RESPONSE GUIDELINES:
- If they ask about specific items on their resume, reference the exact content
- If they ask for improvements, suggest specific changes based on their current content
- If they ask about missing information, identify gaps and ask targeted questions
- Always be specific and actionable
- Use their actual experience, technologies, and projects in your responses
- Ask follow-up questions that build on their resume content

EXAMPLE RESPONSES:
User: "What's on my resume?"
You: "Based on your resume, I can see you have experience as a Software Engineer at [Company] where you worked with React and Node.js. You also have a project called [Project Name] that used [technologies]. Let me ask you some specific questions about your experience with [specific technology]..."

User: "How can I improve my resume?"
You: "Looking at your resume, I notice a few areas for improvement. Your experience at [Company] mentions 'developed features' but doesn't specify the impact. Could you tell me more about how many users were affected by your work, or what performance improvements you achieved?"

User: "What technologies do I know?"
You: "From your resume, I can see you have experience with [list specific technologies from their resume]. However, I'd like to know more about your proficiency level with [specific technology] and any recent projects where you used it."

IMPORTANT: Always reference specific content from their resume when possible. If information is missing, ask targeted questions to gather it.`

  return prompt
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
