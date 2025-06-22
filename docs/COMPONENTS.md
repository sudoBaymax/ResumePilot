# ResumePilot Components Documentation

## Overview

This document provides detailed information about all React components used in the ResumePilot application, including their props, functionality, and usage examples.

## Component Architecture

The application uses a modular component architecture with:
- **UI Components**: Reusable, styled components from shadcn/ui
- **Feature Components**: Business logic components for specific features
- **Layout Components**: Page structure and navigation components
- **Provider Components**: Context providers for state management

## UI Components (`components/ui/`)

### Button
Styled button component with multiple variants.

```tsx
import { Button } from "@/components/ui/button"

<Button variant="default" size="sm" onClick={handleClick}>
  Click me
</Button>
```

**Props:**
- `variant`: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
- `size`: "default" | "sm" | "lg" | "icon"
- `disabled`: boolean
- `onClick`: function

### Card
Container component for content sections.

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

### Alert
Alert component for displaying messages.

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert"

<Alert>
  <AlertDescription>This is an alert message</AlertDescription>
</Alert>
```

### Progress
Progress bar component.

```tsx
import { Progress } from "@/components/ui/progress"

<Progress value={75} className="w-full" />
```

### Badge
Badge component for labels and status indicators.

```tsx
import { Badge } from "@/components/ui/badge"

<Badge variant="default">Active</Badge>
```

## Authentication Components (`components/auth/`)

### AuthProvider
Context provider for authentication state management.

```tsx
import { AuthProvider } from "@/components/auth/auth-provider"

<AuthProvider>
  <App />
</AuthProvider>
```

**Features:**
- User authentication state
- Login/logout functionality
- Session management
- Profile data

### AuthModal
Modal component for user authentication.

```tsx
import { AuthModal } from "@/components/auth/auth-modal"

<AuthModal isOpen={isOpen} onClose={onClose} />
```

**Props:**
- `isOpen`: boolean
- `onClose`: function
- `mode`: "login" | "signup" | "reset"

## Interview Components (`components/interview/`)

### ConversationalSession
Main component for managing interview sessions.

```tsx
import { ConversationalSession } from "@/components/interview/conversational-session"

<ConversationalSession
  userId={user.id}
  roleType="Software Engineer"
  onComplete={handleComplete}
/>
```

**Props:**
- `userId`: string
- `roleType`: string
- `onComplete`: function(bullets: any[])

**Features:**
- Manages interview flow
- Handles voice and chat modes
- Collects conversation data
- Generates resume bullets

### VoiceRecorder
Component for voice recording and transcription.

```tsx
import { VoiceRecorder } from "@/components/interview/voice-recorder"

<VoiceRecorder
  onRecordingComplete={handleRecording}
  isRecording={isRecording}
  setIsRecording={setIsRecording}
/>
```

**Props:**
- `onRecordingComplete`: function(blob: Blob, duration: number)
- `isRecording`: boolean
- `setIsRecording`: function(boolean)

### ChatInterview
Component for text-based interviews.

```tsx
import { ChatInterview } from "@/components/interview/chat-interview"

<ChatInterview
  onMessageSend={handleMessage}
  isAITalking={isAITalking}
  currentMessage={currentMessage}
/>
```

**Props:**
- `onMessageSend`: function(message: string)
- `isAITalking`: boolean
- `currentMessage`: string

### ResumeAnalyzer
Component for resume analysis and Q&A.

```tsx
import { ResumeAnalyzer } from "@/components/interview/resume-analyzer"

<ResumeAnalyzer
  resumeText={resumeText}
  onQuestionAsk={handleQuestion}
/>
```

**Props:**
- `resumeText`: string
- `onQuestionAsk`: function(question: string)

### ResumeUpload
Component for uploading and parsing resumes.

```tsx
import { ResumeUpload } from "@/components/interview/resume-upload"

<ResumeUpload
  onUploadComplete={handleUpload}
  onTextExtracted={handleTextExtracted}
/>
```

**Props:**
- `onUploadComplete`: function(file: File)
- `onTextExtracted`: function(text: string)

### ResumeDownload
Component for downloading generated resumes.

```tsx
import { ResumeDownload } from "@/components/interview/resume-download"

<ResumeDownload
  resumeData={resumeData}
  template={template}
  downloads={downloads}
  onRegenerate={handleRegenerate}
/>
```

**Props:**
- `resumeData`: object
- `template`: string
- `downloads`: object
- `onRegenerate`: function

**Features:**
- Multiple download formats (LaTeX, PDF, Word, Overleaf)
- Resume preview
- Regeneration options

### AIResumeChatbot
Component for AI-powered resume assistance.

```tsx
import { AiResumeChatbot } from "@/components/interview/ai-resume-chatbot"

<AiResumeChatbot
  resumeText={resumeText}
  onQuestionAsk={handleQuestion}
/>
```

**Props:**
- `resumeText`: string
- `onQuestionAsk`: function(question: string)

## Subscription Components (`components/subscription/`)

### SubscriptionManager
Component for managing user subscriptions.

```tsx
import { SubscriptionManager } from "@/components/subscription/subscription-manager"

<SubscriptionManager onUpgrade={handleUpgrade} />
```

**Props:**
- `onUpgrade`: function

**Features:**
- Current plan display
- Usage tracking
- Upgrade options
- Billing management

### UsageWarning
Component for displaying usage warnings.

```tsx
import { UsageWarning } from "@/components/subscription/usage-warning"

<UsageWarning action="interview" showAlways={false} />
```

**Props:**
- `action`: "interview" | "cover_letter" | "template"
- `showAlways`: boolean

### SubscriptionGuard
Component for protecting features based on subscription.

```tsx
import { SubscriptionGuard } from "@/components/subscription/subscription-guard"

<SubscriptionGuard action="interview">
  <InterviewComponent />
</SubscriptionGuard>
```

**Props:**
- `action`: string
- `children`: ReactNode
- `fallback`: ReactNode (optional)

### SubscriptionFixer
Component for fixing subscription issues.

```tsx
import { SubscriptionFixer } from "@/components/subscription/subscription-fixer"

<SubscriptionFixer userId={user.id} />
```

**Props:**
- `userId`: string

## Admin Components (`components/admin/`)

### AdminDashboard
Component for admin dashboard functionality.

```tsx
import { AdminDashboard } from "@/components/admin/admin-dashboard"

<AdminDashboard />
```

**Features:**
- User statistics
- Revenue tracking
- Usage analytics
- System monitoring

## Layout Components

### Footer
Application footer component.

```tsx
import { Footer } from "@/components/layout/footer"

<Footer />
```

### ThemeProvider
Theme context provider for dark/light mode.

```tsx
import { ThemeProvider } from "@/components/theme-provider"

<ThemeProvider>
  <App />
</ThemeProvider>
```

## Waitlist Components (`components/waitlist/`)

### WaitlistForm
Component for collecting waitlist signups.

```tsx
import { WaitlistForm } from "@/components/waitlist/waitlist-form"

<WaitlistForm onSignup={handleSignup} />
```

**Props:**
- `onSignup`: function(email: string)

## Custom Hooks

### useToast
Custom hook for displaying toast notifications.

```tsx
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast()

toast({
  title: "Success",
  description: "Operation completed successfully",
})
```

## Component Patterns

### Error Boundaries
Components use error boundaries for graceful error handling:

```tsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>
    }

    return this.props.children
  }
}
```

### Loading States
Components implement consistent loading states:

```tsx
const [loading, setLoading] = useState(false)

if (loading) {
  return <div className="animate-pulse">Loading...</div>
}
```

### Responsive Design
All components are responsive and mobile-friendly:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

## Styling Guidelines

### Tailwind CSS
Components use Tailwind CSS for styling:

- Utility-first approach
- Consistent spacing and colors
- Responsive design patterns
- Dark mode support

### Component Variants
Components support multiple variants:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

## Testing Components

### Unit Testing
Components are tested using React Testing Library:

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

test('renders button with correct text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
```

### Integration Testing
Components are tested in integration with other components:

```tsx
test('subscription manager shows correct plan', () => {
  render(
    <AuthProvider>
      <SubscriptionManager />
    </AuthProvider>
  )
  expect(screen.getByText('Pro Plan')).toBeInTheDocument()
})
```

## Performance Optimization

### Code Splitting
Components are code-split for better performance:

```tsx
const LazyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<div>Loading...</div>}>
  <LazyComponent />
</Suspense>
```

### Memoization
Expensive components are memoized:

```tsx
const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* Expensive rendering */}</div>
})
```

### Virtual Scrolling
Large lists use virtual scrolling:

```tsx
import { FixedSizeList as List } from 'react-window'

<List
  height={400}
  itemCount={1000}
  itemSize={35}
  itemData={items}
>
  {Row}
</List>
```

## Accessibility

### ARIA Labels
Components include proper ARIA labels:

```tsx
<button
  aria-label="Close modal"
  aria-describedby="modal-description"
  onClick={onClose}
>
  ×
</button>
```

### Keyboard Navigation
Components support keyboard navigation:

```tsx
const handleKeyDown = (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onClick()
  }
}
```

### Screen Reader Support
Components are optimized for screen readers:

```tsx
<div role="alert" aria-live="polite">
  {message}
</div>
```

## Internationalization

### i18n Support
Components support internationalization:

```tsx
import { useTranslation } from 'next-i18next'

const { t } = useTranslation()

<button>{t('common.submit')}</button>
```

## Component Documentation Standards

Each component should include:

1. **Purpose**: What the component does
2. **Props**: All available props with types
3. **Examples**: Usage examples
4. **Dependencies**: Required dependencies
5. **Testing**: Testing considerations
6. **Accessibility**: Accessibility features
7. **Performance**: Performance considerations

This documentation ensures consistent development practices and helps new developers understand the codebase quickly. 