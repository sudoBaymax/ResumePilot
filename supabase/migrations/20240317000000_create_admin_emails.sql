-- Create admin_emails table
CREATE TABLE IF NOT EXISTS admin_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert the initial admin email
INSERT INTO admin_emails (email) VALUES ('jatoujoseph@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Create RLS policies
ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON admin_emails
    FOR SELECT
    TO authenticated
    USING (true);

-- Only allow service role to insert/update/delete
CREATE POLICY "Only service role can modify admin emails" ON admin_emails
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true); 