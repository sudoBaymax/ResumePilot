# Email Configuration for ResumePilot

## Supabase Email Template Setup

To use custom branded email templates with ResumePilot, follow these steps:

### 1. Configure Site URL in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Settings
3. Set the Site URL to: `https://resumepilot.ca`
4. Add redirect URLs:
   - `https://resumepilot.ca/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

### 2. Custom Email Templates

In your Supabase dashboard, go to Authentication > Email Templates and update:

#### Confirm Signup Template:
- **Subject**: `Verify your ResumePilot account`
- **Body**: Use the HTML from `/api/auth/email-template?type=confirmation`

#### Magic Link Template:
- **Subject**: `Your ResumePilot login link`
- **Body**: Use the HTML from `/api/auth/email-template?type=magic-link`

### 3. SMTP Configuration (Optional)

For better email deliverability, configure custom SMTP:

1. Go to Authentication > Settings > SMTP Settings
2. Configure with your preferred email service (SendGrid, Mailgun, etc.)
3. Use `noreply@resumepilot.ca` as the sender email

### 4. Environment Variables

Ensure these are set in your production environment:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=https://resumepilot.ca
\`\`\`

### 5. Testing

1. Test email verification in development with localhost
2. Test in production with resumepilot.ca
3. Verify redirect URLs work correctly
4. Check email templates render properly

## Features of Custom Email Template

- ✅ ResumePilot branding and colors
- ✅ Responsive design for mobile/desktop
- ✅ Professional styling with gradients
- ✅ Feature highlights (Voice, AI, STAR format)
- ✅ Clear call-to-action buttons
- ✅ Contact information and support links
- ✅ Proper fallbacks for email clients
