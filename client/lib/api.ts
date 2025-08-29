// API utilities for frontend-only Universal Bot

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

// Chat API using Gemini directly
export async function sendChatMessage(
  prompt: string,
  context?: string,
  fast?: boolean,
) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.",
    );
  }

  const fullPrompt = context ? `${context.trim()}\n\nUser: ${prompt}` : prompt;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
    if (response.status === 429) {
      const text = await response.text().catch(() => "");
      if (text.includes("quota") || text.includes("RESOURCE_EXHAUSTED")) {
        return {
          reply: getFallbackResponse(prompt),
        };
      }
    }

    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const reply =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      .join("\n") ??
    "Sorry, I couldn't generate a reply.";

  return { reply };
}

// Translation API using Google Translate
export async function translateText(
  text: string,
  source: string,
  target: string,
) {
  if (!GEMINI_API_KEY) {
    throw new Error("API key not configured for translation.");
  }

  const GOOGLE_TRANSLATE_URL =
    "https://translation.googleapis.com/language/translate/v2";

  try {
    const params = new URLSearchParams({
      key: GEMINI_API_KEY,
      q: text,
      target: target,
      format: "text",
    });

    if (source !== "auto") {
      params.append("source", source);
    }

    const response = await fetch(`${GOOGLE_TRANSLATE_URL}?${params}`, {
      method: "POST",
    });

    if (response.ok) {
      const data = await response.json();
      const translated = data?.data?.translations?.[0]?.translatedText ?? "";
      if (translated) {
        return { translation: translated };
      }
    }
  } catch (error) {
    console.warn("Google Translate failed, using fallback:", error);
  }

  // Fallback to LibreTranslate
  try {
    const response = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source, target, format: "text" }),
    });

    if (response.ok) {
      const data = await response.json();
      const translated = data?.translatedText ?? data?.translation ?? "";
      return { translation: translated };
    }
  } catch (error) {
    console.warn("LibreTranslate failed:", error);
  }

  throw new Error("Translation failed");
}

// Language detection
export async function detectLanguage(text: string) {
  if (!GEMINI_API_KEY) {
    return { language: guessLanguage(text), confidence: null };
  }

  const GOOGLE_DETECT_URL =
    "https://translation.googleapis.com/language/translate/v2/detect";

  try {
    const params = new URLSearchParams({
      key: GEMINI_API_KEY,
      q: text,
    });

    const response = await fetch(`${GOOGLE_DETECT_URL}?${params}`, {
      method: "POST",
    });

    if (response.ok) {
      const data = await response.json();
      const detection = data?.data?.detections?.[0]?.[0];
      if (detection?.language) {
        return {
          language: detection.language,
          confidence: detection.confidence || null,
        };
      }
    }
  } catch (error) {
    console.warn("Google language detection failed:", error);
  }

  // Fallback to pattern matching
  return { language: guessLanguage(text), confidence: null };
}

// Text-to-Speech using Google TTS
export async function generateTTS(
  text: string,
  lang: string = "en",
): Promise<Blob> {
  const TTS_BASE = "https://translate.google.com/translate_tts";
  const url = `${TTS_BASE}?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://translate.google.com/",
      Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.status}`);
  }

  return response.blob();
}

// Helper functions
function getFallbackResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("translate") || lowerPrompt.includes("language")) {
    return "🌍 I can help with translation! Use the 'Translate' button above to translate text between languages.";
  }

  if (
    lowerPrompt.includes("speak") ||
    lowerPrompt.includes("voice") ||
    lowerPrompt.includes("audio")
  ) {
    return "🔊 You can use the 'Text-to-Speech' button to hear any text spoken aloud!";
  }

  if (
    lowerPrompt.includes("emergency") ||
    lowerPrompt.includes("help") ||
    lowerPrompt.includes("urgent")
  ) {
    return "🚨 For emergencies, please contact local emergency services. Use the translation and text-to-speech features to communicate your needs clearly.";
  }

  return `🤖 The AI chat service has reached its daily limit, but other features are still available! Try using:
• 🔊 Text-to-Speech to hear text spoken
• 🌍 Translation to convert between languages  
• 🎤 Speech-to-Text to convert voice to text
• 📸 Image-to-Text to extract text from photos

Your question: "${prompt.length > 100 ? prompt.substring(0, 100) + "..." : prompt}"`;
}

function guessLanguage(text: string): string | null {
  const s = (text || "").trim();
  if (!s) return null;
  if (/^[A-Za-z0-9\s'",.?!-]+$/.test(s)) return "en"; // basic ASCII -> English
  if (/[\u0400-\u04FF]/.test(s)) return "ru"; // Cyrillic
  if (/[\u0600-\u06FF]/.test(s)) return "ar"; // Arabic
  if (/[\u3040-\u30FF]/.test(s)) return "ja"; // Hiragana/Katakana
  if (/[\uAC00-\uD7AF]/.test(s)) return "ko"; // Hangul
  if (/[\u4E00-\u9FFF]/.test(s)) return "zh"; // CJK
  if (/[\u0900-\u097F]/.test(s)) return "hi"; // Devanagari
  if (/[\u0980-\u09FF]/.test(s)) return "bn"; // Bengali
  if (/[\u0C00-\u0C7F]/.test(s)) return "te"; // Telugu
  if (/[\u0B80-\u0BFF]/.test(s)) return "ta"; // Tamil
  return null;
}

// Chunk text for TTS (to handle long texts)
export function chunkText(text: string, maxLen: number = 180): string[] {
  const parts: string[] = [];
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?。！？])\s+/);

  for (const sentence of sentences) {
    if (sentence.length <= maxLen) {
      if (sentence.trim()) parts.push(sentence.trim());
    } else {
      let start = 0;
      while (start < sentence.length) {
        parts.push(sentence.slice(start, start + maxLen));
        start += maxLen;
      }
    }
  }

  return parts.length ? parts : [text];
}
