# ResumePilot API Documentation

## Overview

The ResumePilot API is built using Next.js API routes and provides endpoints for user authentication, interview processing, resume generation, subscription management, and payment processing.

## Authentication

All API endpoints require authentication via Supabase JWT tokens passed in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Endpoints

### Authentication

#### `POST /api/auth/email-template`

Sends email templates for authentication purposes.

**Request Body:**
```json
{
  "email": "user@example.com",
  "template": "welcome" | "reset-password" | "verification"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

### Interview & Resume Generation

#### `POST /api/interview/chat`

Handles chat-based interviews with AI. Provides personalized responses based on resume content and conversation history.

**Request Body:**
```json
{
  "userMessage": "string",
  "resumeText": "string (optional)",
  "conversation": [
    {
      "speaker": "user" | "ai",
      "message": "string",
      "timestamp": "number"
    }
  ]
}
```

**Response:**
```json
{
  "message": "AI response message",
  "shouldEnd": "boolean",
  "bullets": []
}
```

#### `POST /api/interview/transcribe`

Transcribes audio files to text for voice-based interviews.

**Request Body:**
```
FormData with audio file
```

**Response:**
```json
{
  "text": "transcribed text",
  "confidence": "number"
}
```

#### `POST /api/interview/generate-bullets`

Generates XYZ-format bullet points from interview responses.

**Request Body:**
```json
{
  "transcript": "string",
  "question": "string",
  "role": "string (optional)",
  "experience": "string (optional)",
  "context": "string (optional)"
}
```

**Response:**
```json
{
  "bullets": [
    {
      "text": "string",
      "context": "string",
      "format": "XYZ" | "STAR",
      "impact_level": "high" | "medium" | "low",
      "technologies": ["string"]
    }
  ]
}
```

#### `POST /api/interview/generate-resume`

Generates complete resumes from conversation data and existing resume content.

**Request Body:**
```json
{
  "conversation": [
    {
      "speaker": "user" | "ai",
      "message": "string",
      "timestamp": "number"
    }
  ],
  "resumeText": "string (optional)",
  "roleType": "string",
  "templateName": "string",
  "userInfo": {
    "name": "string",
    "email": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string",
    "github": "string",
    "location": "string",
    "roleType": "string",
    "education": [...],
    "experience": [...],
    "projects": [...],
    "skills": {...}
  },
  "template": "string (LaTeX content)",
  "downloads": {
    "latex": "string",
    "filename": "string",
    "templateName": "string",
    "availableFormats": {...}
  }
}
```

#### `POST /api/interview/generate-pdf`

Compiles LaTeX content to PDF format.

**Request Body:**
```json
{
  "latexContent": "string",
  "filename": "string"
}
```

**Response:**
```json
{
  "success": true,
  "pdfUrl": "string (blob URL)",
  "filename": "string"
}
```

#### `POST /api/interview/generate-word`

Creates Word documents from resume data.

**Request Body:**
```json
{
  "resumeData": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string",
    "github": "string",
    "location": "string",
    "roleType": "string",
    "education": [...],
    "experience": [...],
    "projects": [...],
    "skills": {...}
  },
  "filename": "string"
}
```

**Response:**
```json
{
  "success": true,
  "wordUrl": "string (blob URL)",
  "filename": "string"
}
```

#### `POST /api/interview/analyze-resume`

Analyzes resumes and answers specific questions about content.

**Request Body:**
```json
{
  "resumeText": "string",
  "question": "string"
}
```

**Response:**
```json
{
  "answer": "string",
  "confidence": "number",
  "suggestions": ["string"]
}
```

### Subscription Management

#### `POST /api/subscription/check-access`

Checks user's subscription status and usage limits.

**Request Body:**
```json
{
  "action": "interview" | "cover_letter" | "template"
}
```

**Response:**
```json
{
  "hasAccess": true,
  "plan": {
    "name": "string",
    "limits": {
      "interviews": "number",
      "coverLetters": "number"
    },
    "usage": {
      "interviews": "number",
      "coverLetters": "number"
    }
  },
  "isAdmin": false
}
```

#### `POST /api/subscription/start-action`

Records usage when users start actions.

**Request Body:**
```json
{
  "action": "interview" | "cover_letter"
}
```

**Response:**
```json
{
  "success": true,
  "remaining": {
    "interviews": "number",
    "coverLetters": "number"
  }
}
```

#### `POST /api/subscription/fix-subscription`

Fixes subscription data inconsistencies.

**Request Body:**
```json
{
  "userId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription fixed successfully"
}
```

### Payment Processing (Stripe)

#### `POST /api/stripe/create-checkout`

Creates Stripe checkout sessions for subscription purchases.

**Request Body:**
```json
{
  "planKey": "starter" | "pro" | "career" | "coach",
  "userId": "string",
  "billingCycle": "monthly" | "yearly"
}
```

**Response:**
```json
{
  "sessionId": "string",
  "url": "string"
}
```

#### `POST /api/stripe/create-portal`

Creates Stripe customer portal sessions for subscription management.

**Request Body:**
```json
{
  "userId": "string"
}
```

**Response:**
```json
{
  "url": "string"
}
```

#### `POST /api/stripe/webhooks`

Handles Stripe webhook events for subscription updates.

**Request Body:**
```
Raw webhook payload from Stripe
```

**Response:**
```json
{
  "received": true
}
```

### Admin Endpoints

#### `GET /api/admin/stats`

Retrieves admin dashboard statistics.

**Response:**
```json
{
  "totalUsers": "number",
  "activeSubscriptions": "number",
  "revenue": {
    "monthly": "number",
    "total": "number"
  },
  "usage": {
    "interviews": "number",
    "coverLetters": "number"
  },
  "topPlans": [
    {
      "plan": "string",
      "count": "number"
    }
  ]
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error title",
  "message": "Detailed error message",
  "status": "number (optional)"
}
```

### Common HTTP Status Codes

- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limiting)
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Interview endpoints**: 10 requests per minute
- **Resume generation**: 5 requests per minute
- **Admin endpoints**: 20 requests per minute

## Webhooks

### Stripe Webhooks

The application handles the following Stripe webhook events:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Webhook Verification

All webhooks are verified using the `STRIPE_WEBHOOK_SECRET` environment variable.

## Testing

### Test Data

Use the following test data for development:

```json
{
  "testUser": {
    "email": "test@example.com",
    "password": "testpassword123"
  },
  "testResume": "Software Engineer with 5 years of experience...",
  "testConversation": [
    {
      "speaker": "user",
      "message": "I worked on a React application that improved user engagement by 40%",
      "timestamp": 1640995200000
    }
  ]
}
```

### Postman Collection

A Postman collection is available for testing all API endpoints. Import the collection file to get started with API testing.

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Input Validation**: All inputs are validated and sanitized
3. **Rate Limiting**: Prevents abuse and ensures fair usage
4. **CORS**: Configured for specific origins
5. **HTTPS**: Required in production

## Monitoring

API endpoints are monitored for:

- Response times
- Error rates
- Usage patterns
- Security events

Logs are available in the application dashboard for debugging and monitoring. 