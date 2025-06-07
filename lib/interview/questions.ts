export interface InterviewQuestion {
  id: string
  text: string
  category: "intro" | "behavioral" | "technical" | "achievement" | "challenge" | "strength"
  followUp?: string[]
  roleTypes?: string[]
}

export const interviewQuestions: InterviewQuestion[] = [
  // Introduction questions
  {
    id: "intro-1",
    text: "Tell me about your current role and responsibilities.",
    category: "intro",
  },
  {
    id: "intro-2",
    text: "Walk me through your professional background and how it led you to this point in your career.",
    category: "intro",
  },

  // Behavioral questions
  {
    id: "behavioral-1",
    text: "Tell me about a time when you had to collaborate with a difficult team member. How did you handle it?",
    category: "behavioral",
    followUp: ["What was the outcome of this situation?", "What did you learn from this experience?"],
  },
  {
    id: "behavioral-2",
    text: "Describe a situation where you had to make a difficult decision with limited information.",
    category: "behavioral",
    followUp: ["What factors did you consider?", "How did you evaluate the success of your decision?"],
  },

  // Technical questions
  {
    id: "technical-1",
    text: "Describe a technical system or application you built or significantly improved.",
    category: "technical",
    roleTypes: ["software", "engineering", "technical"],
    followUp: ["What technologies did you use?", "What challenges did you face during implementation?"],
  },
  {
    id: "technical-2",
    text: "Tell me about a time when you had to learn a new technology or tool quickly to complete a project.",
    category: "technical",
    followUp: [
      "How did you approach the learning process?",
      "How did this new knowledge contribute to the project's success?",
    ],
  },

  // Achievement questions
  {
    id: "achievement-1",
    text: "What project or accomplishment are you most proud of in your career?",
    category: "achievement",
    followUp: [
      "Can you quantify the impact of this achievement?",
      "What was your specific role in this accomplishment?",
    ],
  },
  {
    id: "achievement-2",
    text: "Tell me about a time when you exceeded expectations on a project or task.",
    category: "achievement",
    followUp: ["What specific actions did you take?", "How was your contribution recognized?"],
  },

  // Challenge questions
  {
    id: "challenge-1",
    text: "Describe a significant challenge you faced in your work and how you overcame it.",
    category: "challenge",
    followUp: ["What resources or support did you leverage?", "What was the outcome?"],
  },
  {
    id: "challenge-2",
    text: "Tell me about a time when you had to handle a project that was behind schedule or over budget.",
    category: "challenge",
    followUp: ["What specific actions did you take to address the situation?", "What was the final result?"],
  },

  // Strength questions
  {
    id: "strength-1",
    text: "What would you say are your greatest technical strengths and how have you applied them?",
    category: "strength",
    followUp: [
      "Can you give a specific example of how you've used these strengths?",
      "How do you continue to develop these strengths?",
    ],
  },
  {
    id: "strength-2",
    text: "What tools, languages, or frameworks are you most proficient with, and how have you used them in your work?",
    category: "strength",
    roleTypes: ["software", "engineering", "technical"],
    followUp: [
      "How did you become proficient with these tools?",
      "How have these skills contributed to your team's success?",
    ],
  },
]

export function getInterviewQuestions(roleType?: string, count = 5): InterviewQuestion[] {
  let filteredQuestions = interviewQuestions

  // Filter by role type if provided
  if (roleType) {
    const roleTypeLower = roleType.toLowerCase()
    filteredQuestions = interviewQuestions.filter(
      (q) => !q.roleTypes || q.roleTypes.some((r) => roleTypeLower.includes(r)),
    )
  }

  // Ensure we have at least one question from each category
  const categories = ["intro", "behavioral", "technical", "achievement", "challenge", "strength"]
  const selectedQuestions: InterviewQuestion[] = []

  // First, select one question from each category
  categories.forEach((category) => {
    const categoryQuestions = filteredQuestions.filter((q) => q.category === category)
    if (categoryQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * categoryQuestions.length)
      selectedQuestions.push(categoryQuestions[randomIndex])
      // Remove the selected question from filteredQuestions
      const index = filteredQuestions.findIndex((q) => q.id === categoryQuestions[randomIndex].id)
      if (index !== -1) {
        filteredQuestions.splice(index, 1)
      }
    }
  })

  // If we need more questions, randomly select from remaining questions
  while (selectedQuestions.length < count && filteredQuestions.length > 0) {
    const randomIndex = Math.floor(Math.random() * filteredQuestions.length)
    selectedQuestions.push(filteredQuestions[randomIndex])
    filteredQuestions.splice(randomIndex, 1)
  }

  return selectedQuestions
}
