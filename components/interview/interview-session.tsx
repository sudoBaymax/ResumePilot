"use client"

import { ConversationalSession } from "@/components/interview/conversational-session"

interface InterviewSessionProps {
  userId: string
  roleType?: string
  onComplete: (bullets: any[]) => void
}

export function InterviewSession({ userId, roleType, onComplete }: InterviewSessionProps) {
  return <ConversationalSession userId={userId} roleType={roleType} onComplete={onComplete} />
}
