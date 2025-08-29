import type { RequestHandler } from "express";

const BASES = [
  process.env.LIBRETRANSLATE_URL || "https://libretranslate.de",
  "https://libretranslate.com",
  "https://translate.argosopentech.com",
];

async function tryLibreDetect(base: string, text: string) {
  // Try x-www-form-urlencoded first (widely supported)
  try {
    const form = new URLSearchParams();
    form.set("q", text);
    const res = await fetch(`${base}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (res.ok) {
      const detections = await res.json();
      const list = Array.isArray(detections)
        ? detections
        : Array.isArray((detections as any)?.detections)
          ? (detections as any).detections
          : [];
      const top = list.reduce(
        (a: any, b: any) => (a && a.confidence > b.confidence ? a : b),
        list[0],
      );
      if (top?.language)
        return { language: top.language, confidence: top.confidence ?? null };
    }
  } catch {}

  // Fallback to JSON payload
  try {
    const res = await fetch(`${base}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text }),
    });
    if (res.ok) {
      const detections = await res.json();
      const list = Array.isArray(detections)
        ? detections
        : Array.isArray((detections as any)?.detections)
          ? (detections as any).detections
          : [];
      const top = list.reduce(
        (a: any, b: any) => (a && a.confidence > b.confidence ? a : b),
        list[0],
      );
      if (top?.language)
        return { language: top.language, confidence: top.confidence ?? null };
    }
  } catch {}

  return null;
}

async function tryLingvaDetect(text: string) {
  try {
    // Use auto->en translation and infer detected source if provided
    const url = `https://lingva.ml/api/v1/auto/en/${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const lang = (data?.info?.from || data?.src || data?.source || null) as
      | string
      | null;
    if (lang) return { language: lang, confidence: null };
  } catch {}
  return null;
}

export const handleDetectLang: RequestHandler = async (req, res) => {
  try {
    const text: unknown = req.body?.text;
    if (typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "Invalid text" });
      return;
    }

    // Try multiple LibreTranslate hosts
    for (const base of BASES) {
      const result = await tryLibreDetect(base, text);
      if (result?.language) {
        res.json(result);
        return;
      }
    }

    // Fallback to Lingva
    const lingva = await tryLingvaDetect(text);
    if (lingva?.language) {
      res.json(lingva);
      return;
    }

    // Graceful fallback
    res.json({ language: null, confidence: null });
  } catch {
    // Never 500 for network hiccups; respond gracefully
    res.json({ language: null, confidence: null });
  }
};
