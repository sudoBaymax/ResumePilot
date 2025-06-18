import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "confirmation"

  // This endpoint returns the HTML email template
  // Supabase can be configured to use this endpoint for custom email templates

  const getEmailTemplate = (type: string) => {
    const baseTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ResumePilot - ${type === "confirmation" ? "Verify Your Email" : "Welcome"}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .title {
            color: #1e293b;
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 10px 0;
          }
          .subtitle {
            color: #64748b;
            font-size: 16px;
            margin: 0;
          }
          .content {
            margin: 30px 0;
            text-align: center;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-1px);
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
          .features {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            text-align: center;
          }
          .feature {
            flex: 1;
            padding: 0 10px;
          }
          .feature-icon {
            width: 40px;
            height: 40px;
            background: #f1f5f9;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
            font-size: 20px;
          }
          @media (max-width: 600px) {
            .features {
              flex-direction: column;
            }
            .feature {
              margin-bottom: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">RP</div>
            <h1 class="title">${type === "confirmation" ? "Verify Your Email" : "Welcome to ResumePilot!"}</h1>
            <p class="subtitle">${type === "confirmation" ? "Click the button below to verify your email and start building amazing resumes" : "Your account has been created successfully"}</p>
          </div>
          
          <div class="content">
            ${
              type === "confirmation"
                ? `
              <p>Thanks for signing up for ResumePilot! We're excited to help you create ATS-optimized resumes using AI and voice interviews.</p>
              <a href="{{ .ConfirmationURL }}" class="button">Verify Email Address</a>
              <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            `
                : `
              <p>Welcome to ResumePilot! Your email has been verified and your account is ready to use.</p>
              <a href="https://resumepilot.ca/dashboard" class="button">Get Started</a>
            `
            }
          </div>
          
          <div class="features">
            <div class="feature">
              <div class="feature-icon">🎤</div>
              <h3 style="margin: 0 0 5px 0; font-size: 16px;">Voice Interviews</h3>
              <p style="margin: 0; font-size: 14px; color: #64748b;">Practice with AI-powered interviews</p>
            </div>
            <div class="feature">
              <div class="feature-icon">🤖</div>
              <h3 style="margin: 0 0 5px 0; font-size: 16px;">AI-Optimized</h3>
              <p style="margin: 0; font-size: 14px; color: #64748b;">ATS-friendly resume generation</p>
            </div>
            <div class="feature">
              <div class="feature-icon">⭐</div>
              <h3 style="margin: 0 0 5px 0; font-size: 16px;">STAR Format</h3>
              <p style="margin: 0; font-size: 14px; color: #64748b;">Professional bullet points</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>ResumePilot</strong> - AI-Powered Resume Builder</p>
            <p>Visit us at <a href="https://resumepilot.ca" style="color: #3b82f6;">resumepilot.ca</a></p>
            <p style="font-size: 12px; margin-top: 20px;">
              If you have any questions, contact us at <a href="mailto:support@resumepilot.ca" style="color: #3b82f6;">support@resumepilot.ca</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return baseTemplate
  }

  const template = getEmailTemplate(type)

  return new NextResponse(template, {
    headers: {
      "Content-Type": "text/html",
    },
  })
}
