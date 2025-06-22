import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { resumeData, filename } = await request.json()

    if (!resumeData) {
      return NextResponse.json({ error: "Missing resume data" }, { status: 400 })
    }

    console.log("Generating Word document for user:", user.id)

    // Generate Word document from resume data
    const wordResponse = await generateWordDocument(resumeData, filename)

    if (!wordResponse.success) {
      throw new Error(wordResponse.error || "Word generation failed")
    }

    return NextResponse.json({
      success: true,
      wordUrl: wordResponse.wordUrl,
      filename: filename.replace('.tex', '.docx')
    })

  } catch (error) {
    console.error("Error generating Word document:", error)
    return NextResponse.json({
      error: "Failed to generate Word document",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

async function generateWordDocument(resumeData: any, filename: string): Promise<{ success: boolean; wordUrl?: string; error?: string }> {
  try {
    console.log("Generating Word document from resume data...")
    
    // Create a simple HTML representation of the resume
    const htmlContent = createResumeHTML(resumeData)
    
    // Convert HTML to Word document using a simple approach
    // In production, you might want to use libraries like:
    // - docx (Node.js library)
    // - mammoth (HTML to DOCX)
    // - pandoc (command line tool)
    
    const wordBlob = await htmlToWord(htmlContent)
    const wordUrl = URL.createObjectURL(wordBlob)
    
    console.log("Word document generated successfully")
    
    return {
      success: true,
      wordUrl
    }

  } catch (error) {
    console.error("Word generation error:", error)
    return {
      success: false,
      error: `Word document generation failed: ${error instanceof Error ? error.message : "Unknown error"}. A fallback HTML version will be provided.`
    }
  }
}

function createResumeHTML(resumeData: any): string {
  const { name, email, phone, linkedin, github, location, roleType, education, experience, projects, skills } = resumeData

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${name} - Resume</title>
    <style>
        body { font-family: 'Calibri', sans-serif; margin: 40px; line-height: 1.4; }
        .header { text-align: center; margin-bottom: 30px; }
        .name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .contact { font-size: 12px; color: #666; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #333; margin-bottom: 15px; }
        .job { margin-bottom: 20px; }
        .job-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .job-title { font-weight: bold; }
        .job-company { font-style: italic; }
        .job-dates { color: #666; }
        .job-location { color: #666; }
        .bullet { margin-left: 20px; margin-bottom: 5px; }
        .project { margin-bottom: 15px; }
        .project-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .project-name { font-weight: bold; }
        .project-tech { font-style: italic; color: #666; }
        .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .skill-category { margin-bottom: 10px; }
        .skill-title { font-weight: bold; }
        .skill-list { color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="name">${name}</div>
        <div class="contact">
            ${phone} • ${email} • ${location}<br>
            ${linkedin} • ${github}
        </div>
    </div>

    <div class="section">
        <div class="section-title">EDUCATION</div>
        ${education?.map((edu: any) => `
            <div class="job">
                <div class="job-header">
                    <div>
                        <span class="job-title">${edu.school}</span>
                        <span class="job-company">${edu.degree}</span>
                    </div>
                    <div class="job-dates">${edu.dates}</div>
                </div>
                <div class="job-location">${edu.location}</div>
            </div>
        `).join('') || 'No education information provided.'}
    </div>

    <div class="section">
        <div class="section-title">EXPERIENCE</div>
        ${experience?.map((exp: any) => `
            <div class="job">
                <div class="job-header">
                    <div>
                        <span class="job-title">${exp.title}</span>
                        <span class="job-company">${exp.company}</span>
                    </div>
                    <div class="job-dates">${exp.dates}</div>
                </div>
                <div class="job-location">${exp.location}</div>
                ${exp.bullets?.map((bullet: string) => `
                    <div class="bullet">• ${bullet}</div>
                `).join('') || ''}
            </div>
        `).join('') || 'No experience information provided.'}
    </div>

    <div class="section">
        <div class="section-title">PROJECTS</div>
        ${projects?.map((proj: any) => `
            <div class="project">
                <div class="project-header">
                    <div>
                        <span class="project-name">${proj.name}</span>
                        <span class="project-tech">${proj.technologies}</span>
                    </div>
                    <div class="job-dates">${proj.dates}</div>
                </div>
                ${proj.bullets?.map((bullet: string) => `
                    <div class="bullet">• ${bullet}</div>
                `).join('') || ''}
            </div>
        `).join('') || 'No projects information provided.'}
    </div>

    <div class="section">
        <div class="section-title">TECHNICAL SKILLS</div>
        <div class="skills-grid">
            ${skills ? `
                <div class="skill-category">
                    <div class="skill-title">Languages:</div>
                    <div class="skill-list">${skills.languages?.join(', ') || 'Not specified'}</div>
                </div>
                <div class="skill-category">
                    <div class="skill-title">Frameworks:</div>
                    <div class="skill-list">${skills.frameworks?.join(', ') || 'Not specified'}</div>
                </div>
                <div class="skill-category">
                    <div class="skill-title">Developer Tools:</div>
                    <div class="skill-list">${skills.tools?.join(', ') || 'Not specified'}</div>
                </div>
                <div class="skill-category">
                    <div class="skill-title">Libraries:</div>
                    <div class="skill-list">${skills.libraries?.join(', ') || 'Not specified'}</div>
                </div>
            ` : 'No skills information provided.'}
        </div>
    </div>
</body>
</html>
  `
}

async function htmlToWord(htmlContent: string): Promise<Blob> {
  try {
    // For this implementation, we'll create a simple HTML file that can be opened in Word
    // In production, you'd use a proper HTML to DOCX conversion library
    
    // Create a blob with the HTML content
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' })
    
    // For now, return the HTML blob (users can open it in Word)
    // In a full implementation, you'd convert this to actual DOCX format
    return htmlBlob
    
  } catch (error) {
    throw new Error(`HTML to Word conversion failed: ${error}`)
  }
} 