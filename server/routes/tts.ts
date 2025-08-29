import type { RequestHandler } from "express";

// NOTE: This proxies Google Translate's TTS endpoint to avoid CORS and set required headers.
// It supports many languages using the `tl` (target language) param, e.g., 'en', 'fr', 'es', etc.
// This is intended for short text segments (<= 200 chars). Clients should chunk longer text.

const TTS_BASE = "https://translate.google.com/translate_tts";

export const handleTTS: RequestHandler = async (req, res) => {
  try {
    const textRaw = (req.query.text ?? req.body?.text) as string | undefined;
    const langRaw = (req.query.lang ??
      req.query.tl ??
      req.body?.lang ??
      req.body?.tl) as string | undefined;

    const text = (textRaw || "").toString().trim();
    const lang = (langRaw || "en").toString().trim();

    if (!text) {
      res.status(400).json({ error: "Missing text" });
      return;
    }
    if (!lang) {
      res.status(400).json({ error: "Missing lang" });
      return;
    }

    const url = `${TTS_BASE}?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;

    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          // A common desktop UA string. Google may require a UA header for this endpoint.
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
        Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => "");
      res
        .status(502)
        .json({
          error: "Upstream TTS failed",
          status: upstream.status,
          detail: txt,
        });
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");

    // Stream the audio response directly to the client
    if (upstream.body) {
      upstream.body
        .pipeTo(
          new WritableStream({
            write(chunk) {
              res.write(chunk);
            },
            close() {
              res.end();
            },
            abort() {
              try {
                res.end();
              } catch {}
            },
          }),
        )
        .catch(() => {
          try {
            res.end();
          } catch {}
        });
    } else {
      const buf = await upstream.arrayBuffer();
      res.end(Buffer.from(buf));
    }
  } catch (err) {
    res.status(500).json({ error: "Unexpected server error" });
  }
};
