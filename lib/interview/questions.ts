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
    text: "Tell me about your current role and the main technologies you work with daily.",
    category: "intro",
    difficulty: "entry",
  },
  {
    id: "intro-2",
    text: "Walk me through your software engineering journey and the most significant projects you've worked on.",
    category: "intro",
    difficulty: "mid",
  },

  // Technical Achievement questions
  {
    id: "technical-1",
    text: "Describe a complex technical system or feature you built from scratch. What technologies did you use and what challenges did you overcome?",
    category: "technical",
    roleTypes: ["software", "engineering", "technical"],
    difficulty: "mid",
    followUp: [
      "What was the scale of this system in terms of users or data?",
      "How did you measure the success of this implementation?",
    ],
  },
  {
    id: "technical-2",
    text: "Tell me about a time when you had to optimize performance in an application or system. What was the problem and how did you solve it?",
    category: "technical",
    difficulty: "mid",
    followUp: [
      "What specific metrics improved after your optimization?",
      "What tools did you use to identify and measure the performance issues?",
    ],
  },
  {
    id: "technical-3",
    text: "Describe a time when you had to integrate multiple systems or APIs. What was the architecture and what challenges did you face?",
    category: "technical",
    difficulty: "mid",
    followUp: [
      "How did you handle error handling and data consistency?",
      "What was the impact on the overall system reliability?",
    ],
  },

  // Impact and Achievement questions
  {
    id: "impact-1",
    text: "Tell me about a project where your code or technical decisions had a significant business impact. What was the outcome?",
    category: "impact",
    difficulty: "mid",
    followUp: [
      "How did you measure or quantify this business impact?",
      "What feedback did you receive from stakeholders?",
    ],
  },
  {
    id: "impact-2",
    text: "Describe a time when you automated a manual process or improved developer productivity. What was the before and after?",
    category: "impact",
    difficulty: "entry",
    followUp: ["How much time did this save per week or month?", "Did other teams adopt your solution?"],
  },

  // Leadership and Collaboration
  {
    id: "behavioral-1",
    text: "Tell me about a time when you had to lead a technical initiative or mentor other developers. What was your approach?",
    category: "behavioral",
    difficulty: "senior",
    followUp: ["What was the outcome for the team or project?", "How did you measure the success of your mentoring?"],
  },
  {
    id: "behavioral-2",
    text: "Describe a situation where you had to collaborate with non-technical stakeholders to deliver a technical solution.",
    category: "behavioral",
    difficulty: "mid",
    followUp: ["How did you communicate technical concepts to them?", "What was the final outcome of the project?"],
  },

  // Problem-solving and Challenges
  {
    id: "challenge-1",
    text: "Tell me about the most challenging bug or technical problem you've solved. What was your debugging process?",
    category: "challenge",
    difficulty: "mid",
    followUp: [
      "What tools or techniques did you use to identify the root cause?",
      "How did you prevent similar issues in the future?",
    ],
  },
  {
    id: "challenge-2",
    text: "Describe a time when you had to work with legacy code or technical debt. How did you approach improving it?",
    category: "challenge",
    difficulty: "mid",
    followUp: [
      "What was the impact of your improvements?",
      "How did you balance new features with technical debt reduction?",
    ],
  },

  // Technical Strengths
  {
    id: "strength-1",
    text: "What's your strongest technical skill or area of expertise, and can you give me a specific example of how you've applied it recently?",
    category: "strength",
    difficulty: "entry",
    followUp: [
      "How do you stay current with developments in this area?",
      "How has this expertise benefited your team or company?",
    ],
  },
  {
    id: "strength-2",
    text: "Tell me about a time when you had to quickly learn a new technology or framework for a project. How did you approach it?",
    category: "strength",
    difficulty: "entry",
    followUp: ["How quickly were you able to become productive?", "What resources did you use to learn?"],
  },

  // Architecture and Design
  {
    id: "technical-4",
    text: "Describe a time when you had to make important architectural decisions for a project. What factors did you consider?",
    category: "technical",
    difficulty: "senior",
    followUp: [
      "How did these decisions impact the project's success?",
      "What would you do differently if you could start over?",
    ],
  },

  // Data and Analytics
  {
    id: "technical-5",
    text: "Tell me about a time when you worked with large datasets or implemented data processing solutions. What was the scale and approach?",
    category: "technical",
    difficulty: "mid",
    followUp: [
      "What technologies did you use for data processing?",
      "How did you ensure data quality and performance?",
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

  // Ensure we have a good mix of question categories
  const categories = ["intro", "technical", "impact", "behavioral", "challenge", "strength"]
  const selectedQuestions: InterviewQuestion[] = []

  // First, select one question from each major category
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

  // If we need more questions, prioritize technical and impact questions
  const priorityCategories = ["technical", "impact", "challenge"]
  while (selectedQuestions.length < count && filteredQuestions.length > 0) {
    // Try to get from priority categories first
    let found = false
    for (const category of priorityCategories) {
      const categoryQuestions = filteredQuestions.filter((q) => q.category === category)
      if (categoryQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * categoryQuestions.length)
        selectedQuestions.push(categoryQuestions[randomIndex])
        const index = filteredQuestions.findIndex((q) => q.id === categoryQuestions[randomIndex].id)
        if (index !== -1) {
          filteredQuestions.splice(index, 1)
        }
        found = true
        break
      }
    }

    // If no priority questions left, pick any remaining question
    if (!found && filteredQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredQuestions.length)
      selectedQuestions.push(filteredQuestions[randomIndex])
      filteredQuestions.splice(randomIndex, 1)
    }
  }

  return selectedQuestions.slice(0, count)
}

// Helper function to get questions by difficulty level
export function getQuestionsByDifficulty(difficulty: "entry" | "mid" | "senior", count = 5): InterviewQuestion[] {
  const filteredQuestions = interviewQuestions.filter(
    (q) => !q.difficulty || q.difficulty === difficulty || difficulty === "senior",
  )

  return getInterviewQuestions("software engineer", count).filter((q) => filteredQuestions.some((fq) => fq.id === q.id))
}
