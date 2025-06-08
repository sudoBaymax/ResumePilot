-- Create interview_transcripts table if it doesn't exist
CREATE TABLE IF NOT EXISTS interview_transcripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    audio_duration INTEGER,
    question TEXT,
    conversation_id TEXT,
    turn_number INTEGER DEFAULT 1,
    response_type TEXT DEFAULT 'answer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_user_id ON interview_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_conversation_id ON interview_transcripts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_created_at ON interview_transcripts(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE interview_transcripts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own transcripts" ON interview_transcripts;
CREATE POLICY "Users can view their own transcripts" ON interview_transcripts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transcripts" ON interview_transcripts;
CREATE POLICY "Users can insert their own transcripts" ON interview_transcripts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all transcripts" ON interview_transcripts;
CREATE POLICY "Service role can manage all transcripts" ON interview_transcripts
    FOR ALL USING (auth.role() = 'service_role');
