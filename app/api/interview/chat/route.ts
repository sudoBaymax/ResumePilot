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
    let prompt: string
    
    if (body.prompt) {
      // Simple format
      prompt = body.prompt
    } else if (body.userMessage) {
      // Complex format from conversational session
      prompt = body.userMessage
    } else {
      return NextResponse.json({ 
        error: "Missing required field", 
        message: "Either 'prompt' or 'userMessage' is required" 
      }, { status: 400 })
    }

    // Validate that prompt is not null or empty
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json({ 
        error: "Invalid prompt", 
        message: "Prompt must be a non-empty string" 
      }, { status: 400 })
    }

    // Ask OpenAI for a chat completion (non-streaming to avoid webpack issues)
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      stream: false, // Changed to false to avoid streaming issues
      messages: [
        {
          role: "system",
          content: `You are an experienced technical interviewer helping junior developers and new graduates create compelling resume bullet points. Your goal is to extract specific details about their projects, internships, coursework, and early career experiences.

Guidelines for junior developers:
- Focus on learning experiences and growth
- Highlight school/bootcamp projects and internships
- Ask about technologies used and challenges overcome
- Emphasize collaboration and problem-solving skills
- Look for measurable outcomes even in small projects

Example conversation flow:
User: "I built a todo app for my bootcamp final project"
You: "That's great! What technologies did you use to build it, and how many features did you implement?"

User: "I used React and Node.js, with about 5 main features like adding tasks and user authentication"
You: "Excellent! How long did the project take you, and did you work solo or with a team? Also, how many users have tested it?"

Always ask specific follow-up questions about:
- Technologies and frameworks used
- Project timeline and scope
- Team size and collaboration
- Challenges faced and how they solved them
- Learning outcomes and skills gained
- Any metrics (users, performance, time saved)`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
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

    // Return JSON response instead of streaming
    return NextResponse.json({
      message: aiMessage,
      shouldEnd: false,
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
