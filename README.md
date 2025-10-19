# Learnie - AI-Powered Educational Platform

A full-stack educational platform that generates interactive lessons with AI-powered content, voice narration, and visual aids.

## Features

- **9 Educational Topics**: Alphabet, Counting, Solar System, Fractions, Shapes, Weather, Animals, Time, Money
- **Custom Topics**: Users can create lessons on any subject
- **AI-Powered Content**: Uses Google Gemini for educational content generation
- **Professional Voice Narration**: ElevenLabs integration for high-quality voice synthesis
- **Custom Instructions**: Users can customize lesson style, length, and voice tone
- **Interactive Lessons**: HTML-based lessons with audio and visual content
- **Image Generation**: AI-generated educational visuals and SVGs

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API key
- ElevenLabs API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lecad25/Learnie.git
   cd Learnie
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ELEVENLABS_BASE_URL=https://api.elevenlabs.io/v1
   ```

4. **Start the development servers**
   
   In one terminal (backend):
   ```bash
   cd backend
   npm start
   ```
   
   In another terminal (frontend):
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## API Keys Setup

### Google Gemini API
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file as `GEMINI_API_KEY`

### ElevenLabs API
1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up and get your API key
3. Add it to your `.env` file as `ELEVENLABS_API_KEY`

## Project Structure

```
Learnie/
├── backend/
│   ├── .env.example       # Environment variables template
│   ├── server.js          # Express server
│   ├── routes/            # API routes
│   ├── services/          # AI service integrations
│   └── output/            # Generated content (audio, images, HTML)
├── src/                   # React frontend
├── public/                # Static assets
└── README.md
```

## Security Notes

- **Never commit API keys to git**
- The `.env` file is in `.gitignore` and should never be committed
- Use environment variables for all sensitive data
- The `config.js` file now uses environment variables instead of hardcoded keys

## Technologies Used

- **Frontend**: React, Vite, CSS3
- **Backend**: Node.js, Express.js
- **AI Services**: Google Gemini, ElevenLabs
- **Image Generation**: SVG with AI-enhanced descriptions
- **Audio**: MP3 generation with ElevenLabs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.
