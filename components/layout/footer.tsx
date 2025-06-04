const Footer = () => {
  return (
    <footer className="bg-gray-800 py-8">
      <div className="container mx-auto text-center">
        <p className="text-gray-400 text-sm">
          AI-powered resume builder that helps software engineers craft compelling, ATS-optimized resumes with STAR and
          XYZ format bullets through voice interviews.
        </p>
        <p className="text-gray-500 text-xs mt-4">&copy; {new Date().getFullYear()} ResumeAI. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
