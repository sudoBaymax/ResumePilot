# ResumePilot

A comprehensive AI-powered resume builder and interview preparation platform that helps users create professional, ATS-optimized resumes through conversational AI interactions.

## 🚀 Features

### Core Features
- **AI-Powered Resume Generation**: Create professional resumes through natural conversation
- **Multiple Interview Modes**: Voice, chat, and resume analysis
- **XYZ-Format Bullet Points**: Generate compelling, quantified achievements
- **Multiple Download Formats**: LaTeX, PDF, Word, and Overleaf integration
- **ATS-Optimized Templates**: Professional templates designed to pass Applicant Tracking Systems
- **Subscription Management**: Tiered pricing with usage tracking
- **Admin Dashboard**: Unlimited access for administrators

### Interview Modes
1. **Voice Interview**: Real-time voice recording and transcription
2. **Chat Interview**: Text-based conversation with AI
3. **Resume Analyzer**: Ask specific questions about your resume

### Resume Templates
- **Jake's Resume**: Clean, ATS-friendly template for software engineers
- **Modern Tech**: Contemporary design with subtle tech elements
- **Classic Professional**: Traditional layout for corporate environments
- **Minimalist Modern**: Clean lines with plenty of white space
- **Academic Research**: Perfect for PhD candidates and research positions
- **Startup Focused**: Dynamic template for fast-paced environments
- **Senior Executive**: Sophisticated design for leadership roles
- **Graduate Student**: Ideal for recent graduates and entry-level positions

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **AI**: OpenAI GPT-4o-mini
- **File Processing**: LaTeX compilation, HTML generation

### Project Structure
```
resumepilot.ca/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── admin/               # Admin endpoints
│   │   ├── auth/                # Authentication
│   │   ├── interview/           # Interview and resume generation
│   │   ├── stripe/              # Payment processing
│   │   └── subscription/        # Subscription management
│   ├── auth/                    # Auth pages
│   ├── dashboard/               # User dashboard
│   ├── pricing/                 # Pricing page
│   └── resume-builder/          # Resume builder pages
├── components/                   # React components
│   ├── admin/                   # Admin dashboard components
│   ├── auth/                    # Authentication components
│   ├── interview/               # Interview components
│   ├── subscription/            # Subscription components
│   └── ui/                      # Reusable UI components
├── lib/                         # Utility libraries
├── hooks/                       # Custom React hooks
├── styles/                      # Global styles
└── public/                      # Static assets
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Supabase account
- OpenAI API key
- Stripe account

### Environment Variables
Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Email (optional)
RESEND_API_KEY=your_resend_api_key
```

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd resumepilot.ca
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up the database**
   ```bash
   # Run the database migration scripts in scripts/
   # These will create the necessary tables and indexes
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` (or the port shown in the terminal)

## 📊 Database Schema

### Core Tables

#### `profiles`
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to auth.users)
- `full_name`: TEXT
- `job_title`: TEXT
- `company`: TEXT
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

#### `subscriptions`
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to auth.users)
- `stripe_customer_id`: TEXT
- `stripe_subscription_id`: TEXT
- `plan_name`: TEXT (starter, pro, career, coach)
- `status`: TEXT (active, canceled, past_due)
- `current_period_start`: TIMESTAMP
- `current_period_end`: TIMESTAMP
- `cancel_at_period_end`: BOOLEAN

#### `usage_tracking`
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to auth.users)
- `month`: TEXT (YYYY-MM format)
- `interviews_used`: INTEGER
- `cover_letters_used`: INTEGER
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

#### `resume_bullets`
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to auth.users)
- `question`: TEXT
- `transcript`: TEXT
- `bullets`: JSONB
- `role`: TEXT
- `experience`: TEXT
- `created_at`: TIMESTAMP

## 🔧 API Documentation

### Authentication Endpoints

#### `POST /api/auth/email-template`
Sends email templates for authentication.

### Interview Endpoints

#### `POST /api/interview/chat`
Handles chat-based interviews with AI.
```json
{
  "userMessage": "string",
  "resumeText": "string (optional)",
  "conversation": "array (optional)"
}
```

#### `POST /api/interview/transcribe`
Transcribes audio files to text.
```json
{
  "audio": "FormData with audio file"
}
```

#### `POST /api/interview/generate-bullets`
Generates XYZ-format bullet points from interview responses.
```json
{
  "transcript": "string",
  "question": "string",
  "role": "string (optional)",
  "experience": "string (optional)",
  "context": "string (optional)"
}
```

#### `POST /api/interview/generate-resume`
Generates complete resumes from conversation data.
```json
{
  "conversation": "array",
  "resumeText": "string (optional)",
  "roleType": "string",
  "templateName": "string",
  "userInfo": "object (optional)"
}
```

#### `POST /api/interview/generate-pdf`
Compiles LaTeX to PDF.
```json
{
  "latexContent": "string",
  "filename": "string"
}
```

#### `POST /api/interview/generate-word`
Creates Word documents from resume data.
```json
{
  "resumeData": "object",
  "filename": "string"
}
```

#### `POST /api/interview/analyze-resume`
Analyzes resumes and answers specific questions.
```json
{
  "resumeText": "string",
  "question": "string"
}
```

### Subscription Endpoints

#### `POST /api/subscription/check-access`
Checks user's subscription status and usage limits.

#### `POST /api/subscription/start-action`
Records usage when users start actions.

### Stripe Endpoints

#### `POST /api/stripe/create-checkout`
Creates Stripe checkout sessions.

#### `POST /api/stripe/create-portal`
Creates Stripe customer portal sessions.

#### `POST /api/stripe/webhooks`
Handles Stripe webhook events.

### Admin Endpoints

#### `GET /api/admin/stats`
Retrieves admin dashboard statistics.

## 💳 Subscription Plans

### Starter Plan
- **Price**: $9 (one-time)
- **Features**: 1 interview, basic templates
- **Best for**: First-time users

### Pro Plan
- **Price**: $39/month
- **Features**: 10 interviews/month, all templates
- **Best for**: Active job seekers

### Career+ Plan
- **Price**: $59/month
- **Features**: 30 interviews/month, 3 cover letters/month
- **Best for**: Serious career advancement

### Coach/Agency Plan
- **Price**: $129/month
- **Features**: Unlimited everything, team features
- **Best for**: Career coaches and agencies

### Admin Access
- **Price**: Free
- **Features**: Unlimited access to all features
- **Access**: Specific admin emails configured in the system

## 🎯 Usage Workflow

### 1. User Registration
- Users sign up with email/password
- Profile information is collected
- Subscription plan is selected

### 2. Resume Upload
- Users upload existing resume (optional)
- System extracts key information
- Provides context for AI interactions

### 3. Interview Process
- Choose interview mode (voice, chat, or resume analysis)
- Engage in conversation with AI
- System collects context and generates bullet points
- Conversation ends when sufficient context is gathered

### 4. Resume Generation
- AI processes conversation data
- Generates structured resume information
- Applies XYZ-format bullet points
- Creates professional LaTeX template

### 5. Download Options
- **LaTeX**: Source code for editing
- **PDF**: Direct download (requires LaTeX compilation)
- **Word**: HTML format that opens in Word
- **Overleaf**: Opens in online LaTeX editor

## 🔒 Security Features

### Authentication
- Supabase Auth integration
- JWT token validation
- Session management

### API Protection
- Authentication middleware on all endpoints
- Rate limiting (implemented in production)
- Input validation and sanitization

### Data Privacy
- User data encrypted at rest
- GDPR compliance considerations
- Secure payment processing via Stripe

## 🚀 Deployment

### Vercel Deployment
1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Setup
- Production environment variables
- Database connection strings
- API key management

### Monitoring
- Vercel Analytics
- Error tracking (implemented in production)
- Performance monitoring

## 🧪 Testing

### Manual Testing
- Test all interview modes
- Verify subscription flows
- Check download functionality
- Validate admin features

### Automated Testing
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows

## 📈 Performance Optimizations

### Frontend
- Code splitting and lazy loading
- Image optimization
- Caching strategies

### Backend
- Database query optimization
- API response caching
- Efficient LaTeX processing

## 🔧 Development Guidelines

### Code Style
- TypeScript for type safety
- ESLint and Prettier for formatting
- Consistent naming conventions

### Git Workflow
- Feature branches for development
- Pull requests for code review
- Semantic commit messages

### Documentation
- Inline code comments
- API documentation
- Component documentation

## 🐛 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# If port 3000 is in use
npm run dev -- -p 3001
```

#### Database Connection Issues
- Check Supabase credentials
- Verify network connectivity
- Check database migration status

#### LaTeX Compilation Errors
- Verify template syntax
- Check for special character escaping
- Use Overleaf as fallback

#### Payment Issues
- Verify Stripe configuration
- Check webhook endpoints
- Validate subscription status

## 📞 Support

### Getting Help
- Check this documentation first
- Review GitHub issues
- Contact support team

### Contributing
- Fork the repository
- Create feature branch
- Submit pull request
- Follow coding standards

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Supabase for backend services
- Stripe for payment processing
- shadcn/ui for component library
- Next.js team for the framework

---

**ResumePilot** - Building better resumes through AI-powered conversations.
