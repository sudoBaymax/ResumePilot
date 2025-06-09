export interface InterviewQuestion {
  id: string
  text: string
  category: "intro" | "behavioral" | "technical" | "achievement" | "challenge" | "strength" | "impact"
  followUp?: string[]
  roleTypes?: string[]
  difficulty?: "entry" | "mid" | "senior"
}

export const interviewQuestions: InterviewQuestion[] = [
  // Introduction questions
  {
    id: "intro-1",
    text: "Tell me about your current role or recent projects and the main technologies you've been learning.",
    category: "intro",
    difficulty: "entry",
  },
  {
    id: "intro-2",
    text: "Walk me through your journey into software development and any projects you've worked on so far.",
    category: "intro",
    difficulty: "entry",
  },

  // Technical Achievement questions
  {
    id: "technical-1",
    text: "Describe a project or feature you built recently. What technologies did you use and what did you learn?",
    category: "technical",
    roleTypes: ["software", "engineering", "technical"],
    difficulty: "entry",
    followUp: [
      "How long did this project take you to complete?",
      "What was the most challenging part of building this?",
    ],
  },
  {
    id: "technical-2",
    text: "Tell me about a time when you had to debug an issue or fix a bug. How did you approach it?",
    category: "technical",
    difficulty: "entry",
    followUp: ["What tools did you use to identify the problem?", "How long did it take you to resolve the issue?"],
  },
  {
    id: "technical-3",
    text: "Describe a time when you worked with an API or integrated different parts of an application.",
    category: "technical",
    difficulty: "entry",
    followUp: [
      "What challenges did you face during the integration?",
      "How did you test that everything was working correctly?",
    ],
  },

  // Impact and Achievement questions
  {
    id: "impact-1",
    text: "Tell me about a project or contribution that you're proud of. What was the outcome?",
    category: "impact",
    difficulty: "entry",
    followUp: [
      "How did you measure the success of this project?",
      "What feedback did you receive from your team or users?",
    ],
  },
  {
    id: "impact-2",
    text: "Describe a time when you improved something or made a process more efficient, even if it was small.",
    category: "impact",
    difficulty: "entry",
    followUp: ["How much time did this save?", "Did others start using your improvement?"],
  },

  // Learning and Growth
  {
    id: "behavioral-1",
    text: "Tell me about a time when you had to learn a new technology or framework quickly for a project.",
    category: "behavioral",
    difficulty: "entry",
    followUp: ["How did you approach learning it?", "What resources did you use?"],
  },
  {
    id: "behavioral-2",
    text: "Describe a situation where you collaborated with others on a coding project or received code review feedback.",
    category: "behavioral",
    difficulty: "entry",
    followUp: ["How did you handle the feedback?", "What did you learn from working with others?"],
  },

  // Problem-solving and Challenges
  {
    id: "challenge-1",
    text: "Tell me about a coding problem or bug that took you a while to solve. What was your process?",
    category: "challenge",
    difficulty: "entry",
    followUp: ["What resources did you use to help solve it?", "How did you prevent similar issues in the future?"],
  },
  {
    id: "challenge-2",
    text: "Describe a time when you had to work with code that someone else wrote or legacy code.",
    category: "challenge",
    difficulty: "entry",
    followUp: ["How did you understand what the code was doing?", "What improvements did you make?"],
  },

  // Technical Strengths
  {
    id: "strength-1",
    text: "What programming language or technology are you most comfortable with, and can you give me an example of how you've used it?",
    category: "strength",
    difficulty: "entry",
    followUp: ["What do you like most about this technology?", "How has learning this helped you in your projects?"],
  },
  {
    id: "strength-2",
    text: "Tell me about a time when you had to quickly pick up a new tool or library for a project.",
    category: "strength",
    difficulty: "entry",
    followUp: ["How quickly were you able to start using it effectively?", "What made it easier or harder to learn?"],
  },

  // School/Bootcamp Projects
  {
    id: "technical-4",
    text: "Tell me about your favorite project from school, bootcamp, or personal learning. What made it interesting?",
    category: "technical",
    difficulty: "entry",
    followUp: ["What technologies did you use and why?", "If you could rebuild it now, what would you do differently?"],
  },

  // First Job/Internship Experience
  {
    id: "technical-5",
    text: "Describe your experience in your first development role or internship. What did you work on?",
    category: "technical",
    difficulty: "entry",
    followUp: ["What was the biggest thing you learned?", "How did you contribute to the team's goals?"],
  },

  // Version Control and Collaboration
  {
    id: "behavioral-3",
    text: "Tell me about your experience with Git and version control. Have you worked on team projects?",
    category: "behavioral",
    difficulty: "entry",
    followUp: ["How do you handle merge conflicts?", "What's your typical workflow when contributing to a project?"],
  },

  // Testing and Quality
  {
    id: "technical-6",
    text: "Have you written any tests for your code? Tell me about your experience with testing.",
    category: "technical",
    difficulty: "entry",
    followUp: ["What types of tests have you written?", "How has testing helped you catch issues?"],
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

  // Prioritize entry-level questions
  const entryQuestions = filteredQuestions.filter((q) => q.difficulty === "entry")
  const otherQuestions = filteredQuestions.filter((q) => q.difficulty !== "entry")

  // Ensure we have a good mix of question categories, prioritizing entry-level
  const categories = ["intro", "technical", "impact", "behavioral", "challenge", "strength"]
  const selectedQuestions: InterviewQuestion[] = []

  // First, select entry-level questions from each category
  categories.forEach((category) => {
    const categoryQuestions = entryQuestions.filter((q) => q.category === category)
    if (categoryQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * categoryQuestions.length)
      selectedQuestions.push(categoryQuestions[randomIndex])
    }
  })

  // Fill remaining slots with other entry-level questions
  const remainingEntryQuestions = entryQuestions.filter((q) => !selectedQuestions.some((sq) => sq.id === q.id))

  while (selectedQuestions.length < count && remainingEntryQuestions.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingEntryQuestions.length)
    selectedQuestions.push(remainingEntryQuestions[randomIndex])
    remainingEntryQuestions.splice(randomIndex, 1)
  }

  // If still need more questions, add from other difficulties
  while (selectedQuestions.length < count && otherQuestions.length > 0) {
    const randomIndex = Math.floor(Math.random() * otherQuestions.length)
    selectedQuestions.push(otherQuestions[randomIndex])
    otherQuestions.splice(randomIndex, 1)
  }

  return selectedQuestions.slice(0, count)
}

// Helper function to get questions by difficulty level
export function getQuestionsByDifficulty(difficulty: "entry" | "mid" | "senior", count = 5): InterviewQuestion[] {
  const filteredQuestions = interviewQuestions.filter(
    (q) => q.difficulty === difficulty || (difficulty === "entry" && !q.difficulty),
  )

  return filteredQuestions.slice(0, count)
}
