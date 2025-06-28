import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verify user with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const { conversationSummary, roleType = "Software Engineer" } = body

    console.log("Generating resume summary for user:", user.id)

    if (!conversationSummary || conversationSummary.trim().length === 0) {
      return NextResponse.json({ error: "No conversation summary provided" }, { status: 400 })
    }

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured")
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    try {
      const prompt = `You are a sharp, human-sounding resume consultant and technical interviewer. Your job is to extract and format the key information from this conversation into professional resume bullet points and summaries, focusing on quantifiable, actionable, and concise advice.

Based on this conversation with a job candidate for ${roleType} positions, extract and format the key information into professional resume bullet points.

Conversation:
${conversationSummary}

Please generate:
1. 3-5 strong resume bullet points in XYZ format (Accomplished X by implementing Y, resulting in Z)
2. A skills summary
3. Key achievements with quantifiable metrics

Focus on:
- Technical skills and technologies mentioned
- Project impact and scale
- Leadership and collaboration
- Problem-solving and innovation
- Quantifiable results and metrics

Format the response as JSON with this structure:
{
  "bullets": [
    {
      "text": "bullet point text",
      "category": "technical/leadership/achievement",
      "technologies": ["tech1", "tech2"],
      "impact": "quantified impact"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "achievements": ["achievement1", "achievement2"]
}`

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a sharp, human-sounding resume consultant and technical interviewer. Extract key information from conversations and format them into compelling, quantifiable, and concise resume content.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("OpenAI API error:", errorText)
        throw new Error(`OpenAI API failed: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error("No content received from OpenAI")
      }

      // Try to parse JSON response
      let parsedContent
      try {
        parsedContent = JSON.parse(content)
      } catch (parseError) {
        console.error("Failed to parse OpenAI response as JSON:", parseError)
        // Fallback: create basic structure
        parsedContent = {
          bullets: [
            {
              text: "Developed and implemented technical solutions using modern technologies",
              category: "technical",
              technologies: [],
              impact: "Improved system performance and user experience",
            },
          ],
          skills: ["Software Development", "Problem Solving", "Team Collaboration"],
          achievements: ["Successfully delivered technical projects"],
        }
      }

      return NextResponse.json({
        summary: parsedContent,
        success: true,
      })
    } catch (openaiError) {
      console.error("OpenAI error:", openaiError)

      // Provide fallback summary
      const fallbackSummary = {
        bullets: [
          {
            text: `Developed software solutions for ${roleType} role with focus on technical excellence`,
            category: "technical",
            technologies: ["JavaScript", "React", "Node.js"],
            impact: "Delivered high-quality software products",
          },
        ],
        skills: ["Software Development", "Problem Solving", "Team Collaboration"],
        achievements: ["Successfully completed technical projects"],
      }

      return NextResponse.json({
        summary: fallbackSummary,
        success: true,
        fallback: true,
      })
    }
  } catch (error) {
    console.error("Error generating resume summary:", error)

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
