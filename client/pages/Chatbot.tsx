import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Send,
  Mic,
  Volume2,
  Languages,
  HandIcon,
  Menu,
  Home,
  Settings,
  Camera,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm Universal Bot. I can help you with text-to-speech, speech-to-text, translation, and more. How can I assist you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectConf, setDetectConf] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const [translating, setTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState<string | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [usecase, setUsecase] = useState<null | {
    key: string;
    title: string;
    description: string;
    context: string;
  }>(null);

  const guessLang = (t: string): string | null => {
    const s = (t || "").trim();
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
  };

  const readSetting = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: newMessage.content,
          context: usecase?.context ?? "",
          fast: readSetting<boolean>("settings.fastMode", false),
        }),
      });
      const data = await res.json();
      const replyText =
        typeof data?.reply === "string" && data.reply.trim()
          ? data.reply
          : "Sorry, I couldn't generate a reply.";

      let finalText = replyText;
      const storedAuto = readSetting<boolean>("settings.autoTranslate", false);
      const storedTL = readSetting<string | null>("settings.targetLang", null);
      const effectiveTarget = targetLang ?? (storedAuto ? storedTL : null);
      if (effectiveTarget) {
        try {
          const tr = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: replyText,
              source: "auto",
              target: effectiveTarget,
            }),
          });
          const trData = await tr.json();
          if (
            typeof trData?.translation === "string" &&
            trData.translation.trim()
          ) {
            finalText = trData.translation;
          }
        } catch {}
      }

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: finalText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (e) {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "There was an error contacting the server.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } finally {
      setIsSending(false);
    }
  };

  const toggleSpeechToText = async () => {
    const w = typeof window !== "undefined" ? (window as any) : null;
    if (!w) return;

    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInputMessage("Speech recognition not supported in this browser.");
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (e) {
      setInputMessage(
        "Microphone permission denied or blocked. Use Open Preview and allow microphone.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = detectedLang ? `${detectedLang}` : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalTranscript = "";
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscript += transcript + " ";
        }
      }
      if (finalTranscript.trim()) {
        setInputMessage(
          (prev) => (prev ? prev + " " : "") + finalTranscript.trim(),
        );
        finalTranscript = "";
      }
    };
    recognition.onerror = () => {
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    try {
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const pickVoice = (code: string | null) => {
    const w = typeof window !== "undefined" ? (window as any) : null;
    if (!w?.speechSynthesis) return null;
    const voices = w.speechSynthesis.getVoices?.() || [];
    if (!code) return voices[0] || null;
    const primary = voices.find((v: SpeechSynthesisVoice) =>
      v.lang?.toLowerCase().startsWith(code.toLowerCase()),
    );
    return primary || voices[0] || null;
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "hi", name: "Hindi" },
    { code: "ar", name: "Arabic" },
    { code: "pt", name: "Portuguese" },
    { code: "it", name: "Italian" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" },
    { code: "bn", name: "Bengali" },
    { code: "ur", name: "Urdu" },
    { code: "te", name: "Telugu" },
    { code: "ta", name: "Tamil" },
  ];

  const translateText = async (to: string, overrideText?: string) => {
    const text =
      (overrideText ?? inputMessage.trim()) ||
      [...messages].reverse().find((m) => m.isUser)?.content ||
      "";
    if (!text) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source: detectedLang || "auto",
          target: to,
        }),
      });
      const data = await res.json();
      const translated: string = data?.translation || "";
      if (translated) {
        const botResponse: Message = {
          id: (Date.now() + 2).toString(),
          content: translated,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botResponse]);
      }
    } finally {
      setTranslating(false);
    }
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const chunkText = (t: string, maxLen = 180) => {
    const parts: string[] = [];
    const sentences = t.replace(/\s+/g, " ").split(/(?<=[.!?。！？])\s+/);
    for (const s of sentences) {
      if (s.length <= maxLen) {
        if (s.trim()) parts.push(s.trim());
      } else {
        let start = 0;
        while (start < s.length) {
          parts.push(s.slice(start, start + maxLen));
          start += maxLen;
        }
      }
    }
    return parts.length ? parts : [t];
  };

  const playWithServerTTS = async (text: string, lang: string) => {
    const chunks = chunkText(text);
    audioRef.current?.pause?.();
    audioRef.current = new Audio();

    for (let i = 0; i < chunks.length; i++) {
      const q = encodeURIComponent(chunks[i]);
      const l = encodeURIComponent(lang);
      const res = await fetch(`/api/tts?text=${q}&lang=${l}`);
      if (!res.ok) throw new Error("tts-failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        if (!audioRef.current) {
          reject(new Error("no-audio"));
          return;
        }
        const a = audioRef.current;
        const cleanup = () => {
          a.onended = null;
          a.onerror = null;
          URL.revokeObjectURL(url);
        };
        a.src = url;
        a.onended = () => {
          cleanup();
          resolve();
        };
        a.onerror = () => {
          cleanup();
          reject(new Error("play-error"));
        };
        a.play().catch((e) => {
          cleanup();
          reject(e);
        });
      });
    }
  };

  const speakText = async () => {
    const w = typeof window !== "undefined" ? (window as any) : null;
    const textToSpeak =
      inputMessage.trim() ||
      [...messages].reverse().find((m) => !m.isUser)?.content ||
      "";
    if (!textToSpeak) return;

    const lang = detectedLang || guessLang(textToSpeak) || "en";
    setIsSpeaking(true);

    // Try server-based TTS first for broader language coverage
    try {
      await playWithServerTTS(textToSpeak, lang);
      setIsSpeaking(false);
      return;
    } catch {}

    // Fallback to browser SpeechSynthesis
    if (!w || !w.speechSynthesis) {
      setIsSpeaking(false);
      setInputMessage("Text-to-Speech not supported in this browser.");
      return;
    }
    try {
      w.speechSynthesis.cancel();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (detectedLang) utterance.lang = detectedLang;
    const v = pickVoice(detectedLang);
    if (v) utterance.voice = v;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    try {
      w.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  const SidebarContent = () => (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Navigation</h3>
        <div className="space-y-2">
          <Link to="/">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
        const w = typeof window !== "undefined" ? (window as any) : null;
        w?.speechSynthesis?.cancel?.();
        audioRef.current?.pause?.();
        const tracks = streamRef.current?.getTracks?.() || [];
        tracks.forEach((t) => t.stop());
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (!ocrOpen) {
      try {
        const tracks = streamRef.current?.getTracks?.() || [];
        tracks.forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) (videoRef.current as any).srcObject = null;
      } catch {}
    }
  }, [ocrOpen]);

  useEffect(() => {
    const text = inputMessage.trim();
    if (!text) {
      setDetectedLang(null);
      setDetectConf(null);
      return;
    }
    const guess = guessLang(text);
    if (text.length < 4 && guess) {
      setDetectedLang(guess);
      setDetectConf(null);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setDetecting(true);
        const res = await fetch("/api/detect-lang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        if (cancelled) return;
        let lang: string | null = data?.language ?? null;
        let conf: number | null =
          typeof data?.confidence === "number" ? data.confidence : null;
        if (!lang && guess) {
          lang = guess;
          conf = null;
        }
        setDetectedLang(lang);
        setDetectConf(conf);
      } catch {
        if (cancelled) return;
        const g = guessLang(text);
        setDetectedLang(g);
        setDetectConf(null);
      } finally {
        if (!cancelled) setDetecting(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [inputMessage]);

  const langName = (code: string | null) => {
    if (!code) return "Unknown";
    try {
      const dn = new Intl.DisplayNames(["en"], { type: "language" });
      return dn.of(code) || code;
    } catch {
      return code;
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 border-r bg-muted/10">
          <SidebarContent />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Sidebar Toggle */}
          <div className="md:hidden p-4 border-b">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>

          {/* Feature Buttons */}
          <div className="p-4 border-b">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={toggleSpeechToText}>
                <Mic className="mr-2 h-4 w-4" />
                {isRecording ? "Listening..." : "Speech-to-Text"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={speakText}
                disabled={isSpeaking}
              >
                <Volume2 className="mr-2 h-4 w-4" />
                {isSpeaking ? "Speaking..." : "Text-to-Speech"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={translating}>
                    <Languages className="mr-2 h-4 w-4" />
                    {(() => {
                      if (translating) return "Translating...";
                      const auto = readSetting<boolean>(
                        "settings.autoTranslate",
                        false,
                      );
                      const tl = readSetting<string | null>(
                        "settings.targetLang",
                        null,
                      );
                      const eff = targetLang ?? (auto ? tl : null);
                      return `Translate${eff ? `: ${eff}` : ""}`;
                    })()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Translate to</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTargetLang(null)}>
                    Off (disable auto-translate)
                  </DropdownMenuItem>
                  {languages.map((l) => (
                    <DropdownMenuItem
                      key={l.code}
                      onClick={() => {
                        setTargetLang(l.code);
                      }}
                    >
                      {l.name} ({l.code})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Assistive Chatbots
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-80 overflow-auto">
                  <DropdownMenuLabel>Select a preset</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {[
                    {
                      key: "legal_aid",
                      title: "Legal Aid (Immigrants)",
                      description:
                        "Translates legal terms, explains rights, helps with forms.",
                      context:
                        "You are a Legal Aid Chatbot for Immigrants. Translate legal terms into user's language, explain rights simply, and guide form-filling step-by-step with clear, neutral, non-judgmental tone.",
                    },
                    {
                      key: "healthcare_rural",
                      title: "Healthcare (Rural)",
                      description:
                        "Understands spoken symptoms, gives basic advice, route to clinics.",
                      context:
                        "You are a Healthcare Assistant for rural communities. Understand brief symptom descriptions, provide general advice and urgency guidance, and suggest contacting local clinics. Avoid diagnoses; include disclaimers.",
                    },
                    {
                      key: "digital_elderly",
                      title: "Digital Tutor (Elderly)",
                      description:
                        "Teaches smartphone/app basics with simple voice-friendly steps.",
                      context:
                        "You are a Digital Literacy Tutor for elderly users. Use very simple language and small steps to teach how to use phones, apps, and online services. Offer voice-friendly instructions and reassurance.",
                    },
                    {
                      key: "edu_support",
                      title: "Education (Non‑Native)",
                      description:
                        "Translates content, explains homework in simple terms.",
                      context:
                        "You are an Educational Support Bot for non-native students. Translate academic content and explain concepts in simple language with examples.",
                    },
                    {
                      key: "jobs_low_literacy",
                      title: "Job Assistant",
                      description:
                        "Helps write resumes, fill applications, prep interviews.",
                      context:
                        "You are a Job Application Assistant for low-literacy users. Help write resumes, fill job forms, and prepare interview answers in user's language with templates.",
                    },
                    {
                      key: "gov_navigator",
                      title: "Gov Services",
                      description:
                        "Explains IDs, benefits, housing processes in simple terms.",
                      context:
                        "You are a Government Services Navigator. Explain how to apply for IDs, benefits, or housing in clear steps, and define terms simply.",
                    },
                    {
                      key: "womens_rights",
                      title: "Women’s Rights",
                      description:
                        "Private multilingual guidance on health, rights, safety.",
                      context:
                        "You are a Women’s Rights Information Bot. Provide private, multilingual guidance on health, rights, education, and safety. Be sensitive and supportive.",
                    },
                    {
                      key: "mental_health",
                      title: "Mental Health",
                      description:
                        "Offers support, breathing exercises, resources.",
                      context:
                        "You are a Mental Health Companion. Offer supportive, non-clinical conversation, simple coping exercises, and resources. Not a substitute for professional help.",
                    },
                    {
                      key: "accessibility",
                      title: "Accessibility (Deaf/HoH)",
                      description:
                        "Captions, read-aloud, and clear text guidance.",
                      context:
                        "You are an Accessibility Assistant for Deaf/HoH users. Provide clear text summaries and support TTS/STT use. Keep sentences concise.",
                    },
                    {
                      key: "emergency_refugee",
                      title: "Emergency (Refugees)",
                      description:
                        "Local emergency info, shelters, medical help.",
                      context:
                        "You are an Emergency Response Bot for refugees/disaster zones. Provide location-appropriate emergency info, shelters, and medical contacts in user's language.",
                    },
                  ].map((uc) => (
                    <DropdownMenuItem
                      key={uc.key}
                      onClick={() => {
                        setUsecase(uc);
                        const info: Message = {
                          id: (Date.now() + 3).toString(),
                          content: `Mode set: ${uc.title}. ${uc.description}`,
                          isUser: false,
                          timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, info]);
                      }}
                    >
                      {uc.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={ocrOpen} onOpenChange={setOcrOpen}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOcrOpen(true)}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Image to Text
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Image to Text</DialogTitle>
                    <DialogDescription>
                      Open your camera, capture, and extract text.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <video
                      ref={videoRef}
                      className="w-full rounded border"
                      autoPlay
                      playsInline
                      muted
                    ></video>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const constraints: MediaStreamConstraints = {
                              video: { facingMode: { ideal: "environment" } },
                              audio: false,
                            };
                            const stream =
                              await navigator.mediaDevices.getUserMedia(
                                constraints,
                              );
                            streamRef.current = stream;
                            if (videoRef.current) {
                              videoRef.current.srcObject = stream;
                              try {
                                await videoRef.current.play();
                              } catch {}
                            }
                          } catch (e) {
                            // ignore
                          }
                        }}
                      >
                        Start Camera
                      </Button>
                      <Button
                        onClick={async () => {
                          const video = videoRef.current;
                          if (!video) return;
                          const canvas = document.createElement("canvas");
                          canvas.width = video.videoWidth || 640;
                          canvas.height = video.videoHeight || 480;
                          const ctx = canvas.getContext("2d");
                          if (!ctx) return;
                          ctx.drawImage(
                            video,
                            0,
                            0,
                            canvas.width,
                            canvas.height,
                          );
                          const dataUrl = canvas.toDataURL("image/png");
                          setOcrLoading(true);
                          try {
                            // Load Tesseract.js from CDN lazily
                            if (!(window as any).Tesseract) {
                              await new Promise<void>((resolve, reject) => {
                                const s = document.createElement("script");
                                s.src =
                                  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
                                s.onload = () => resolve();
                                s.onerror = () =>
                                  reject(new Error("Failed to load OCR"));
                                document.head.appendChild(s);
                              });
                            }
                            const { Tesseract } = window as any;
                            const ocr = readSetting<string>(
                              "settings.ocrLang",
                              "eng",
                            );
                            const result = await Tesseract.recognize(
                              dataUrl,
                              ocr,
                            );
                            const text = result?.data?.text?.trim();
                            if (text)
                              setInputMessage(
                                (prev) => (prev ? prev + " " : "") + text,
                              );
                          } catch {}
                          setOcrLoading(false);
                        }}
                        disabled={ocrLoading}
                      >
                        {ocrLoading ? "Processing..." : "Capture & Extract"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const tracks = streamRef.current?.getTracks?.() || [];
                          tracks.forEach((t) => t.stop());
                          streamRef.current = null;
                          if (videoRef.current)
                            (videoRef.current as any).srcObject = null;
                        }}
                      >
                        Stop Camera
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Link to="/sign">
                <Button variant="outline" size="sm">
                  <HandIcon className="mr-2 h-4 w-4" />
                  Sign Language
                </Button>
              </Link>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  <Card
                    className={`max-w-[80%] ${message.isUser ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    <CardContent className="p-3">
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${message.isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
              <span>
                Detected language:{" "}
                {detecting
                  ? "Detecting..."
                  : `${langName(detectedLang)}${detectedLang ? ` (${detectedLang})` : ""}`}
                {detectConf != null
                  ? ` • ${(detectConf * 100).toFixed(0)}%`
                  : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={isSending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
