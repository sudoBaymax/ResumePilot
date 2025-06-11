# ResumePilot

ResumePilot is an AI-powered interview preparation platform that helps users practice and improve their interview skills through realistic mock interviews.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.8 or higher)
- [Git](https://git-scm.com/)

## Installation

### 1. Clone the Repository

First, create a directory and clone the repository:

```bash
# Create and enter project directory
mkdir resumepilot.ca
cd resumepilot.ca

# Initialize git and add remote
git init
git remote add origin https://github.com/sudoBaymax/ResumePilot.git
git branch -M main
git pull origin main
```

### 2. Set Up Virtual Environment

#### Windows
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

#### macOS/Linux
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate
```

### 3. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# In case node.js isntallation gives an error due to package conflict
npm install --legacy-peer-deps

# Install Python dependencies
pip install -r requirements.txt
```

### 4. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

Replace the placeholder values with your actual API keys and credentials.

## Running the Application

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Features

- AI-powered mock interviews
- Real-time speech-to-text transcription
- Interview feedback and analysis
- Progress tracking
- Customizable interview scenarios

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
