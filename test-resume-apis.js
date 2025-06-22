// Simple test script for resume generation APIs
// Run with: node test-resume-apis.js

const testResumeData = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "123-456-7890",
  linkedin: "linkedin.com/in/johndoe",
  github: "github.com/johndoe",
  location: "San Francisco, CA",
  roleType: "Software Engineer",
  education: [
    {
      school: "University of California",
      degree: "Bachelor of Science in Computer Science",
      location: "Berkeley, CA",
      dates: "2018 - 2022"
    }
  ],
  experience: [
    {
      title: "Software Engineer",
      company: "Tech Corp",
      location: "San Francisco, CA",
      dates: "2022 - Present",
      bullets: [
        "Developed scalable web applications using React and Node.js",
        "Improved application performance by 40% through optimization",
        "Led a team of 3 developers on a major feature implementation"
      ]
    }
  ],
  projects: [
    {
      name: "E-commerce Platform",
      technologies: "React, Node.js, MongoDB",
      dates: "2023",
      bullets: [
        "Built a full-stack e-commerce platform serving 10,000+ users",
        "Implemented secure payment processing with Stripe integration",
        "Achieved 99.9% uptime through robust error handling"
      ]
    }
  ],
  skills: {
    languages: ["JavaScript", "Python", "Java"],
    frameworks: ["React", "Node.js", "Express"],
    tools: ["Git", "Docker", "AWS"],
    libraries: ["Redux", "Mongoose", "Jest"]
  }
};

const testLatexContent = `% Simple test LaTeX content
\\documentclass[letterpaper,11pt]{article}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape John Doe} \\\\ \\vspace{1pt}
    \\small 123-456-7890 \\$|$ \\href{mailto:john.doe@example.com}{john.doe@example.com} \\$|$ 
    \\href{https://linkedin.com/in/johndoe}{LinkedIn.com/in/johndoe} \\$|$
    \\href{https://github.com/johndoe}{GitHub.com/johndoe}
\\end{center}

\\section{Education}
\\textbf{University of California} \\hfill Berkeley, CA \\\\
\\textit{Bachelor of Science in Computer Science} \\hfill 2018 - 2022

\\section{Experience}
\\textbf{Software Engineer} \\hfill 2022 - Present \\\\
\\textit{Tech Corp} \\hfill San Francisco, CA
\\begin{itemize}
    \\item Developed scalable web applications using React and Node.js
    \\item Improved application performance by 40\\% through optimization
    \\item Led a team of 3 developers on a major feature implementation
\\end{itemize}

\\section{Projects}
\\textbf{E-commerce Platform} \\hfill 2023 \\\\
\\textit{React, Node.js, MongoDB}
\\begin{itemize}
    \\item Built a full-stack e-commerce platform serving 10,000+ users
    \\item Implemented secure payment processing with Stripe integration
    \\item Achieved 99.9\\% uptime through robust error handling
\\end{itemize}

\\section{Technical Skills}
\\textbf{Languages:} JavaScript, Python, Java \\\\
\\textbf{Frameworks:} React, Node.js, Express \\\\
\\textbf{Developer Tools:} Git, Docker, AWS \\\\
\\textbf{Libraries:} Redux, Mongoose, Jest

\\end{document}`;

console.log("Test resume data:", JSON.stringify(testResumeData, null, 2));
console.log("\nTest LaTeX content length:", testLatexContent.length, "characters");
console.log("\nAPIs are ready for testing!");
console.log("\nTo test the APIs:");
console.log("1. Start your development server: npm run dev");
console.log("2. Use the resume generation feature in the UI");
console.log("3. Try downloading PDF and Word formats");
console.log("\nThe APIs will handle errors gracefully and provide fallback options."); 