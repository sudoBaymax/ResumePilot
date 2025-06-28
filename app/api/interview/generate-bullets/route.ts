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

    // Construct the enhanced prompt for GPT-4o-mini
    const prompt = constructEnhancedPrompt(transcript, question, role, experience, context, profile)

    console.log("Calling OpenAI GPT-4o-mini with prompt length:", prompt.length)

    // Call GPT-4o-mini with enhanced parameters
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a sharp, human-sounding resume coach specializing in software engineering careers. You excel at transforming interview responses into compelling, ATS-optimized resume bullet points. Focus on quantifiable, actionable, and concise advice, using XYZ and STAR formats.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, professional output
      max_tokens: 800, // Increased token limit for more detailed responses
      response_format: { type: "json_object" },
    })

    const responseContent = completion.choices[0].message.content
    console.log("OpenAI GPT-4o-mini response:", responseContent)

    let bullets

    try {
      const parsedResponse = JSON.parse(responseContent || "{}")
      bullets = parsedResponse.bullets || []

      // Ensure bullets is an array and validate structure
      if (!Array.isArray(bullets)) {
        bullets = []
      }

      // Validate and enhance bullet structure
      bullets = bullets.map((bullet: any, index: number) => ({
        text: bullet.text || `Professional achievement from interview response ${index + 1}`,
        context: bullet.context || role || "Professional experience",
        format: bullet.format || "XYZ",
        impact_level: bullet.impact_level || "medium",
        technologies: bullet.technologies || [],
      }))
    } catch (error) {
      console.error("Error parsing GPT-4o-mini response:", error)
      console.error("Raw response:", responseContent)

      // Enhanced fallback with better structure
      bullets = [
        {
          text: "Led technical initiative resulting in improved system performance and user experience",
          context: role || "Software Engineering",
          format: "XYZ",
          impact_level: "medium",
          technologies: [],
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

// Enhanced prompt construction for GPT-4o-mini
function constructEnhancedPrompt(
  transcript: string,
  question: string,
  role?: string,
  experience?: string,
  context?: string,
  profile?: any,
) {
  let prompt = `## Interview Analysis Task

**Interview Question:** "${question}"

**Candidate Response:** "${transcript}"

## Context Information
`

  if (role) {
    prompt += `- **Target Role:** ${role}\n`
  }

  if (experience) {
    prompt += `- **Experience Level:** ${experience}\n`
  }

  if (context) {
    prompt += `- **Additional Context:** ${context}\n`
  } else if (profile?.job_title) {
    prompt += `- **Current Role:** ${profile.job_title}\n`
  }

  prompt += `
## Task Requirements

Generate 3-4 professional, sharp, and quantifiable resume bullet points from this interview response. Focus on quality over quantity - stop when you have 3-4 strong, impactful bullets.

### Format Options:
1. **XYZ Format:** "Accomplished [X] as measured by [Y] by doing [Z]"
2. **STAR Format:** Focus on Situation, Task, Action, Result when storytelling is important

### Quality Standards:
- **Action Verbs:** Use strong verbs (led, developed, optimized, implemented, architected, scaled, etc.)
- **Quantification:** Include or reasonably estimate metrics (%, $, time, scale, users, etc.)
- **Technical Depth:** Highlight specific technologies, frameworks, methodologies mentioned
- **Business Impact:** Connect technical work to business outcomes when possible
- **ATS Optimization:** Use industry-standard keywords and formatting

### Enhancement Guidelines:
- If exact numbers aren't provided, make reasonable estimates with "~" prefix
- Extract implicit achievements from the response
- Identify leadership, collaboration, or problem-solving elements
- Highlight any innovation, efficiency gains, or process improvements
- **IMPORTANT:** Stop after 3-4 high-quality bullets - don't force additional weak ones

## Output Format

Return a JSON object with this exact structure:

\`