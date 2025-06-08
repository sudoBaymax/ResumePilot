import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    persistSession: false,
  },
})

export async function GET() {
  try {
    console.log("Checking database setup...")

    // Check if interview_transcripts table exists
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "interview_transcripts")

    if (tablesError) {
      console.error("Error checking tables:", tablesError)
      return NextResponse.json({
        success: false,
        error: "Could not check database tables",
        details: tablesError.message,
      })
    }

    const tableExists = tables && tables.length > 0

    // If table exists, check its structure
    let columns = null
    if (tableExists) {
      const { data: columnsData, error: columnsError } = await supabaseAdmin
        .from("information_schema.columns")
        .select("column_name, data_type, is_nullable")
        .eq("table_schema", "public")
        .eq("table_name", "interview_transcripts")

      if (columnsError) {
        console.error("Error checking columns:", columnsError)
      } else {
        columns = columnsData
      }
    }

    // Test a simple insert/delete if table exists
    let insertTest = null
    if (tableExists) {
      try {
        const testData = {
          user_id: "00000000-0000-0000-0000-000000000000", // Dummy UUID
          transcript: "Test transcript",
          conversation_id: "test-conversation",
          turn_number: 1,
          response_type: "test",
        }

        const { data: insertData, error: insertError } = await supabaseAdmin
          .from("interview_transcripts")
          .insert(testData)
          .select()
          .single()

        if (insertError) {
          insertTest = { success: false, error: insertError.message }
        } else {
          // Clean up test data
          await supabaseAdmin.from("interview_transcripts").delete().eq("id", insertData.id)
          insertTest = { success: true }
        }
      } catch (testError) {
        insertTest = {
          success: false,
          error: testError instanceof Error ? testError.message : "Unknown error",
        }
      }
    }

    return NextResponse.json({
      success: true,
      database: {
        tableExists,
        columns,
        insertTest,
      },
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    })
  } catch (error) {
    console.error("Database check error:", error)
    return NextResponse.json({
      success: false,
      error: "Database check failed",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
