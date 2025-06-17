import { supabase } from "./supabase"

export async function isAdmin(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("admin_emails")
      .select("email")
      .eq("email", email.toLowerCase())
      .single()

    if (error) {
      console.error("Error checking admin status:", error)
      return false
    }

    return !!data
  } catch (error) {
    console.error("Error in isAdmin check:", error)
    return false
  }
} 