import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import { OpenAI } from "openai"

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Create Supabase admin client
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verify user with Supabase using the singleton client
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { transcript, question, role, experience, context } = await request.json()

    if (!transcript || !question) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Generating bullets for:", {
      transcriptLength: transcript.length,
      question: question.substring(0, 100) + "...",
      role,
    })

    // Get user profile for additional context
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching profile:", profileError)
    }

    // Construct the prompt for GPT-3.5 Turbo
    const prompt = constructPrompt(transcript, question, role, experience, context, profile)

    console.log("Calling OpenAI with prompt length:", prompt.length)

    // Call GPT-3.5 Turbo
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an AI resume coach. Given the following transcript from a voice interview and resume context, generate concise, impactful resume bullet points in XYZ format (Did X using Y resulting in Z). If data is insufficient, focus on what is available and make reasonable enhancements. Always return valid JSON.",
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
    console.log("OpenAI response:", responseContent)

    let bullets

    try {
      const parsedResponse = JSON.parse(responseContent || "{}")
      bullets = parsedResponse.bullets || []

      // Ensure bullets is an array
      if (!Array.isArray(bullets)) {
        bullets = []
      }
    } catch (error) {
      console.error("Error parsing GPT response:", error)
      console.error("Raw response:", responseContent)

      // Fallback: try to extract bullet points from the response
      bullets = [
        {
          text: "Generated bullet point from interview response",
          context: role || "Professional experience",
        },
      ]
    }

    console.log("Generated bullets:", bullets)

    // Store bullets in Supabase using admin client
    try {
      const { error: bulletsError } = await supabaseAdmin.from("resume_bullets").insert({
        user_id: user.id,
        question,
        transcript,
        bullets: bullets,
        role: role || null,
        experience: experience || null,
      })

      if (bulletsError) {
        console.error("Error storing bullets:", bulletsError)
        // Continue anyway, as we still want to return the bullets to the user
      }
    } catch (dbError) {
      console.error("Database error:", dbError)
      // Continue anyway
    }

    return NextResponse.json({ bullets })
  } catch (error) {
    console.error("Error generating bullets:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Helper function to construct the prompt
function constructPrompt(
  transcript: string,
  question: string,
  role?: string,
  experience?: string,
  context?: string,
  profile?: any,
) {
  let prompt = `Voice Transcript:
["Interviewer: ${question}"
"Candidate: ${transcript}"]

`

  if (role) {
    prompt += `Target Role: ${role}\n`
  }

  if (experience) {
    prompt += `Experience Level: ${experience}\n`
  }

  if (context) {
    prompt += `Resume Context: ["${context}"]\n`
  } else if (profile?.job_title) {
    prompt += `Resume Context: ["${profile.job_title}"]\n`
  }

  prompt += `
Generate 1-3 bullet points using XYZ format (Did X using Y resulting in Z).

XYZ Format Rules:
- X: Action verb (led, managed, built, optimized, launched, scaled, developed, automated, etc.)
- Y: Technology, method, team size, framework, specific action or innovation
- Z: Measurable metric (%, $, time saved, engagement, etc.). If not directly mentioned, use reasonable estimations with ~ symbol.

Focus on:
- Specific actions and technologies mentioned
- Quantifiable results and impact
- Professional language and strong action verbs
- Avoid generic statements

Return the response as a JSON object with this exact format:
{
  "bullets": [
    {
      "text": "Bullet point text in XYZ format",
      "context": "Role or project context"
    }
  ]
}
`

  return prompt
}
