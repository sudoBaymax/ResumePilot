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
      const systemPrompt = `You are an expert tech recruiter and resume consultant. Your job is to help users create outstanding resumes by gathering detailed information about their experience, skills, and achievements.

Role Context: The user is targeting ${roleType} positions.
${resumeText ? `Resume Context: The user has provided this resume text: ${resumeText.substring(0, 500)}...` : ""}
${overleafTemplate ? `Template Context: We'll be using this Overleaf template: ${overleafTemplate}` : ""}

Your conversation style should be:
- Professional but friendly and encouraging
- Ask specific, targeted questions that help quantify achievements
- Focus on technical skills, project impact, and measurable results
- Provide helpful resume tips and industry insights when relevant
- Ask follow-up questions based on user responses
- Help identify transferable skills and highlight accomplishments

Guidelines:
- Ask about specific technologies, frameworks, and tools used
- Inquire about project scale (users, data volume, team size, etc.)
- Focus on quantifiable impact and results
- Ask about challenges overcome and solutions implemented
- Encourage the user to think about leadership and collaboration experiences
- Provide relevant tips for tech resumes when appropriate

Keep responses conversational and under 150 words. Ask one focused question at a time.`

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
