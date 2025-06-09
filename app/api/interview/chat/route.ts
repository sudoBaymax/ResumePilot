import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"

// Create an OpenAI API client (that's edge-compatible!).
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// IMPORTANT! Set the runtime to edge
export const runtime = "edge"

export async function POST(req: Request): Promise<Response> {
  // Extract the `prompt` from the body of the request
  const { prompt } = await req.json()

  // Ask OpenAI for a streaming chat completion given the prompt
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    stream: true,
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
  })

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response)
  // Respond with the stream
  return new StreamingTextResponse(stream)
}
