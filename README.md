# Universal Bot - React + Vite + TypeScript

A powerful AI chatbot with image-to-text, translation, and text-to-speech capabilities built with React, Vite, and TypeScript.

## ✨ Features

- 🤖 **AI Chat** - Powered by Google Gemini AI
- 📸 **Image to Text** - OCR with automatic translation
- 🌍 **Translation** - Multi-language support with Google Translate
- 🔊 **Text-to-Speech** - High-quality voice synthesis
- 🎤 **Speech-to-Text** - Voice input recognition
- 🎯 **Assistive Chatbots** - Specialized modes for different use cases

## 🚀 Quick Setup

### 1. Clone and Install
```bash
git clone <your-repo>
cd universal-bot-react
pnpm install
```

### 2. Add Your Gemini API Key
Create a `.env` file in the root directory:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Development
```bash
pnpm dev
```

That's it! The app will be available at `http://localhost:8080`

## 🔑 Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key and add it to your `.env` file

## 📱 Usage

- **Chat**: Type messages to talk with the AI
- **Image to Text**: Click camera icon, capture/upload image, and extract text
- **Translation**: Select languages and translate text automatically
- **Voice**: Use microphone for speech-to-text and speaker for text-to-speech
- **Settings**: Customize languages, voices, and behavior

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Radix UI + TailwindCSS + Lucide Icons
- **AI**: Google Gemini API
- **OCR**: Tesseract.js (client-side)
- **Translation**: Google Translate API + LibreTranslate (fallback)
- **TTS**: Google Text-to-Speech

## 📦 Build for Production

```bash
pnpm build
pnpm preview
```

## 🌐 Deploy

Deploy the `dist` folder to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

## ⚙️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Your Google Gemini API key | ✅ Yes |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for any purpose!
