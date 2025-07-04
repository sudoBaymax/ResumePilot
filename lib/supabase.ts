import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a singleton instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Types for our database tables
export interface WaitlistSubmission {
  id: string
  email: string
  role?: string
  referred_by?: string
  created_at: string
}

export interface Interview {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface InterviewQuestion {
  id: string
  interview_id: string
  question: string
  transcript?: string
  bullet_point_result?: string
  created_at: string
}

export interface Profile {
  id: string
  job_title?: string
  experience_level?: string
  resume_format?: string
  voice_settings?: any
  updated_at: string
}

// Helper function to create authenticated client (for API routes)
export function createAuthenticatedClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
    },
  })
}
