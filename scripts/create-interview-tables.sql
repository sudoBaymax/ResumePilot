-- Create interview_transcripts table if it doesn't exist
CREATE TABLE IF NOT EXISTS interview_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  audio_duration TEXT,
  question TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resume_bullets table if it doesn't exist
CREATE TABLE IF NOT EXISTS resume_bullets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT,
  transcript TEXT,
  bullets JSONB NOT NULL,
  role TEXT,
  experience TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_user_id ON interview_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_bullets_user_id ON resume_bullets(user_id);

-- Add RLS policies for interview_transcripts
ALTER TABLE interview_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY interview_transcripts_select_policy
  ON interview_transcripts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY interview_transcripts_insert_policy
  ON interview_transcripts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for resume_bullets
ALTER TABLE resume_bullets ENABLE ROW LEVEL SECURITY;

CREATE POLICY resume_bullets_select_policy
  ON resume_bullets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY resume_bullets_insert_policy
  ON resume_bullets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
