import type { RequestHandler } from "express";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

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
        ...(fast
          ? {
              generationConfig: {
                maxOutputTokens: 128,
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
              },
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
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
