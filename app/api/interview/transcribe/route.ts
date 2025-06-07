import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verify user with Supabase
    const supabaseUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const question = formData.get("question") as string
    const duration = formData.get("duration") as string

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    console.log("Processing audio file:", {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
    })

    // Validate file size (max 25MB for Whisper API)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file too large (max 25MB)" }, { status: 400 })
    }

    // Create FormData for Whisper API
    const whisperFormData = new FormData()
    whisperFormData.append("file", audioFile)
    whisperFormData.append("model", "whisper-1")
    whisperFormData.append("response_format", "json")
    whisperFormData.append("language", "en")

    console.log("Calling Whisper API...")

    // Call OpenAI Whisper API
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    })

    console.log("Whisper API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Whisper API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })

      return NextResponse.json(
        {
          error: "Transcription failed",
          details: `Whisper API returned ${response.status}: ${errorText}`,
        },
        { status: 500 },
      )
    }

    const result = await response.json()
    console.log("Whisper API result:", result)

    if (!result.text) {
      return NextResponse.json({ error: "No transcription text received" }, { status: 500 })
    }

    // Store transcript in Supabase
    try {
      const { data: transcriptData, error: transcriptError } = await supabaseAdmin
        .from("interview_transcripts")
        .insert({
          user_id: user.id,
          transcript: result.text,
          audio_duration: duration || null,
          question: question || null,
        })
        .select()
        .single()

      if (transcriptError) {
        console.error("Error storing transcript:", transcriptError)
        // Continue anyway, as we still want to return the transcript to the user
      }

      return NextResponse.json({
        transcript: result.text,
        transcript_id: transcriptData?.id || null,
      })
    } catch (dbError) {
      console.error("Database error:", dbError)
      // Still return the transcript even if DB storage fails
      return NextResponse.json({
        transcript: result.text,
        transcript_id: null,
      })
    }
  } catch (error) {
    console.error("Error in transcription:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
