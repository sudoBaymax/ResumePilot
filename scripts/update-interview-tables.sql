-- Update interview_transcripts table structure
ALTER TABLE interview_transcripts 
ADD COLUMN IF NOT EXISTS conversation_id UUID,
ADD COLUMN IF NOT EXISTS turn_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS response_type TEXT DEFAULT 'answer';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_user_conversation 
ON interview_transcripts(user_id, conversation_id);

-- Create conversation_sessions table to track full conversations
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_text TEXT,
  resume_filename TEXT,
  role_type TEXT,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_turns INTEGER DEFAULT 0,
  generated_bullets JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own conversation sessions" ON conversation_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation sessions" ON conversation_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation sessions" ON conversation_sessions
  FOR UPDATE USING (auth.uid() = user_id);
