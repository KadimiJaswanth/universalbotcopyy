import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

const LANGS = [
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

export default function Settings() {
  const { theme, setTheme } = useTheme();

  const [preferredInputLang, setPreferredInputLang] = useLocalStorage<string>(
    "settings.inputLang",
    "en",
  );
  const [preferredTargetLang, setPreferredTargetLang] = useLocalStorage<string>(
    "settings.targetLang",
    "en",
  );
  const [autoTranslate, setAutoTranslate] = useLocalStorage<boolean>(
    "settings.autoTranslate",
    false,
  );
  const [ttsAutoPlay, setTtsAutoPlay] = useLocalStorage<boolean>(
    "settings.ttsAutoPlay",
    false,
  );
  const [fastMode, setFastMode] = useLocalStorage<boolean>(
    "settings.fastMode",
    false,
  );
  const [ocrLang, setOcrLang] = useLocalStorage<string>(
    "settings.ocrLang",
    "eng",
  );
  const [fontScale, setFontScale] = useLocalStorage<number>(
    "settings.fontScale",
    1,
  );

  useEffect(() => {
    const base = 16;
    const px = Math.max(14, Math.min(20, Math.round(base * fontScale)));
    document.documentElement.style.fontSize = `${px}px`;
  }, [fontScale]);

  // Browser voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useLocalStorage<string>(
    "settings.ttsVoiceURI",
    "",
  );
  useEffect(() => {
    const w = window as any;
    const load = () => setVoices(w.speechSynthesis?.getVoices?.() || []);
    load();
    w.speechSynthesis?.addEventListener?.("voiceschanged", load);
    return () =>
      w.speechSynthesis?.removeEventListener?.("voiceschanged", load);
  }, []);
  const selectedVoice = useMemo(
    () => voices.find((v) => v.voiceURI === voiceURI) || null,
    [voices, voiceURI],
  );

  const testSpeak = () => {
    try {
      const u = new SpeechSynthesisUtterance(
        "This is a test of your selected voice.",
      );
      if (selectedVoice) u.voice = selectedVoice;
      (window as any).speechSynthesis?.speak(u);
    } catch {}
  };

  // Permissions
  const [camStatus, setCamStatus] = useState<string>("unknown");
  const [micStatus, setMicStatus] = useState<string>("unknown");
  const checkPermissions = async () => {
    try {
      const perms = (navigator as any).permissions;
      if (perms?.query) {
        const c = await perms
          .query({ name: "camera" as any })
          .catch(() => null);
        const m = await perms
          .query({ name: "microphone" as any })
          .catch(() => null);
        if (c?.state) setCamStatus(c.state);
        if (m?.state) setMicStatus(m.state);
      }
    } catch {}
  };
  useEffect(() => {
    checkPermissions();
  }, []);

  const requestCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach((t) => t.stop());
      setCamStatus("granted");
    } catch {
      setCamStatus("denied");
    }
  };
  const requestMic = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      setMicStatus("granted");
    } catch {
      setMicStatus("denied");
    }
  };

  const clearLocalData = () => {
    try {
      const keep = ["theme"];
      const keys = Object.keys(localStorage);
      for (const k of keys) if (!keep.includes(k)) localStorage.removeItem(k);
    } catch {}
  };

  return (
    <Layout>
      <section className="py-8">
        <div className="container mx-auto px-4 space-y-6">
          <h1 className="text-2xl font-bold">Settings</h1>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Theme</Label>
                  <div className="mt-2">
                    <Select
                      value={theme as string}
                      onValueChange={setTheme as any}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Text size</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFontScale((s) =>
                          Math.max(0.9, +(s - 0.1).toFixed(2)),
                        )
                      }
                    >
                      A-
                    </Button>
                    <div className="text-sm text-muted-foreground w-24 text-center">
                      {Math.round(fontScale * 100)}%
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFontScale((s) =>
                          Math.min(1.3, +(s + 0.1).toFixed(2)),
                        )
                      }
                    >
                      A+
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Language & Speech</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Preferred input language</Label>
                  <div className="mt-2">
                    <Select
                      value={preferredInputLang}
                      onValueChange={setPreferredInputLang}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGS.map((l) => (
                          <SelectItem key={l.code} value={l.code}>
                            {l.name} ({l.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Auto-translate replies to</Label>
                  <div className="mt-2">
                    <Select
                      value={preferredTargetLang}
                      onValueChange={setPreferredTargetLang}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGS.map((l) => (
                          <SelectItem key={l.code} value={l.code}>
                            {l.name} ({l.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between rounded border p-3">
                  <div>
                    <Label>Enable auto-translate</Label>
                    <p className="text-xs text-muted-foreground">
                      Translate bot replies automatically.
                    </p>
                  </div>
                  <Switch
                    checked={autoTranslate}
                    onCheckedChange={setAutoTranslate}
                  />
                </div>
                <div className="flex items-center justify-between rounded border p-3">
                  <div>
                    <Label>Auto-play TTS</Label>
                    <p className="text-xs text-muted-foreground">
                      Speak bot replies automatically.
                    </p>
                  </div>
                  <Switch
                    checked={ttsAutoPlay}
                    onCheckedChange={setTtsAutoPlay}
                  />
                </div>
              </div>
              <Separator />
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>TTS Voice</Label>
                  <div className="mt-2">
                    <Select value={voiceURI} onValueChange={setVoiceURI}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voices.length === 0 ? (
                          <SelectItem value="system-default" disabled>
                            System default
                          </SelectItem>
                        ) : (
                          voices.map((v) => (
                            <SelectItem key={v.voiceURI} value={v.voiceURI}>
                              {v.name} {v.lang ? `(${v.lang})` : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={testSpeak}>
                        Test Voice
                      </Button>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>OCR Language</Label>
                  <div className="mt-2">
                    <Select value={ocrLang} onValueChange={setOcrLang}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select OCR language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eng">English (eng)</SelectItem>
                        <SelectItem value="spa">Spanish (spa)</SelectItem>
                        <SelectItem value="fra">French (fra)</SelectItem>
                        <SelectItem value="deu">German (deu)</SelectItem>
                        <SelectItem value="hin">Hindi (hin)</SelectItem>
                        <SelectItem value="ara">Arabic (ara)</SelectItem>
                        <SelectItem value="ben">Bengali (ben)</SelectItem>
                        <SelectItem value="tam">Tamil (tam)</SelectItem>
                        <SelectItem value="tel">Telugu (tel)</SelectItem>
                        <SelectItem value="jpn">Japanese (jpn)</SelectItem>
                        <SelectItem value="kor">Korean (kor)</SelectItem>
                        <SelectItem value="chi_sim">
                          Chinese Simplified (chi_sim)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Used by Image to Text.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded border p-3">
                <div>
                  <Label>Fast mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Shorter, quicker AI replies (lower token limit).
                  </p>
                </div>
                <Switch checked={fastMode} onCheckedChange={setFastMode} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Camera</div>
                      <div className="text-xs text-muted-foreground">
                        Status: {camStatus}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={requestCamera}>
                      Request
                    </Button>
                  </div>
                </div>
                <div className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Microphone</div>
                      <div className="text-xs text-muted-foreground">
                        Status: {micStatus}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={requestMic}>
                      Request
                    </Button>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={checkPermissions}>
                Refresh status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="destructive" onClick={clearLocalData}>
                Clear local settings
              </Button>
              <p className="text-xs text-muted-foreground">
                This clears preferences stored in your browser. Server keys are
                not affected.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
