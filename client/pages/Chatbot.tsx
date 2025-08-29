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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  sendChatMessage,
  translateText,
  detectLanguage,
  generateTTS,
  chunkText,
} from "@/lib/api";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function Chatbot() {
  const messageIdRef = useRef(1);
  const getNextMessageId = () => `msg-${++messageIdRef.current}`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
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
  const [ocrTranslateLang, setOcrTranslateLang] = useState<string | null>(null);
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
      id: getNextMessageId(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsSending(true);

    try {
      const data = await sendChatMessage(
        newMessage.content,
        usecase?.context ?? "",
        readSetting<boolean>("settings.fastMode", true),
      );

      const replyText = data.reply || "Sorry, I couldn't generate a reply.";

      let finalText = replyText;
      const storedAuto = readSetting<boolean>("settings.autoTranslate", false);
      const storedTL = readSetting<string | null>("settings.targetLang", null);
      const effectiveTarget = targetLang ?? (storedAuto ? storedTL : null);
      if (effectiveTarget) {
        try {
          const trData = await translateText(
            replyText,
            "auto",
            effectiveTarget,
          );
          if (trData.translation && trData.translation.trim()) {
            finalText = trData.translation;
          }
        } catch (error) {
          finalText = replyText + " [Auto-translation failed]";
        }
      }

      const botResponse: Message = {
        id: getNextMessageId(),
        content: finalText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (e) {
      const botResponse: Message = {
        id: getNextMessageId(),
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
      const data = await translateText(text, detectedLang || "auto", to);

      if (data.translation) {
        const botResponse: Message = {
          id: getNextMessageId(),
          content: data.translation,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botResponse]);
      } else {
        const botResponse: Message = {
          id: getNextMessageId(),
          content: "❌ No translation received. Please try again.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botResponse]);
      }
    } catch (error) {
      const botResponse: Message = {
        id: getNextMessageId(),
        content: "❌ Translation service unavailable. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
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

  const playWithTTS = async (text: string, lang: string) => {
    const chunks = chunkText(text);
    audioRef.current?.pause?.();
    audioRef.current = new Audio();

    for (let i = 0; i < chunks.length; i++) {
      const blob = await generateTTS(chunks[i], lang);
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

    // Try Google TTS first for broader language coverage
    try {
      await playWithTTS(textToSpeak, lang);
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
        const data = await detectLanguage(text);
        if (cancelled) return;
        let lang: string | null = data?.language ?? null;
        let conf: number | null = data?.confidence;
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

  // Advanced image preprocessing function for better OCR quality
  const preprocessImageForOCR = async (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        // Scale up for better quality (3x instead of 2x)
        const scale = 3;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Fill with white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image at scaled size
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Advanced preprocessing: threshold-based binarization
        for (let i = 0; i < data.length; i += 4) {
          const gray =
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

          // Adaptive threshold: make text black, background white
          const threshold = 130; // Adjust this value for different image types
          const processed = gray < threshold ? 0 : 255; // Black text, white background

          data[i] = processed; // Red
          data[i + 1] = processed; // Green
          data[i + 2] = processed; // Blue
          // Alpha remains the same
        }

        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);

        // Return as high-quality PNG for better text preservation
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = dataUrl;
    });
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
                      title: "Women���s Rights",
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
                          id: getNextMessageId(),
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
                    <DialogTitle>Image to Text & Translation</DialogTitle>
                    <DialogDescription>
                      Capture/upload image, extract text, and optionally
                      translate it.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mb-4 space-y-3">
                    <div>
                      <Label>Translate extracted text to:</Label>
                      <div className="mt-2">
                        <Select
                          value={ocrTranslateLang || "none"}
                          onValueChange={(value) =>
                            setOcrTranslateLang(value === "none" ? null : value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="No translation (extract only)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No translation</SelectItem>
                            {languages.map((l) => (
                              <SelectItem key={l.code} value={l.code}>
                                {l.name} ({l.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current OCR language:{" "}
                        {readSetting<string>("settings.ocrLang", "en")} (change
                        in Settings)
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <video
                      ref={videoRef}
                      className="w-full rounded border"
                      autoPlay
                      playsInline
                      muted
                    ></video>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Use camera or upload an image file
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="mb-2"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          setOcrLoading(true);

                          const showMessage = (content: string) => {
                            const msg: Message = {
                              id: getNextMessageId(),
                              content,
                              isUser: false,
                              timestamp: new Date(),
                            };
                            setMessages((prev) => [...prev, msg]);
                          };

                          try {
                            // Convert file to data URL
                            const dataUrl = await new Promise<string>(
                              (resolve) => {
                                const reader = new FileReader();
                                reader.onload = (e) =>
                                  resolve(e.target?.result as string);
                                reader.readAsDataURL(file);
                              },
                            );

                            const ocrLang = readSetting<string>(
                              "settings.ocrLang",
                              "en",
                            );

                            // Map language codes for Tesseract
                            const tesseractLangMap: Record<string, string> = {
                              en: "eng",
                              es: "spa",
                              fr: "fra",
                              de: "deu",
                              it: "ita",
                              pt: "por",
                              ru: "rus",
                              ja: "jpn",
                              ko: "kor",
                              zh: "chi_sim",
                              ar: "ara",
                              hi: "hin",
                              th: "tha",
                              vi: "vie",
                              tr: "tur",
                              pl: "pol",
                              nl: "nld",
                              sv: "swe",
                              da: "dan",
                              fi: "fin",
                              cs: "ces",
                              hu: "hun",
                              el: "ell",
                              bg: "bul",
                              hr: "hrv",
                              sl: "slv",
                              ta: "tam",
                              te: "tel",
                              bn: "ben",
                              ur: "urd",
                            };

                            const tesseractLang =
                              tesseractLangMap[ocrLang] || "eng";

                            // Load Tesseract.js if needed
                            if (!(window as any).Tesseract) {
                              showMessage("📦 Loading OCR engine...");
                              await new Promise<void>((resolve, reject) => {
                                const script = document.createElement("script");
                                script.src =
                                  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
                                script.onload = () => resolve();
                                script.onerror = () =>
                                  reject(new Error("Failed to load OCR"));
                                document.head.appendChild(script);
                              });
                            }

                            // Preprocess uploaded image for better OCR
                            showMessage("🔧 Enhancing uploaded image...");
                            const preprocessedImage =
                              await preprocessImageForOCR(dataUrl);

                            showMessage("🔍 Processing enhanced image...");
                            const { Tesseract } = window as any;

                            const result = await Tesseract.recognize(
                              preprocessedImage,
                              tesseractLang,
                              {
                                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                                tessedit_ocr_engine_mode:
                                  Tesseract.OEM.LSTM_ONLY,
                                preserve_interword_spaces: "1",
                                tessedit_char_blacklist: "|",
                              },
                            );

                            let extractedText = result?.data?.text?.trim();

                            // Clean up the extracted text
                            if (extractedText) {
                              extractedText = extractedText
                                .replace(/\s+/g, " ") // Multiple spaces to single space
                                .replace(/[^\w\s.,!?;:()\-'"]/g, " ") // Remove most special characters but keep common punctuation
                                .replace(/\s+/g, " ") // Clean up any double spaces created
                                .trim();
                            }

                            if (extractedText && extractedText.length > 2) {
                              // Add extracted text to input
                              setInputMessage(
                                (prev) =>
                                  (prev ? prev + " " : "") + extractedText,
                              );

                              // Show original extracted text
                              showMessage(
                                `📄 Text from file (${ocrLang}): "${extractedText}"`,
                              );

                              // Auto-translate if target language is selected
                              if (
                                ocrTranslateLang &&
                                ocrTranslateLang !== ocrLang
                              ) {
                                showMessage("🌍 Translating extracted text...");

                                try {
                                  const translateRes = await fetch(
                                    "/api/translate",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        text: extractedText,
                                        source: ocrLang,
                                        target: ocrTranslateLang,
                                      }),
                                    },
                                  );

                                  const translateData =
                                    await translateRes.json();

                                  if (
                                    translateRes.ok &&
                                    translateData.translation
                                  ) {
                                    const translatedText =
                                      translateData.translation.trim();

                                    // Add translated text to input
                                    setInputMessage(
                                      (prev) => prev + " → " + translatedText,
                                    );

                                    // Show translated result
                                    showMessage(
                                      `✅ Translated to ${ocrTranslateLang}: "${translatedText}"`,
                                    );
                                  } else {
                                    showMessage(
                                      "❌ Translation failed. Using original text only.",
                                    );
                                  }
                                } catch {
                                  showMessage(
                                    "❌ Translation service unavailable. Using original text only.",
                                  );
                                }
                              } else {
                                showMessage(
                                  `✅ File processing complete! Ready to send.`,
                                );
                              }
                            } else {
                              showMessage(
                                "⚠️ No clear text detected in uploaded image.",
                              );
                            }
                          } catch (error) {
                            showMessage("❌ Failed to process uploaded image.");
                          } finally {
                            setOcrLoading(false);
                            // Clear the file input
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
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

                          // Limit image size to reduce payload
                          const maxWidth = 800;
                          const maxHeight = 600;
                          let { videoWidth = 640, videoHeight = 480 } = video;

                          // Scale down if too large
                          if (
                            videoWidth > maxWidth ||
                            videoHeight > maxHeight
                          ) {
                            const scale = Math.min(
                              maxWidth / videoWidth,
                              maxHeight / videoHeight,
                            );
                            videoWidth *= scale;
                            videoHeight *= scale;
                          }

                          canvas.width = videoWidth;
                          canvas.height = videoHeight;
                          const ctx = canvas.getContext("2d");
                          if (!ctx) return;
                          ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

                          // Use JPEG with compression for smaller file size
                          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                          setOcrLoading(true);

                          const showMessage = (
                            content: string,
                            isSuccess: boolean = false,
                          ) => {
                            const msg: Message = {
                              id: getNextMessageId(),
                              content,
                              isUser: false,
                              timestamp: new Date(),
                            };
                            setMessages((prev) => [...prev, msg]);
                          };

                          try {
                            const ocrLang = readSetting<string>(
                              "settings.ocrLang",
                              "en",
                            );

                            // Map language codes for Tesseract
                            const tesseractLangMap: Record<string, string> = {
                              en: "eng",
                              es: "spa",
                              fr: "fra",
                              de: "deu",
                              it: "ita",
                              pt: "por",
                              ru: "rus",
                              ja: "jpn",
                              ko: "kor",
                              zh: "chi_sim",
                              ar: "ara",
                              hi: "hin",
                              th: "tha",
                              vi: "vie",
                              tr: "tur",
                              pl: "pol",
                              nl: "nld",
                              sv: "swe",
                              da: "dan",
                              fi: "fin",
                              cs: "ces",
                              hu: "hun",
                              el: "ell",
                              bg: "bul",
                              hr: "hrv",
                              sl: "slv",
                              ta: "tam",
                              te: "tel",
                              bn: "ben",
                              ur: "urd",
                            };

                            const tesseractLang =
                              tesseractLangMap[ocrLang] || "eng";

                            // Load Tesseract.js dynamically
                            if (!(window as any).Tesseract) {
                              showMessage("📦 Loading OCR engine...");
                              await new Promise<void>((resolve, reject) => {
                                const script = document.createElement("script");
                                script.src =
                                  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
                                script.onload = () => resolve();
                                script.onerror = () =>
                                  reject(new Error("Failed to load OCR"));
                                document.head.appendChild(script);
                              });
                            }

                            // Preprocess image for better OCR
                            showMessage("🔧 Enhancing image quality...");
                            const preprocessedImage =
                              await preprocessImageForOCR(dataUrl);

                            showMessage("🔍 Processing enhanced image...");
                            const { Tesseract } = window as any;

                            const result = await Tesseract.recognize(
                              preprocessedImage,
                              tesseractLang,
                              {
                                logger: (m: any) => {
                                  if (m.status === "recognizing text") {
                                    const progress = Math.round(
                                      m.progress * 100,
                                    );
                                    console.log(`OCR Progress: ${progress}%`);
                                  }
                                },
                                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                                tessedit_ocr_engine_mode:
                                  Tesseract.OEM.LSTM_ONLY,
                                preserve_interword_spaces: "1",
                                tessedit_char_blacklist: "|",
                              },
                            );

                            let extractedText = result?.data?.text?.trim();

                            // Clean up the extracted text
                            if (extractedText) {
                              extractedText = extractedText
                                .replace(/\s+/g, " ") // Multiple spaces to single space
                                .replace(/[^\w\s.,!?;:()\-'"]/g, " ") // Remove most special characters but keep common punctuation
                                .replace(/\s+/g, " ") // Clean up any double spaces created
                                .trim();
                            }

                            if (extractedText && extractedText.length > 2) {
                              // Add extracted text to input
                              setInputMessage(
                                (prev) =>
                                  (prev ? prev + " " : "") + extractedText,
                              );

                              // Show original extracted text
                              showMessage(
                                `📄 Original text (${ocrLang}): "${extractedText}"`,
                              );

                              // Auto-translate if target language is selected
                              if (
                                ocrTranslateLang &&
                                ocrTranslateLang !== ocrLang
                              ) {
                                showMessage("🌍 Translating extracted text...");

                                try {
                                  const translateRes = await fetch(
                                    "/api/translate",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        text: extractedText,
                                        source: ocrLang,
                                        target: ocrTranslateLang,
                                      }),
                                    },
                                  );

                                  const translateData =
                                    await translateRes.json();

                                  if (
                                    translateRes.ok &&
                                    translateData.translation
                                  ) {
                                    const translatedText =
                                      translateData.translation.trim();

                                    // Add translated text to input
                                    setInputMessage(
                                      (prev) => prev + " → " + translatedText,
                                    );

                                    // Show translated result
                                    showMessage(
                                      `✅ Translated to ${ocrTranslateLang}: "${translatedText}"`,
                                    );
                                  } else {
                                    showMessage(
                                      "❌ Translation failed. Using original text only.",
                                    );
                                  }
                                } catch {
                                  showMessage(
                                    "❌ Translation service unavailable. Using original text only.",
                                  );
                                }
                              } else {
                                showMessage(
                                  `✅ Text extraction complete! Ready to send.`,
                                );
                              }
                            } else {
                              showMessage(
                                "⚠️ No clear text detected. Try with better lighting or clearer text.",
                              );
                            }
                          } catch (error) {
                            console.error("OCR Error:", error);
                            showMessage(
                              "❌ OCR failed. Please ensure the image has clear, readable text.",
                            );
                          }
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
