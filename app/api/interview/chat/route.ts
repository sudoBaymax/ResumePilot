import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { supabase } from "@/lib/supabase"
import { incrementUsage, isAdminUser } from "@/lib/subscription"
import { checkAndIncrementUsage } from "@/lib/middleware/subscription-guard"

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
      const usageResult = await checkAndIncrementUsage(userId, "interview");
      console.log("[Interview Usage] checkAndIncrementUsage result:", usageResult);
      if (!usageResult.success) {
        return NextResponse.json({
          error: "Usage limit reached",
          message: usageResult.error || "You have reached your monthly interview limit. Please upgrade your plan to continue.",
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
  // Helper: extract the first experience/project/education entry from the resume text (very basic regex, can be improved)
  function extractFirstEntry(resume: string): string | null {
    // Try to find a job title/company/year pattern
    const expMatch = resume.match(/(\b(?:experience|work|employment)\b[\s\S]{0,100})/i);
    if (expMatch) return expMatch[1];
    const projMatch = resume.match(/(\bproject[s]?\b[\s\S]{0,100})/i);
    if (projMatch) return projMatch[1];
    const eduMatch = resume.match(/(\b(?:education|degree|university|college)\b[\s\S]{0,100})/i);
    if (eduMatch) return eduMatch[1];
    return null;
  }

  // Pick a random initial prompt template
  const templates = [
    (entry: string) => `Let's start with this from your resume: "${entry}". Can you share more details, especially any results or technologies?`,
    (entry: string) => `Your resume mentions: "${entry}". What was your biggest achievement in this role or project?`,
    (entry: string) => `I see "${entry}" in your resume. Can you walk me through your main responsibilities and any quantifiable results?`,
    (entry: string) => `Let's dig into "${entry}". What tools did you use, and what impact did you have?`,
    (entry: string) => `Starting with "${entry}", can you tell me about a challenge you faced and how you solved it?`,
  ];
  const entry = extractFirstEntry(resumeText || "");
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  const initialPrompt = entry ? randomTemplate(entry) : "Let's start with your most recent experience or project. Can you share details, results, and technologies?";

  return `You are an AI resume assistant acting as a one-on-one expert career coach. Your goal is to help the user build or refine a complete, professional resume in a conversational, thoughtful, and detailed way.

You have access to the user's uploaded resume:
[RESUME TEXT START]
${resumeText || "No resume uploaded yet."}
[RESUME TEXT END]

CONVERSATION HISTORY:
${conversationHistory.length > 0 ? conversationHistory.map(turn => `${turn.speaker.toUpperCase()}: ${turn.message}`).join('\n') : "No previous conversation."}

---

🧠 Behavior Rules:
- Use the full 15-minute session unless the user says the keyword: "GENERATE_RESUME" (all caps, no spaces). If the user types this, immediately stop prompting and finalize the resume content.
- Throughout the session, ensure the user has at least:
  - 1 project
  - 1 work experience
  - 1 education section (but do not include GPA if GPA < 3.5/4.0)
  - A curated skills/technologies section with relevant keywords
  - Basic contact information (full name, email, GitHub, phone)
- Maximize quality and completeness before generating the resume.

💬 Conversation Style:
- Speak like a human career coach — friendly, helpful, and strategic.
- At the start of each topic (experience, project, education, skills), give a 1-line tip to help the user understand what you’re about to do.
- Ask extremely specific questions to extract missing details. Examples:
  - "What was the outcome of this project? Did it help users or reduce load?"
  - "Did you work in a team or solo? What tools did you use?"
  - "Can you quantify the result or describe the before/after?"
- Use the XYZ bullet format for all experience/project bullets:
  - X (what you did) using Y (how you did it) to achieve Z (what it accomplished).
- Ensure every experience and project has 3 bullet points, each one clear and substantive using XYZ.
- If the user requests to add a new experience, project, or education, help them do so.

🗂️ Resume Context:
- Quote and analyze from the uploaded resume to improve sections or ask deeper questions.
- If the resume is missing a required section, prompt the user to add it.
- For education, do not include GPA if GPA < 3.5/4.0.

🔍 Final Review Checklist:
After gathering all resume content, do a final structured review with the user:
- Verify there’s at least one entry in each of: Project, Work Experience, Education (if GPA >= 3.5), Skills, Contact Info.
- Review bullet points with the user. Ask: “Do these sound like you? Are we missing anything critical?”
- Ask if they want to change the resume tone (e.g. more formal, casual, punchy, recruiter-friendly).
- Show a list of popular skill keywords and ask the user which ones apply (or let them input their own). Example list: Python, JavaScript, React, PostgreSQL, Git, Docker, Figma, Firebase, AWS, CI/CD, Agile, REST APIs.
- Confirm contact information and display a simple form asking for: Full name, Email, GitHub/Portfolio, LinkedIn (optional), Phone number (optional).
- Only after the user confirms everything or types GENERATE_RESUME, proceed to finalize the resume content using all gathered and structured information.

Always reference the user's uploaded resume for context, and guide the conversation step-by-step, one topic at a time, with specific, actionable questions and tips.

---

# INITIAL PROMPT TO USER
${initialPrompt}
`;
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
