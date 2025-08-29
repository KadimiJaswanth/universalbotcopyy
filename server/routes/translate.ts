import type { RequestHandler } from "express";

const DEFAULT_BASE =
  process.env.LIBRETRANSLATE_URL || "https://libretranslate.de";

export const handleTranslate: RequestHandler = async (req, res) => {
  try {
    const text: unknown = req.body?.text;
    const source: unknown = req.body?.source; // e.g., "en" or "auto"
    const target: unknown = req.body?.target; // e.g., "es"

    if (typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "Invalid text" });
      return;
    }
    if (typeof target !== "string" || !target.trim()) {
      res.status(400).json({ error: "Invalid target language" });
      return;
    }

    const src = typeof source === "string" && source.trim() ? source : "auto";

    // Try LibreTranslate first
    try {
      const ltRes = await fetch(`${DEFAULT_BASE}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: src, target, format: "text" }),
      });
      if (ltRes.ok) {
        const data = await ltRes.json();
        const translated = data?.translatedText ?? data?.translation ?? "";
        return res.json({ translation: translated });
      }
    } catch {}

    // Fallback to Lingva (community Google wrapper)
    try {
      const url = `https://lingva.ml/api/v1/${encodeURIComponent(src)}/${encodeURIComponent(target)}/${encodeURIComponent(text)}`;
      const lgRes = await fetch(url);
      if (lgRes.ok) {
        const data = await lgRes.json();
        const translated = data?.translation ?? data?.translatedText ?? "";
        return res.json({ translation: translated });
      }
    } catch {}

    res.status(502).json({ error: "Translation failed" });
  } catch {
    res.status(500).json({ error: "Unexpected server error" });
  }
};
