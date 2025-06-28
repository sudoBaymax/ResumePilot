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
    const {
      messages = [],
      userMessage = "",
      resumeText = "",
      roleType = "Software Engineer",
      overleafTemplate = "",
    } = body

    console.log("Chatbot request:", {
      userId: user.id,
      messageCount: messages.length,
      userMessage: userMessage.substring(0, 100),
      roleType,
    })

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured")
      return NextResponse.json(
        {
          message:
            "I'm having trouble connecting to my AI systems right now. Let me ask you a basic question instead: What's your current role or the position you're targeting?",
          shouldEnd: false,
        },
        { status: 200 },
      )
    }

    try {
      // Build conversation history for OpenAI
      const openaiMessages = []

      // System prompt
      const systemPrompt = `You are a sharp, human-sounding resume consultant and technical interviewer. You've read the user's resume and conversation history. Your job is to lead the resume upgrade process with focused, concise questions and high-impact suggestions.

Role Context: The user is targeting ${roleType} positions.
${resumeText ? `Resume Context: The user has provided this resume text: ${resumeText.substring(0, 500)}...` : ""}
${overleafTemplate ? `Template Context: We'll be using this Overleaf template: ${overleafTemplate}` : ""}

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

- Keep individual bullets short and concise.`

      openaiMessages.push({
        role: "system",
        content: systemPrompt,
      })

      // Add conversation history
      for (const msg of messages) {
        openaiMessages.push({
          role: msg.speaker === "user" ? "user" : "assistant",
          content: msg.message,
        })
      }

      // Add current user message if provided
      if (userMessage) {
        openaiMessages.push({
          role: "user",
          content: userMessage,
        })
      }

      console.log("Calling OpenAI with", openaiMessages.length, "messages")

      // Call OpenAI API
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          max_tokens: 300,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        }),
      })

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        console.error("OpenAI API error:", {
          status: openaiResponse.status,
          error: errorText,
        })
        throw new Error(`OpenAI API failed: ${openaiResponse.status}`)
      }

      const openaiData = await openaiResponse.json()
      console.log("OpenAI response received")

      const aiMessage = openaiData.choices?.[0]?.message?.content

      if (!aiMessage) {
        throw new Error("No response from OpenAI")
      }

      // Determine if conversation should end (after 8-10 exchanges or if AI suggests it)
      const shouldEnd =
        messages.length >= 16 ||
        aiMessage.toLowerCase().includes("let's wrap up") ||
        aiMessage.toLowerCase().includes("ready to build")

      return NextResponse.json({
        message: aiMessage.trim(),
        shouldEnd,
        success: true,
      })
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError)

      // Provide intelligent fallback based on conversation context
      let fallbackMessage =
        "That's great! Can you tell me more about the specific technologies you used and the impact of your work?"

      if (messages.length === 0) {
        fallbackMessage = `Hi! I'm your AI resume consultant specializing in ${roleType} roles. I'm here to help you create an outstanding resume that will catch recruiters' attention. Let's start by learning about your background - what's your current role or the position you're targeting?`
      } else if (userMessage.toLowerCase().includes("project")) {
        fallbackMessage =
          "That sounds like an interesting project! Can you tell me about the scale of this project - how many users did it serve, what technologies did you use, and what was your specific role?"
      } else if (userMessage.toLowerCase().includes("team")) {
        fallbackMessage =
          "Team collaboration is valuable! How big was the team, what was your specific role, and can you share any leadership or mentoring experiences you had?"
      } else if (userMessage.toLowerCase().includes("improve") || userMessage.toLowerCase().includes("optimize")) {
        fallbackMessage =
          "Improvements and optimizations are great resume material! Can you quantify the impact - what specific metrics improved and by how much?"
      }

      return NextResponse.json({
        message: fallbackMessage,
        shouldEnd: false,
        success: true,
      })
    }
  } catch (error) {
    console.error("Error in chatbot API:", error)

    return NextResponse.json(
      {
        message:
          "I'm having some technical difficulties. Let me ask you this: What's the most impactful project you've worked on recently?",
        shouldEnd: false,
        success: false,
      },
      { status: 200 },
    )
  }
}
