import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleChat } from "./routes/chat";
import { handleDetectLang } from "./routes/detect-lang";
import { handleTranslate } from "./routes/translate";
import { handleTTS } from "./routes/tts";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  app.post("/api/chat", handleChat);
  app.post("/api/detect-lang", handleDetectLang);
  app.post("/api/translate", handleTranslate);

  // TTS proxy (GET or POST)
  app.get("/api/tts", handleTTS);
  app.post("/api/tts", handleTTS);

  return app;
}
