import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { OpenAI } from "openai"
import fs from "fs"
import path from "path"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ResumeData {
  name: string
  email: string
  phone: string
  linkedin: string
  github: string
  location: string
  roleType: string
  education: Array<{
    school: string
    degree: string
    location: string
    dates: string
  }>
  experience: Array<{
    title: string
    company: string
    location: string
    dates: string
    bullets: string[]
  }>
  projects: Array<{
    name: string
    technologies: string
    dates: string
    bullets: string[]
  }>
  skills: {
    languages: string[]
    frameworks: string[]
    tools: string[]
    libraries: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    // Temporarily remove authentication for testing
    // const authHeader = request.headers.get("authorization")
    // if (!authHeader) {
    //   return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    // }

    // const token = authHeader.replace("Bearer ", "")
    // const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    // if (authError || !user) {
    //   return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    // }

    const body = await request.json()
    const { 
      conversation, 
      resumeText, 
      roleType = "Software Engineer",
      templateName = "jakes-resume",
      userInfo = {}
    } = body

    if (!conversation || !Array.isArray(conversation)) {
      return NextResponse.json({ error: "Invalid conversation data" }, { status: 400 })
    }

    console.log("Generating resume for role:", roleType)

    // Step 1: Extract and structure conversation data
    const structuredData = await extractConversationData(conversation, resumeText, roleType, userInfo)
    
    // Step 2: Generate XYZ-format bullets using AI
    const enhancedData = await generateXYZBullets(structuredData, roleType)
    
    // Step 3: Process the LaTeX template
    const processedTemplate = await processLatexTemplate(templateName, enhancedData)
    
    // Step 4: Generate different formats
    const results = await generateFormats(processedTemplate, enhancedData, templateName)

    return NextResponse.json({
      success: true,
      data: enhancedData,
      template: processedTemplate,
      downloads: results
    })

  } catch (error) {
    console.error("Error generating resume:", error)
    return NextResponse.json({
      error: "Failed to generate resume",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function extractConversationData(conversation: any[], resumeText: string, roleType: string, userInfo: any): Promise<ResumeData> {
  const userMessages = conversation
    .filter(turn => turn.speaker === "user")
    .map(turn => turn.message)
    .join("\n")

  const aiMessages = conversation
    .filter(turn => turn.speaker === "ai")
    .map(turn => turn.message)
    .join("\n")

  const prompt = `You are a resume data extraction expert. Extract structured resume information from this conversation and return ONLY valid JSON.

CONVERSATION:
${userMessages}

AI RESPONSES:
${aiMessages}

${resumeText ? `EXISTING RESUME: ${resumeText}` : ""}

USER INFO:
${JSON.stringify(userInfo, null, 2)}

TARGET ROLE: ${roleType}

Extract and structure the following information in JSON format:
1. Personal info (name, email, phone, linkedin, github, location)
2. Education (school, degree, location, dates)
3. Experience (title, company, location, dates, raw bullet points)
4. Projects (name, technologies, dates, raw bullet points)
5. Skills (languages, frameworks, tools, libraries)

CRITICAL: Return ONLY valid JSON with this EXACT structure:
{
  "name": "string",
  "email": "string", 
  "phone": "string",
  "linkedin": "string",
  "github": "string",
  "location": "string",
  "roleType": "string",
  "education": [{"school": "string", "degree": "string", "location": "string", "dates": "string"}],
  "experience": [{"title": "string", "company": "string", "location": "string", "dates": "string", "bullets": ["string"]}],
  "projects": [{"name": "string", "technologies": "string", "dates": "string", "bullets": ["string"]}],
  "skills": {"languages": ["string"], "frameworks": ["string"], "tools": ["string"], "libraries": ["string"]}
}

If information is missing, use these placeholder values:
- linkedin: "linkedin.com/in/yourprofile"
- github: "github.com/yourusername"
- phone: "123-456-7890"
- email: "your.email@example.com"
- location: "City, State"
- name: "Your Name"

For other missing fields, use "Not specified" or empty arrays. DO NOT include any text before or after the JSON.`

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 2000,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("Failed to extract conversation data")
  }

  try {
    // Clean the content to extract just the JSON
    let jsonContent = content.trim()
    
    // Remove any markdown formatting
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/```json\n?/, "").replace(/```\n?/, "")
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/```\n?/, "").replace(/```\n?/, "")
    }
    
    // Find the first { and last } to extract JSON
    const firstBrace = jsonContent.indexOf("{")
    const lastBrace = jsonContent.lastIndexOf("}")
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON object found in response")
    }
    
    jsonContent = jsonContent.substring(firstBrace, lastBrace + 1)
    
    const parsedData = JSON.parse(jsonContent)
    
    // Ensure all required fields exist with defaults
    return {
      name: parsedData.name || "User",
      email: parsedData.email || "user@example.com",
      phone: parsedData.phone || "Not specified",
      linkedin: parsedData.linkedin || "Not specified",
      github: parsedData.github || "Not specified",
      location: parsedData.location || "Not specified",
      roleType: parsedData.roleType || roleType,
      education: parsedData.education || [],
      experience: parsedData.experience || [],
      projects: parsedData.projects || [],
      skills: {
        languages: parsedData.skills?.languages || [],
        frameworks: parsedData.skills?.frameworks || [],
        tools: parsedData.skills?.tools || [],
        libraries: parsedData.skills?.libraries || []
      }
    }
  } catch (error) {
    console.error("Failed to parse extracted data:", content)
    console.error("Parse error:", error)
    
    // Return a default structure if parsing fails
    return {
      name: "User",
      email: "user@example.com",
      phone: "Not specified",
      linkedin: "Not specified",
      github: "Not specified",
      location: "Not specified",
      roleType: roleType,
      education: [],
      experience: [],
      projects: [],
      skills: {
        languages: [],
        frameworks: [],
        tools: [],
        libraries: []
      }
    }
  }
}

async function generateXYZBullets(data: ResumeData, roleType: string): Promise<ResumeData> {
  try {
    const enhancedData = { ...data }

    // Generate XYZ bullets for experience
    for (let i = 0; i < enhancedData.experience.length; i++) {
      const exp = enhancedData.experience[i]
      if (exp.bullets && exp.bullets.length > 0) {
        try {
          const xyzBullets = await generateXYZBulletsForSection(
            exp.bullets.join("\n"),
            exp.title,
            exp.company,
            "experience",
            roleType
          )
          enhancedData.experience[i].bullets = xyzBullets
        } catch (error) {
          console.error("Error generating bullets for experience:", exp.title, error)
          enhancedData.experience[i].bullets = ["Developed and implemented key features using modern technologies"]
        }
      }
    }

    // Generate XYZ bullets for projects
    for (let i = 0; i < enhancedData.projects.length; i++) {
      const proj = enhancedData.projects[i]
      if (proj.bullets && proj.bullets.length > 0) {
        try {
          const xyzBullets = await generateXYZBulletsForSection(
            proj.bullets.join("\n"),
            proj.name,
            proj.technologies,
            "project",
            roleType
          )
          enhancedData.projects[i].bullets = xyzBullets
        } catch (error) {
          console.error("Error generating bullets for project:", proj.name, error)
          enhancedData.projects[i].bullets = ["Developed and implemented key features using modern technologies"]
        }
      }
    }

    return enhancedData
  } catch (error) {
    console.error("Error in generateXYZBullets:", error)
    return data // Return original data if enhancement fails
  }
}

async function generateXYZBulletsForSection(
  rawBullets: string,
  title: string,
  context: string,
  sectionType: "experience" | "project",
  roleType: string
): Promise<string[]> {
  try {
    const prompt = `You are an expert tech recruiter and resume consultant. Convert these raw bullet points into professional XYZ-format bullets for a ${roleType} resume.

ROLE: ${roleType}
SECTION: ${sectionType}
TITLE: ${title}
CONTEXT: ${context}

RAW BULLET POINTS:
${rawBullets}

RULES FOR XYZ FORMAT:
1. Start with a strong action verb (X)
2. Include specific technologies, tools, or methods (Y) 
3. End with quantifiable results or impact (Z)
4. Keep each bullet to 1-2 lines maximum
5. Use specific numbers and metrics when possible
6. Focus on technical achievements and business impact
7. Use present tense for current roles, past tense for completed work
8. Prioritize the most impressive and relevant achievements

IMPORTANT:
- Be accurate with numbers (don't fabricate, but you can slightly improve: "66" → "66+")
- Focus on technical skills and measurable impact
- Use industry-standard terminology for ${roleType} roles
- Ensure each bullet demonstrates value and technical competence
- Generate ONLY 3-4 high-quality bullets - quality over quantity

Generate 3-4 professional XYZ-format bullets. Return ONLY the bullets, one per line, no numbering or formatting.`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.warn("No content received for XYZ bullets")
      return []
    }

    const bullets = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 4) // Limit to 4 bullets max

    return bullets.length > 0 ? bullets : ["Developed and implemented key features using modern technologies"]
  } catch (error) {
    console.error("Error generating XYZ bullets:", error)
    return ["Developed and implemented key features using modern technologies"]
  }
}

function escapeLatex(text: string): string {
  if (!text) return ""
  
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}~^]/g, '\\$&')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function processLatexTemplate(templateName: string, data: ResumeData): Promise<string> {
  try {
    const templatePath = path.join(process.cwd(), 'app', 'resume-builder', 'resume_templates', `${templateName}.tex`)
    
    if (!fs.existsSync(templatePath)) {
      console.error(`Template ${templateName} not found at path: ${templatePath}`)
      throw new Error(`Template ${templateName} not found`)
    }

    let template = fs.readFileSync(templatePath, 'utf-8')

    // Replace personal information with proper escaping
    template = template.replace(/\\textbf\{\\Huge \\scshape [^}]+\}/, `\\textbf{\\Huge \\scshape ${escapeLatex(data.name || "User")}}`)
    template = template.replace(/123-456-7890/, escapeLatex(data.phone || "123-456-7890"))
    template = template.replace(/jatoujoseph@gmail\.com/, escapeLatex(data.email || "user@example.com"))
    template = template.replace(/linkedin\.com\/in\/josephjatou/, escapeLatex(data.linkedin || "linkedin.com/in/yourprofile"))
    template = template.replace(/github\.com\/sudoBaymax/, escapeLatex(data.github || "github.com/yourusername"))

    // Replace education section
    const educationSection = generateEducationSection(data.education)
    template = replaceSection(template, "Education", educationSection)

    // Replace experience section
    const experienceSection = generateExperienceSection(data.experience)
    template = replaceSection(template, "Experience", experienceSection)

    // Replace projects section
    const projectsSection = generateProjectsSection(data.projects)
    template = replaceSection(template, "Projects", projectsSection)

    // Replace skills section
    const skillsSection = generateSkillsSection(data.skills)
    template = replaceSection(template, "Technical Skills", skillsSection)

    return template
  } catch (error) {
    console.error("Error processing LaTeX template:", error)
    throw new Error(`Failed to process template: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

function generateEducationSection(education: ResumeData['education']): string {
  try {
    if (!education || education.length === 0) return ""

    let section = "\\section{Education}\n  \\resumeSubHeadingListStart\n"
    
    education.forEach(edu => {
      section += `    \\resumeSubheading\n      {${escapeLatex(edu.school || "School")}}{${escapeLatex(edu.location || "Location")}}\n      {${escapeLatex(edu.degree || "Degree")}}{${escapeLatex(edu.dates || "Dates")}}\n`
    })
    
    section += "  \\resumeSubHeadingListEnd\n"
    return section
  } catch (error) {
    console.error("Error generating education section:", error)
    return ""
  }
}

function generateExperienceSection(experience: ResumeData['experience']): string {
  try {
    if (!experience || experience.length === 0) return ""

    let section = "\\section{Experience}\n  \\resumeSubHeadingListStart\n"
    
    experience.forEach(exp => {
      section += `    \\resumeSubheading\n      {${escapeLatex(exp.title || "Title")}}{${escapeLatex(exp.dates || "Dates")}}\n      {${escapeLatex(exp.company || "Company")}}{${escapeLatex(exp.location || "Location")}}\n`
      if (exp.bullets && exp.bullets.length > 0) {
        section += "      \\resumeItemListStart\n"
        exp.bullets.forEach(bullet => {
          section += `        \\resumeItem{${escapeLatex(bullet || "Achievement")}}\n`
        })
        section += "      \\resumeItemListEnd\n"
      }
    })
    
    section += "  \\resumeSubHeadingListEnd\n"
    return section
  } catch (error) {
    console.error("Error generating experience section:", error)
    return ""
  }
}

function generateProjectsSection(projects: ResumeData['projects']): string {
  try {
    if (!projects || projects.length === 0) return ""

    let section = "\\section{Projects}\n    \\resumeSubHeadingListStart\n"
    
    projects.forEach(proj => {
      section += `      \\resumeProjectHeading\n          {\\textbf{${escapeLatex(proj.name || "Project")}} \\$|$ \\emph{${escapeLatex(proj.technologies || "Technologies")}}}{${escapeLatex(proj.dates || "Dates")}}\n`
      if (proj.bullets && proj.bullets.length > 0) {
        section += "          \\resumeItemListStart\n"
        proj.bullets.forEach(bullet => {
          section += `            \\resumeItem{${escapeLatex(bullet || "Achievement")}}\n`
        })
        section += "          \\resumeItemListEnd\n"
      }
    })
    
    section += "    \\resumeSubHeadingListEnd\n"
    return section
  } catch (error) {
    console.error("Error generating projects section:", error)
    return ""
  }
}

function generateSkillsSection(skills: ResumeData['skills']): string {
  try {
    if (!skills) return ""

    const languages = skills.languages?.map(escapeLatex).join(", ") || ""
    const frameworks = skills.frameworks?.map(escapeLatex).join(", ") || ""
    const tools = skills.tools?.map(escapeLatex).join(", ") || ""
    const libraries = skills.libraries?.map(escapeLatex).join(", ") || ""

    return `\\section{Technical Skills}\n \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n     \\textbf{Languages}{: ${languages}} \\\\\n     \\textbf{Frameworks}{: ${frameworks}} \\\\\n     \\textbf{Developer Tools}{: ${tools}} \\\\\n     \\textbf{Libraries}{: ${libraries}}\n    }}\n \\end{itemize}\n`
  } catch (error) {
    console.error("Error generating skills section:", error)
    return ""
  }
}

function replaceSection(template: string, sectionName: string, newContent: string): string {
  const sectionRegex = new RegExp(`%-----------${sectionName.toUpperCase()}-----------\\s*\\\\section\\{${sectionName}\\}[\\s\\S]*?(?=%-----------|\\\\end\\{document\\})`, 'g')
  return template.replace(sectionRegex, `%-----------${sectionName.toUpperCase()}-----------\n${newContent}`)
}

async function generateFormats(template: string, data: ResumeData, templateName: string) {
  // Return information about available download formats
  return {
    latex: template,
    filename: `${data.name.toLowerCase().replace(/\s+/g, '-')}-resume.tex`,
    templateName: templateName,
    availableFormats: {
      latex: {
        name: "LaTeX Source",
        description: "Edit and compile with LaTeX",
        icon: "FileCode",
        color: "blue"
      },
      overleaf: {
        name: "Overleaf",
        description: "Online LaTeX editor",
        icon: "ExternalLink", 
        color: "green"
      },
      pdf: {
        name: "PDF",
        description: "Direct PDF download",
        icon: "FileText",
        color: "red"
      },
      word: {
        name: "Word",
        description: "MS Word format",
        icon: "FileText",
        color: "blue"
      }
    }
  }
} 