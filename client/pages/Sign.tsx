import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Hands: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

function useScript(src: string) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let s = document.querySelector(
      `script[src="${src}"]`,
    ) as HTMLScriptElement | null;
    if (s && (s as any)._loaded) {
      setLoaded(true);
      return;
    }
    if (!s) {
      s = document.createElement("script");
      s.src = src;
      s.async = true;
      (s as any)._loaded = false;
      s.onload = () => {
        (s as any)._loaded = true;
        setLoaded(true);
      };
      s.onerror = () => setLoaded(false);
      document.head.appendChild(s);
    } else {
      s.onload = () => setLoaded(true);
    }
  }, [src]);
  return loaded;
}

export default function Sign() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [recognized, setRecognized] = useState("...");
  const [loading, setLoading] = useState(false);

  const handsLoaded = useScript(
    "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
  );
  const drawLoaded = useScript(
    "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
  );

  const recognizeSign = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return "...";
    const wrist = landmarks[0];
    const idx = landmarks[8];
    const mid = landmarks[12];
    const ring = landmarks[16];
    const pinky = landmarks[20];
    // Demo heuristics similar to provided Python
    const allBelow = [idx, mid, ring, pinky].every((lm) => lm.y > wrist.y);
    const allAbove = [idx, mid, ring, pinky].every((lm) => lm.y < wrist.y);
    if (allBelow) return "Hello"; // fist-like
    if (allAbove) return "Hi"; // open hand up
    return "...";
  };

  const drawResults = (results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current as HTMLVideoElement;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas to video frame
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw current video frame
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw landmarks
    if (results?.multiHandLandmarks?.length) {
      for (const lm of results.multiHandLandmarks) {
        try {
          window.drawConnectors(ctx as any, lm, window.HAND_CONNECTIONS, {
            color: "#22c55e",
            lineWidth: 3,
          });
          window.drawLandmarks(ctx as any, lm, {
            color: "#10b981",
            lineWidth: 1,
          });
          const label = recognizeSign(lm);
          setRecognized(label);
          ctx.fillStyle = "#10b981";
          ctx.font = "bold 20px Inter, sans-serif";
          ctx.fillText(`Sign: ${label}`, 12, 28);
        } catch {}
      }
    } else {
      setRecognized("...");
    }

    ctx.restore();
  };

  const startCamera = async () => {
    if (!handsLoaded || !drawLoaded) return;
    if (!videoRef.current) return;
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const hands = new window.Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      hands.onResults((results: any) => drawResults(results));
      handsRef.current = hands;

      const loop = async () => {
        if (!running || !videoRef.current) return;
        try {
          await hands.send({ image: videoRef.current });
        } catch {}
        rafRef.current = requestAnimationFrame(loop);
      };
      setRunning(true);
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const tracks = streamRef.current?.getTracks?.() || [];
    tracks.forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) (videoRef.current as any).srcObject = null;
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <Layout>
      <section className="py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle>Sign Language Detection (Demo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    className="w-full rounded border bg-black"
                    muted
                    playsInline
                  />
                  <canvas ref={canvasRef} className="w-full rounded border" />
                  <div className="flex gap-2">
                    <Button
                      onClick={startCamera}
                      disabled={
                        loading || running || !handsLoaded || !drawLoaded
                      }
                    >
                      {loading
                        ? "Starting..."
                        : running
                          ? "Running"
                          : "Start Camera"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={stopCamera}
                      disabled={!running}
                    >
                      Stop Camera
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Recognized Text</h3>
                  <div className="rounded border p-3 min-h-[120px] text-sm">
                    {recognized}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This demo uses MediaPipe Hands in your browser. It
                    recognizes very simple demo gestures ("Hello" / "Hi"). You
                    can extend the rules for more signs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
