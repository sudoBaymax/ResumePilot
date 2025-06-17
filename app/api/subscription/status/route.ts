import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserSubscription, getUserUsage, getActionLimit } from "@/lib/subscription";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get the user's JWT from the Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    // Use anon key to get the user from the JWT
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = user.id;

    // Get subscription and usage info
    const subscription = await getUserSubscription(userId);
    const usage = await getUserUsage(userId);
    let interviewLimit = null;
    let coverLetterLimit = null;
    if (subscription) {
      interviewLimit = await getActionLimit(subscription.plan_name, "interview");
      coverLetterLimit = await getActionLimit(subscription.plan_name, "cover_letter");
    }

    return NextResponse.json({
      subscription,
      usage,
      limits: {
        interviews: interviewLimit,
        cover_letters: coverLetterLimit,
      },
    });
  } catch (error) {
    console.error("Error in /api/subscription/status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 