import type { RequestHandler } from "express";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

function getFallbackResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  // Language/translation help
  if (lowerPrompt.includes("translate") || lowerPrompt.includes("language")) {
    return "🌍 I can help with translation! Use the 'Translate' button above to translate text between languages. The translation service is still available even when chat AI is limited.";
  }

  // TTS/Speech help
  if (lowerPrompt.includes("speak") || lowerPrompt.includes("voice") || lowerPrompt.includes("audio")) {
    return "🔊 You can use the 'Text-to-Speech' button to hear any text spoken aloud. Just type your text and click the speaker icon!";
  }

  // Emergency or urgent help
  if (lowerPrompt.includes("emergency") || lowerPrompt.includes("help") || lowerPrompt.includes("urgent")) {
    return "🚨 For emergencies, please contact local emergency services. For urgent assistance, try using the translation and text-to-speech features to communicate your needs clearly.";
  }

  // Legal assistance
  if (lowerPrompt.includes("legal") || lowerPrompt.includes("law") || lowerPrompt.includes("rights")) {
    return "⚖️ For legal assistance, I recommend contacting local legal aid organizations. Use the translation feature if you need help understanding legal documents in your language.";
  }

  // Healthcare
  if (lowerPrompt.includes("health") || lowerPrompt.includes("medical") || lowerPrompt.includes("doctor")) {
    return "🏥 For medical concerns, please consult healthcare professionals. I can help translate medical terms or help you communicate symptoms using the translation feature.";
  }

  // General response
  return `🤖 The AI chat service has reached its daily limit, but other features are still available! Try using:
• 🔊 Text-to-Speech to hear text spoken
• 🌍 Translation to convert between languages
• 🎤 Speech-to-Text to convert voice to text
• 📸 Image-to-Text to extract text from photos

Your question: "${prompt.length > 100 ? prompt.substring(0, 100) + "..." : prompt}"`;
}

export const handleChat: RequestHandler = async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Server is missing GOOGLE_API_KEY" });
      return;
    }

    const prompt: unknown = req.body?.prompt;
    const context: unknown = req.body?.context;
    if (typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "Invalid prompt" });
      return;
    }

    const fullPrompt =
      typeof context === "string" && context.trim()
        ? `${context.trim()}\n\nUser: ${prompt}`
        : prompt;

    const fast = Boolean(req.body?.fast);

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: fast
          ? {
              maxOutputTokens: 50,
              temperature: 0.3,
              topP: 0.8,
              topK: 20,
            }
          : {
              maxOutputTokens: 200,
              temperature: 0.7,
              topP: 0.95,
              topK: 40,
            },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");

      // Handle quota exceeded with fallback response
      if (response.status === 429 || text.includes("quota") || text.includes("RESOURCE_EXHAUSTED")) {
        // Provide a helpful fallback response instead of just an error
        const fallbackResponse = getFallbackResponse(prompt);
        res.json({ reply: fallbackResponse });
        return;
      }

      res.status(502).json({ error: "Upstream error", detail: text });
      return;
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text)
        .join("\n") ??
      "";

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: "Unexpected server error" });
  }
};
