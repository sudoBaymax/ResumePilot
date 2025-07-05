import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId && !email) {
      return NextResponse.json({ error: "User ID or email required" }, { status: 400 })
    }

    let targetUserId = userId

    if (!targetUserId && email) {
      // Get user ID from email first
      const { data: userData, error: userError } = await supabaseAdmin
        .from("auth.users")
        .select("id")
        .eq("email", email)
        .single()

      if (userError || !userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      targetUserId = userData.id
    }

    const currentMonth = new Date().toISOString().slice(0, 7)

    // Check if usage record already exists
    const { data: existingUsage, error: checkError } = await supabaseAdmin
      .from("usage_tracking")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("month_year", currentMonth)
      .single()

    let result
    if (existingUsage) {
      // Update existing record
      const { data: updatedUsage, error: updateError } = await supabaseAdmin
        .from("usage_tracking")
        .update({
          interviews_used: 0,
          cover_letters_used: 0,
          resume_credits_remaining: 1, // Reset to 1 for Starter plan
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId)
        .eq("month_year", currentMonth)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating usage:", updateError)
        return NextResponse.json({ error: "Failed to reset usage" }, { status: 500 })
      }

      result = updatedUsage
    } else {
      // Create new record
      const { data: newUsage, error: insertError } = await supabaseAdmin
        .from("usage_tracking")
        .insert({
          user_id: targetUserId,
          month_year: currentMonth,
          interviews_used: 0,
          cover_letters_used: 0,
          resume_credits_remaining: 1, // Reset to 1 for Starter plan
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error creating usage:", insertError)
        return NextResponse.json({ error: "Failed to reset usage" }, { status: 500 })
      }

      result = newUsage
    }

    return NextResponse.json({
      message: "Usage reset successfully",
      userInfo: {
        userId: targetUserId,
        email: email || null
      },
      resetData: {
        month_year: currentMonth,
        interviews_used: 0,
        cover_letters_used: 0,
        resume_credits_remaining: 1
      },
      result
    })

  } catch (error) {
    console.error("Error in reset usage endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 