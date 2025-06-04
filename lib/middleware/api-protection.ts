import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkSubscriptionAccess } from "./subscription-guard"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function withSubscriptionCheck(
  request: NextRequest,
  action: "interview" | "cover_letter" | "template_access" | "export_pdf",
  handler: (request: NextRequest, userId: string) => Promise<Response>,
): Promise<Response> {
  try {
    // Get user from request (you might need to adjust this based on your auth setup)
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Extract user ID from auth header or session
    // This is a simplified example - adjust based on your auth implementation
    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Check subscription access
    const accessResult = await checkSubscriptionAccess(user.id, action)

    if (!accessResult.allowed) {
      return new Response(
        JSON.stringify({
          error: accessResult.reason || "Access denied",
          upgradeRequired: accessResult.upgradeRequired,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Call the actual handler
    return await handler(request, user.id)
  } catch (error) {
    console.error("Error in subscription middleware:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
