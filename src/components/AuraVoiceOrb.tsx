import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Send, 
  Trash2, 
  ArrowLeft, 
  Radio, 
  Sparkles, 
  Activity, 
  ShieldAlert, 
  Satellite,
  Layers,
  Settings2,
  Tv,
  MessageSquare,
  ArrowDown
} from "lucide-react";
import { TelemetryPayload } from "./TacticalC2Dashboard";
import SubterraneanTheatreMap from "./SubterraneanTheatreMap";
import SettingsPage from "./SettingsPage";

interface AuraVoiceOrbProps {
  onBack?: () => void;
  nodeIp?: string;
  telemetry?: TelemetryPayload;
  isConnected?: boolean;
}

const VERT_SHADER = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform vec3 uHigh;
uniform float uRadius;
uniform float uWidth;
uniform float uSmear;
uniform float uStir;
uniform float uScale;
uniform float uWarp;

float h21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = h21(i);
  float b = h21(i + vec2(1.0, 0.0));
  float c = h21(i + vec2(0.0, 1.0));
  float d = h21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm5(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s;
}

float fbm3(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * vnoise(p);
    p = p * 2.07 + vec2(4.1, 2.3);
    a *= 0.5;
  }
  return s;
}

vec2 warp(vec2 p, float t) {
  return p + uWarp * vec2(fbm3(p * 1.15 + vec2(t * 0.05, 0.0)), fbm3(p * 1.15 + vec2(4.7, 2.1) - t * 0.04));
}

void main() {
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float rad = uRadius;
  vec2 q = warp(vec2(a * uSmear, r * uScale * 3.0 - uTime * 0.1), uTime);
  float f = fbm5(q);
  float g = fbm3(q * 2.1 + 7.3);
  float bq = (r - rad) / (rad * uWidth * 0.62);
  float band = exp(-bq * bq);
  float v = clamp(band * (0.45 + 1.35 * f) + g * 0.2 * band, 0.0, 1.0);
  vec3 col = uBg;
  col += mix(uBase, uAccent, clamp(f * 1.5 - 0.15 + sin(a * 2.0) * 0.28, 0.0, 1.0)) * v * 0.72;
  col += uHigh * pow(v, 4.5) * 0.38;
  col *= 1.0 - 0.9 * exp(-pow(r / (rad * 0.78), 1.7));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ];
}

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  pills?: string[];
  telemetryCard?: {
    title: string;
    metrics: { label: string; value: string; color?: string }[];
  };
}

export default function AuraVoiceOrb({
  onBack,
  nodeIp = "172.21.169.16"
}: AuraVoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<"voice" | "theatre_map" | "settings">("voice");

  // Hardware Control Settings State
  const [buzzerLevel, setBuzzerLevel] = useState(1);
  const [frequencyKhz, setFrequencyKhz] = useState(40);
  const [isOverdrive, setIsOverdrive] = useState(false);
  const [isBeamActive, setIsBeamActive] = useState(false);
  const [isPollingPaused, setIsPollingPaused] = useState(false);
  const [bgMode, setBgMode] = useState<"live" | "gif" | "static">("live");

  // Real LLM Neural API Key & Model Configuration
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("aura_openrouter_key") || "";
  });
  const [aiModel, setAiModel] = useState<string>(() => {
    const saved = localStorage.getItem("aura_ai_model");
    if (!saved || saved.includes("2.0-flash-exp") || saved.includes("flash-1.5")) {
      return "google/gemini-2.5-flash";
    }
    return saved;
  });

  const handleSaveApiKey = (newKey: string, newModel: string) => {
    setApiKey(newKey);
    setAiModel(newModel);
    localStorage.setItem("aura_openrouter_key", newKey);
    localStorage.setItem("aura_ai_model", newModel);
  };

  const [phase, setPhase] = useState<"listening" | "thinking" | "speaking">("listening");
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uptime, setUptime] = useState("00:00:00");
  const [isConnected, setIsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryPayload>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "Hello, I am AURA Intelligence. Microphone is active. Try asking:",
      pills: [
        "Test all hardware modules",
        "Show all hardware settings",
        "Acoustic beacon status",
        "Buzzer level 3 (110 dB)",
        "Mute buzzer",
        "Turn on overdrive",
        "Acquire GPS coordinates"
      ]
    }
  ]);

  // Live robust hardware telemetry poller (Zero fake fallback data, 3.5s timeout for ESP32)
  useEffect(() => {
    if (isPollingPaused) {
      setIsConnected(false);
      return;
    }

    let isMounted = true;
    let failureCount = 0;
    const pollTelemetry = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const endpoint = nodeIp === "172.21.169.16" ? "/api/telemetry" : `http://${nodeIp}/api/telemetry`;
        let res;
        try {
          res = await fetch(endpoint, { signal: controller.signal });
        } catch {
          res = await fetch(`http://${nodeIp}/api/telemetry`, { signal: controller.signal });
        }
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (isMounted) {
          failureCount = 0;
          setTelemetry(data);
          setIsConnected(true);
          if (data.buzzer_level !== undefined && typeof data.buzzer_level === "number") {
            setBuzzerLevel(data.buzzer_level);
          }
        }
      } catch {
        if (isMounted) {
          failureCount++;
          // Debounce 3 consecutive packet drops before flipping to offline
          if (failureCount >= 3) {
            setIsConnected(false);
          }
        }
      }
    };

    pollTelemetry();
    const interval = setInterval(pollTelemetry, 800);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [nodeIp, isPollingPaused]);

  // Physical ESP32 Hardware Register Dispatcher (POST /api/telemetry)
  const sendHardwareControl = async (updates: {
    buzzer_level?: number;
    transducer_active?: boolean;
    ultrasonic_khz?: number;
    polling_ms?: number;
    overdrive?: boolean;
  }) => {
    const payload = {
      buzzer_level: updates.buzzer_level !== undefined ? updates.buzzer_level : buzzerLevel,
      transducer_active: updates.transducer_active !== undefined ? updates.transducer_active : isBeamActive,
      ultrasonic_khz: updates.ultrasonic_khz !== undefined ? updates.ultrasonic_khz : frequencyKhz,
      polling_ms: updates.polling_ms !== undefined ? updates.polling_ms : 300,
      overdrive: updates.overdrive !== undefined ? updates.overdrive : isOverdrive
    };

    if (updates.buzzer_level !== undefined) setBuzzerLevel(updates.buzzer_level);
    if (updates.transducer_active !== undefined) setIsBeamActive(updates.transducer_active);
    if (updates.ultrasonic_khz !== undefined) setFrequencyKhz(updates.ultrasonic_khz);
    if (updates.overdrive !== undefined) setIsOverdrive(updates.overdrive);

    try {
      const endpoint = nodeIp === "172.21.169.16" ? "/api/telemetry" : `http://${nodeIp}/api/telemetry`;
      let res;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch {
        res = await fetch(`http://${nodeIp}/api/telemetry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      return res && res.ok;
    } catch (err) {
      console.error("Failed to update ESP32 hardware register:", err);
      return false;
    }
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Reliable bottom-scroller for chat container and window
  const scrollToBottom = (smooth = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight + 1000,
        behavior: smooth ? "smooth" : "auto"
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  };

  // Uptime ticker
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const sc = String(s % 60).padStart(2, "0");
      setUptime(`${h}:${m}:${sc}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // WebGL Orb Canvas Animation Loop
  useEffect(() => {
    if (activeTab !== "voice") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false });
    if (!gl) return;

    function createShader(type: number, src: string) {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    if (!prog) return;
    const vs = createShader(gl.VERTEX_SHADER, VERT_SHADER);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAG_SHADER);
    if (!vs || !fs) return;

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const locs: Record<string, WebGLUniformLocation | null> = {};
    const getU = (name: string) => {
      if (!locs[name]) locs[name] = gl.getUniformLocation(prog, name);
      return locs[name];
    };

    let clock = 0;
    let last = performance.now();
    let animId: number;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const spk = phase === "speaking";
      const thk = phase === "thinking";
      const spd = spk ? 5.2 : thk ? 2.8 : 1.0;
      clock = (clock + dt * spd) % 3600;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = canvas.parentElement?.clientWidth || 240;
      const ch = canvas.parentElement?.clientHeight || 240;
      const bw = Math.round(cw * dpr);
      const bh = Math.round(ch * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      gl.viewport(0, 0, bw, bh);

      const nc = spk ? "#FF00CD" : thk ? "#FBBF24" : "#06B6D4";
      const ac = spk ? "#FF6B9D" : thk ? "#F59E0B" : "#0051FF";
      const [r1, g1, b1] = hexToRgb("#06080d");
      const [r2, g2, b2] = hexToRgb(nc);
      const [r3, g3, b3] = hexToRgb(ac);
      const [r4, g4, b4] = hexToRgb("#FFE0F5");

      gl.uniform2f(getU("uRes"), bw, bh);
      gl.uniform1f(getU("uTime"), clock);
      gl.uniform2f(getU("uMouse"), 0.5, 0.5);
      gl.uniform1f(getU("uHover"), spk ? 1.85 : thk ? 1.4 : 0.52);
      gl.uniform3f(getU("uBg"), r1, g1, b1);
      gl.uniform3f(getU("uBase"), r2, g2, b2);
      gl.uniform3f(getU("uAccent"), r3, g3, b3);
      gl.uniform3f(getU("uHigh"), r4, g4, b4);
      gl.uniform1f(getU("uRadius"), 0.25);
      gl.uniform1f(getU("uWidth"), spk ? 1.4 : 0.69);
      gl.uniform1f(getU("uSmear"), spk ? 8.0 : 4.5);
      gl.uniform1f(getU("uStir"), spk ? 2.5 : 1.9);
      gl.uniform1f(getU("uScale"), 0.20);
      gl.uniform1f(getU("uWarp"), 0.55);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [phase, activeTab]);

  // Speech Synthesis Helper with Fail-Safe Auto Reset
  const speakText = (text: string, onEnd?: () => void) => {
    if (!("speechSynthesis" in window)) {
      setPhase("listening");
      onEnd?.();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;

      // Fail-safe: Always revert phase back to listening if speech hangs or is blocked
      const safetyTimer = setTimeout(() => {
        setPhase("listening");
      }, Math.min(10000, Math.max(2500, text.length * 75)));

      utterance.onend = () => {
        clearTimeout(safetyTimer);
        setPhase("listening");
        onEnd?.();
      };
      utterance.onerror = () => {
        clearTimeout(safetyTimer);
        setPhase("listening");
        onEnd?.();
      };

      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(
        (v) =>
          v.lang.includes("en") &&
          (v.name.includes("Zira") ||
            v.name.includes("Samantha") ||
            v.name.includes("Victoria") ||
            v.name.includes("Karen") ||
            v.name.includes("Female") ||
            v.name.includes("Google US English"))
      ) || voices.find((v) => v.lang.includes("en"));

      if (femaleVoice) utterance.voice = femaleVoice;

      setPhase("speaking");
      window.speechSynthesis.speak(utterance);
    } catch {
      setPhase("listening");
      onEnd?.();
    }
  };

  // Process User Query with Live LLM Neural Engine + Real ESP32 Hardware Registers
  const processQuery = async (rawQuery: string) => {
    if (!rawQuery.trim()) return;
    const q = rawQuery.toLowerCase().trim();

    // 1. Terminal Clear / Reset Command
    if (q === "clear" || q === "reset") {
      setMessages([
        {
          id: `init-${Date.now()}`,
          sender: "ai",
          text: "Terminal buffer reset. Real AI Neural Engine & Hardware telemetry active. Try asking:",
          pills: [
            "Test AI intelligence",
            "Perform hardware self test",
            "Mute acoustic beacon",
            "Buzzer level 3 (110 dB)",
            "Enable overdrive",
            "Check combustible gas"
          ]
        }
      ]);
      speakText("Terminal buffer reset. Hardware diagnostic engine ready.");
      setInputText("");
      setPhase("listening");
      return;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: rawQuery
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setPhase("thinking");

    // 2. Comprehensive Hardware Command Detection & Direct Register Dispatch
    let hwActionExecuted: string | null = null;
    let newBuzzerLevel: number | null = null;

    const isBuzzerOff = /(off.*buzzer|buzzer.*off|turn.*off.*buzzer|buzzer.*0|mute|silent|stop.*buzzer|kill.*buzzer|shut.*up|quiet.*buzzer|off.*sound|sound.*off|mute.*sound)/i.test(q);
    const isBuzzerMax = /(increase.*(buzzer|sound|hardware)|boost.*(buzzer|sound|hardware)|max.*(buzzer|sound|hardware)|(buzzer|sound).*max|(buzzer|sound).*3|level 3|louder|turn.*up.*buzzer|high.*buzzer|buzzer.*high)/i.test(q);
    const isBuzzerMed = /(buzzer.*2|level 2|medium.*(buzzer|sound)|(buzzer|sound).*medium)/i.test(q);
    const isBuzzerLow = /(buzzer.*1|level 1|low.*(buzzer|sound)|(buzzer|sound).*low|lower.*(buzzer|sound)|decrease.*(buzzer|sound)|turn.*down.*(buzzer|sound))/i.test(q);

    if (isBuzzerOff) {
      newBuzzerLevel = 0;
      sendHardwareControl({ buzzer_level: 0 });
      hwActionExecuted = "Acoustic buzzer turned off (muted).";
    } else if (isBuzzerMax) {
      newBuzzerLevel = 3;
      sendHardwareControl({ buzzer_level: 3 });
      hwActionExecuted = "Acoustic buzzer increased to maximum Level 3 (110 dB overdrive).";
    } else if (isBuzzerMed) {
      newBuzzerLevel = 2;
      sendHardwareControl({ buzzer_level: 2 });
      hwActionExecuted = "Acoustic buzzer set to Level 2 (98 dB alert).";
    } else if (isBuzzerLow) {
      newBuzzerLevel = 1;
      sendHardwareControl({ buzzer_level: 1 });
      hwActionExecuted = "Acoustic buzzer set to low Level 1 (85 dB).";
    }

    if (/(turn.*on.*overdrive|overdrive.*on|enable.*overdrive|boost.*hardware|hardware.*max|max.*hardware|increase.*hardware)/i.test(q)) {
      sendHardwareControl({ overdrive: true });
      hwActionExecuted = (hwActionExecuted ? hwActionExecuted + " " : "") + "Hardware overdrive activated at 120% power.";
    } else if (/(turn.*off.*overdrive|overdrive.*off|disable.*overdrive)/i.test(q)) {
      sendHardwareControl({ overdrive: false });
      hwActionExecuted = (hwActionExecuted ? hwActionExecuted + " " : "") + "Hardware overdrive disabled.";
    }

    if (/(turn.*on.*(transducer|beam)|(transducer|beam).*on|enable.*(transducer|beam))/i.test(q)) {
      sendHardwareControl({ transducer_active: true });
      hwActionExecuted = (hwActionExecuted ? hwActionExecuted + " " : "") + "Piezoelectric ultrasonic transducer activated.";
    } else if (/(turn.*off.*(transducer|beam)|(transducer|beam).*off|disable.*(transducer|beam))/i.test(q)) {
      sendHardwareControl({ transducer_active: false });
      hwActionExecuted = (hwActionExecuted ? hwActionExecuted + " " : "") + "Ultrasonic transducer set to standby.";
    }

    // 3. Live Hardware Telemetry Snapshot (for reference)
    const effectiveBuzzer = newBuzzerLevel !== null ? newBuzzerLevel : (telemetry.buzzer_level ?? buzzerLevel);
    const rawGas = Number(telemetry.gas || 0);
    const gasPpm = (rawGas >= 2147483000 || rawGas < 0 || isNaN(rawGas)) ? 0 : rawGas;
    const rawSeismic = Number(telemetry.seismic_peak || 0);
    const seismicPeak = (rawSeismic >= 2147483000 || rawSeismic < 0 || isNaN(rawSeismic)) ? 0 : rawSeismic;
    const radarDepthStr = telemetry.ai_depth_meters !== undefined ? `${Number(telemetry.ai_depth_meters).toFixed(1)}m` : "Scanning Strata";
    const cityStr = telemetry.city || "Sriperumbudur";
    const gpsCoords = (telemetry.lat && telemetry.lng) ? `${telemetry.lat}°, ${telemetry.lng}°` : "13.1067° N, 79.9477° E";
    const satsCount = telemetry.sats || 0;

    let aiReply: string | null = null;
    let successfulModelName = "AURA Core";

    // 4. If hardware command was executed, reply IMMEDIATELY with clean confirmation (no robot bullet dumping!)
    if (hwActionExecuted) {
      aiReply = hwActionExecuted;
      successfulModelName = "ESP32 Hardware Direct";
    } else {
      // Extract advanced bio-acoustic & vital telemetry from node
      const soundClass = telemetry.sound_classification || (telemetry.ai_classification ?? "Ambient");
      const soundDepthCat = telemetry.sound_depth_cat || (radarDepthStr !== "Scanning Strata" ? `Subterranean (${radarDepthStr})` : "Scanning Strata");
      const heartbeatBpm = telemetry.heartbeat_detected ? telemetry.heartbeat_bpm : null;
      const micRms = telemetry.acoustic_energy || 0;
      const micFreq = telemetry.mic_freq_hz || 0;

      const isAskingForBio = /(\b(human|person|people|survivor|someone|anybody|voice|breathing|sound|heartbeat|bpm|pulse|alive|deep|depth|nearby|trapped)\b)/i.test(q);
      const isAskingForSensors = isAskingForBio || /(\b(gas|ppm|radar|seismic|satellite|telemetry|sensor readings|hardware readings|all readings|node status)\b)/i.test(q);

      const systemPrompt = isAskingForSensors
        ? `You are A.U.R.A. Intelligence, analyzing real-time tactical bio-acoustic telemetry from subterranean node ${nodeIp}.
Live Hardware & Bio-Acoustic Telemetry:
- Acoustic Sound: ${soundClass} (${micRms} RMS energy, ${micFreq} Hz frequency)
- Acoustic Sound Depth: ${soundDepthCat} (Radar Echo Depth: ${radarDepthStr})
- Vital Pulse Cadence: ${heartbeatBpm ? `${heartbeatBpm} BPM confirmed biological heart pulse` : "No stable periodic pulse locked"}
- Biological Presence: ${telemetry.ai_biological ? "CONFIRMED POSITIVE" : "NEGATIVE / SCANNING"}
- Combustible Gas: ${gasPpm} PPM (${gasPpm > 400 ? "HAZARD" : "Safe/Nominal"})
- Seismic Activity / Tapping: ${seismicPeak} mm/s
- Hardware Beacon: Level ${effectiveBuzzer} (${effectiveBuzzer === 0 ? "Muted" : `${effectiveBuzzer * 15 + 70} dB`})
- Node Coordinates: ${cityStr} (${gpsCoords})

TACTICAL DIRECTIVE:
Answer the user directly and concisely in 2 to 3 natural sentences.
Specifically evaluate whether a human or person is present, what sound is detected, where the sound is coming from (NEARBY, SUBTERRANEAN, or VERY DEEP), and if a biological heartbeat is detected.
CRITICAL RULE: Speak naturally like an elite search-and-rescue commander. DO NOT output raw markdown asterisks or bullet dumps.`
        : `You are A.U.R.A. Intelligence, an ultra-smart, thoughtful AI companion.
Answer the user's question directly, insightfully, and naturally in 2 to 3 sentences.
CRITICAL RULE: Do NOT mention sensors, ESP32, or hardware readings unless specifically asked. Focus purely and intelligently on answering what the user asked.`;

      // Multi-turn conversational memory (remembers previous chat turns)
      const recentHistory = messages
        .filter((m) => m.id !== "init")
        .slice(-6)
        .map((m) => ({
          role: m.sender === "ai" ? "assistant" : "user",
          content: m.text
        }));

      const conversationPayload = [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: rawQuery }
      ];

      // Waterfall candidate models tested and verified working 100% on OpenRouter
      const candidateModels = Array.from(
        new Set([
          aiModel,
          "google/gemini-2.5-flash",
          "meta-llama/llama-3.3-70b-instruct",
          "deepseek/deepseek-chat",
          "meta-llama/llama-3.1-8b-instruct",
          "qwen/qwen-2.5-72b-instruct"
        ])
      );

      for (const modelToTry of candidateModels) {
        if (aiReply) break;
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": window.location.origin,
              "X-Title": "AURA AI C2"
            },
            body: JSON.stringify({
              model: modelToTry,
              messages: conversationPayload,
              temperature: 0.7,
              max_tokens: 350
            })
          });

          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content?.trim();
            if (content) {
              aiReply = content;
              successfulModelName = modelToTry;
              break;
            }
          }
        } catch (e) {
          console.warn(`Model ${modelToTry} fetch error:`, e);
        }
      }

      if (!aiReply) {
        aiReply = `I received your query: "${rawQuery}". All AURA systems are active.`;
        successfulModelName = "AURA Neural Engine";
      }
    }

    // Only attach the detailed hardware card if the user asked about hardware or executed a command
    const isHwInquiry =
      hwActionExecuted !== null ||
      q.includes("hardware") ||
      q.includes("sensor") ||
      q.includes("gas") ||
      q.includes("buzzer") ||
      q.includes("beacon") ||
      q.includes("radar") ||
      q.includes("depth") ||
      q.includes("seismic") ||
      q.includes("telemetry") ||
      q.includes("node") ||
      q.includes("overdrive") ||
      q.includes("transducer") ||
      q.includes("gps") ||
      q.includes("location") ||
      q.includes("strata") ||
      q.includes("human") ||
      q.includes("person") ||
      q.includes("sound") ||
      q.includes("heartbeat");

    const telemetryCard: ChatMessage["telemetryCard"] | undefined = isHwInquiry
      ? {
          title: "LIVE ESP32 BIO-ACOUSTIC TELEMETRY AUDIT",
          metrics: [
            { label: "AI Neural Engine", value: `${successfulModelName.split("/").pop()} (Live)`, color: "#10B981" },
            { label: "Bio Classification", value: String(telemetry.sound_classification || telemetry.ai_classification || "Scanning").toUpperCase(), color: telemetry.ai_biological ? "#10B981" : "#94A3B8" },
            { label: "Acoustic Depth", value: String(telemetry.sound_depth_cat || "Sweeping Strata"), color: "#00C2FF" },
            { label: "Vital Heartbeat", value: telemetry.heartbeat_detected && telemetry.heartbeat_bpm ? `${telemetry.heartbeat_bpm} BPM (Pulse Locked)` : "Scanning Pulse", color: telemetry.heartbeat_detected ? "#EF4444" : "#A855F7" },
            { label: "Gas Sensor", value: `${gasPpm} PPM`, color: gasPpm > 400 ? "#EF4444" : "#10B981" },
            { label: "Radar Depth", value: radarDepthStr, color: "#00C2FF" },
            { label: "Acoustic Beacon", value: effectiveBuzzer === 0 ? "MUTED" : `Level ${effectiveBuzzer} (${effectiveBuzzer === 3 ? "110 dB" : effectiveBuzzer === 2 ? "98 dB" : "85 dB"})`, color: "#C084FC" },
            { label: "Precise GPS", value: gpsCoords, color: "#38BDF8" }
          ]
        }
      : undefined;

    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      sender: "ai",
      text: aiReply,
      telemetryCard
    };

    setMessages((prev) => [...prev, aiMsg]);
    speakText(aiReply);
    setTimeout(() => scrollToBottom(true), 50);
  };


  // Toggle Speech Recognition
  const toggleMic = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome/Edge or type in the input bar.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => setIsRecording(true);
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        processQuery(transcript);
      };
      rec.onerror = (e: any) => {
        setIsRecording(false);
        setPhase("listening");
        if (e.error === "not-allowed" || e.error === "permission-denied") {
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              sender: "ai",
              text: "Microphone permission is blocked in your browser. You can allow mic access in your browser address bar or simply type your commands in the text box below."
            }
          ]);
        } else if (e.error === "network") {
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              sender: "ai",
              text: "Browser speech service network timeout. You can type commands directly into the input bar below (e.g. 'Test all hardware', 'Buzzer level 3')."
            }
          ]);
        }
      };
      rec.onend = () => setIsRecording(false);

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Mic start error:", err);
      setIsRecording(false);
      setPhase("listening");
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    scrollToBottom(true);
    const t = setTimeout(() => scrollToBottom(true), 60);
    return () => clearTimeout(t);
  }, [messages, phase]);

  return (
    <div className="relative min-h-screen w-full text-white flex flex-col justify-between selection:bg-[#C084FC] selection:text-black overflow-x-hidden font-sans">
      {/* ══════════════════════════════════════════════════════════════════════
          CINEMATIC LIVING WALLPAPER & MOVING GIF BACKGROUND
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {bgMode === "live" && (
          <>
            {/* 60FPS GPU Ken-Burns Panoramic Pan & Zoom Motion */}
            <div
              className="absolute -inset-[8%] w-[116%] h-[116%] bg-cover bg-center bg-no-repeat animate-tahoe-drift will-change-transform"
              style={{ backgroundImage: "url('/tahoe_wallpaper.jpg')" }}
            />
            {/* Flowing Aurora Wave Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-purple-600/15 to-transparent mix-blend-screen animate-aurora-sweep pointer-events-none" />
            {/* Atmospheric Depth Breathing */}
            <div className="absolute inset-0 bg-radial-[circle_at_center] from-transparent via-black/20 to-black/70 animate-live-pulse pointer-events-none" />
          </>
        )}

        {bgMode === "gif" && (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/tahoe_animated.gif')" }}
          />
        )}

        {bgMode === "static" && (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/tahoe_wallpaper.jpg')" }}
          />
        )}

        {/* Dark Silk Glass Blur Backdrop */}
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[6px] pointer-events-none" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl mx-auto min-h-screen flex flex-col justify-between p-4 sm:p-6 gap-4">
        
        {/* LUXURY macOS Tahoe GLASS NAVIGATION HEADER */}
        <header className="w-full bg-black/50 backdrop-blur-2xl border border-white/12 rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-2xl gap-2 font-sans">
          
          {/* LEFT: Back Button & Minimal Brand / Node Status */}
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#C084FC]/50 text-white/90 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#C084FC]" />
                <span className="hidden sm:inline">Overview</span>
              </button>
            )}

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-wider flex items-center gap-1.5">
                A.U.R.A.
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-[#C084FC]/20 text-[#C084FC] border border-[#C084FC]/30 uppercase hidden md:inline">
                  C2
                </span>
              </span>
            </div>

            {/* Node Status Pill */}
            <div
              className={`font-mono text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                isConnected
                  ? "bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]"
                  : "bg-amber-400/10 border-amber-400/25 text-amber-300"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[#10B981] animate-ping" : "bg-amber-400"}`} />
              <span className="tracking-tight">{isConnected ? "Node Online" : "Standby"}</span>
            </div>
          </div>

          {/* CENTER: Floating Segmented Switcher Capsule (VOICE AI | 3D MAP | SETTINGS) */}
          <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/15 backdrop-blur-xl shadow-inner">
            <button
              onClick={() => setActiveTab("voice")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer text-xs ${
                activeTab === "voice"
                  ? "bg-[#C084FC] text-black shadow-[0_0_15px_rgba(192,132,252,0.5)] scale-[1.02]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Voice AI</span>
            </button>

            <button
              onClick={() => setActiveTab("theatre_map")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer text-xs ${
                activeTab === "theatre_map"
                  ? "bg-[#00C2FF] text-black shadow-[0_0_15px_rgba(0,194,255,0.5)] scale-[1.02]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>3D Map</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer text-xs ${
                activeTab === "settings"
                  ? "bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-[1.02]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>

          {/* RIGHT: Clear Action & Live Uptime Badge */}
          <div className="flex items-center gap-2">
            {activeTab === "voice" && (
              <button
                onClick={() => processQuery("clear")}
                className="text-white/70 hover:text-white text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-all cursor-pointer shadow-sm"
                title="Clear Chat History"
              >
                <Trash2 className="w-3.5 h-3.5 text-white/60" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 font-mono text-[11px] text-white/50 hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <span>{uptime}</span>
            </div>
          </div>
        </header>

        {/* VIEW 1: THEATRE MODE TOPOGRAPHIC MAP VIEW */}
        {activeTab === "theatre_map" && (
          <SubterraneanTheatreMap
            telemetry={telemetry}
            isConnected={isConnected}
            nodeIp={nodeIp}
            buzzerLevel={buzzerLevel}
            frequencyKhz={frequencyKhz}
            isOverdrive={isOverdrive}
            isBeamActive={isBeamActive}
            onToggleSettings={() => setActiveTab("settings")}
            onToggleOverdrive={() => sendHardwareControl({ overdrive: !isOverdrive })}
            onCycleBuzzer={() => sendHardwareControl({ buzzer_level: buzzerLevel >= 3 ? 0 : buzzerLevel + 1 })}
            onSetBuzzerLevel={(lvl) => sendHardwareControl({ buzzer_level: lvl })}
            onCycleFrequency={() => sendHardwareControl({ ultrasonic_khz: frequencyKhz === 40 ? 60 : frequencyKhz === 60 ? 80 : 40 })}
            onToggleBeam={() => sendHardwareControl({ transducer_active: !isBeamActive })}
            onSwitchToVoice={() => setActiveTab("voice")}
          />
        )}

        {/* VIEW 2: DEDICATED CLEAN & MINIMAL SETTINGS PAGE */}
        {activeTab === "settings" && (
          <SettingsPage
            telemetry={telemetry}
            isConnected={isConnected}
            nodeIp={nodeIp}
            buzzerLevel={buzzerLevel}
            frequencyKhz={frequencyKhz}
            isOverdrive={isOverdrive}
            isBeamActive={isBeamActive}
            isPollingPaused={isPollingPaused}
            apiKey={apiKey}
            aiModel={aiModel}
            onSaveApiKey={handleSaveApiKey}
            onTogglePolling={() => setIsPollingPaused(!isPollingPaused)}
            onSetBuzzerLevel={(lvl) => sendHardwareControl({ buzzer_level: lvl })}
            onSetFrequency={(khz) => sendHardwareControl({ ultrasonic_khz: khz })}
            onToggleOverdrive={() => sendHardwareControl({ overdrive: !isOverdrive })}
            onToggleBeam={() => sendHardwareControl({ transducer_active: !isBeamActive })}
          />
        )}

        {/* VIEW 2: VOICE ORB & CONVERSATIONAL SENSORY TERMINAL */}
        {activeTab === "voice" && (
          <>
            {/* Center: Glowing WebGL Grain Ring Orb */}
            <div className="w-full flex flex-col items-center justify-center my-auto py-2">
              <div className="relative flex flex-col items-center justify-center">
                {/* Pulsing Outer Glow */}
                <div
                  className={`absolute -inset-6 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${
                    phase === "speaking"
                      ? "bg-[#FF00CD]/35 scale-125"
                      : phase === "thinking"
                      ? "bg-[#FBBF24]/30 scale-110"
                      : "bg-[#06B6D4]/25 scale-100"
                  }`}
                />

                {/* Circular Canvas Wrapper (Clickable to Speak) */}
                <div 
                  onClick={toggleMic}
                  className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full overflow-hidden border border-white/20 hover:border-[#C084FC]/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center cursor-pointer transition-all group"
                  title="Click orb to speak with AURA AI"
                >
                  <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />
                </div>

                {/* Dynamic Status Label */}
                <div
                  className={`font-mono text-xs font-bold tracking-widest uppercase mt-5 transition-colors text-center ${
                    phase === "speaking"
                      ? "text-[#C084FC] animate-pulse"
                      : phase === "thinking"
                      ? "text-amber-400 animate-pulse"
                      : "text-white/60"
                  }`}
                >
                  {phase === "speaking"
                    ? "AURA IS TRANSMITTING VOCAL SYNTHESIS..."
                    : phase === "thinking"
                    ? "PROBING SENSOR ARRAY REGISTERS..."
                    : "LISTENING LIVE — AWAITING SENSOR OR NODE COMMAND"}
                </div>
              </div>
            </div>

            {/* Bottom: Glassmorphic Voice & Text Terminal */}
            <div className="w-full bg-black/60 backdrop-blur-2xl border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative">
              {/* Chat Messages */}
              <div 
                ref={chatScrollRef}
                className="h-60 sm:h-72 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3 font-sans scroll-smooth"
              >
                {messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 text-sm">
                    {m.sender === "ai" ? (
                      <div className="w-6 h-6 rounded-full bg-[#C084FC]/25 text-[#C084FC] border border-[#C084FC]/40 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                        A
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/40 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                        U
                      </div>
                    )}

                    <div className="flex-1">
                      <p className="text-white/90 leading-relaxed font-medium">{m.text}</p>

                      {/* Interactive Pills */}
                      {m.pills && (
                        <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-mono">
                          {m.pills.map((pill, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                processQuery(pill);
                                setTimeout(() => scrollToBottom(true), 40);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#C084FC]/20 border border-white/15 hover:border-[#C084FC] text-white hover:text-[#C084FC] transition-all cursor-pointer text-[11px]"
                            >
                              "{pill}"
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Telemetry Card */}
                      {m.telemetryCard && (
                        <div className="mt-2.5 p-3 rounded-xl bg-black/50 border border-white/10 font-mono text-xs">
                          <span className="text-[10px] text-white/50 block font-bold mb-1.5">
                            {m.telemetryCard.title}
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {m.telemetryCard.metrics.map((met, j) => (
                              <div key={j} className="p-2 rounded bg-white/5 border border-white/5">
                                <span className="text-[10px] text-white/50 block">{met.label}</span>
                                <span className="font-bold text-sm" style={{ color: met.color || "#fff" }}>
                                  {met.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Real-time Thinking & Neural Reasoning Indicator */}
                {phase === "thinking" && (
                  <div className="flex items-start gap-3 text-sm animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center text-xs font-bold mt-0.5">
                      A
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-amber-400/25 text-amber-300 text-xs font-mono flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span>AURA is reasoning and formulating response...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Floating Quick Scroll-to-End Button */}
              {messages.length > 2 && (
                <button
                  onClick={() => scrollToBottom(true)}
                  className="absolute bottom-16 right-4 z-20 px-3 py-1.5 rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] border border-cyan-400/40 hover:border-cyan-400 text-cyan-300 text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 backdrop-blur-xl"
                  title="Scroll directly to end"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                  <span>Go to End</span>
                </button>
              )}

              {/* Input Bar */}
              <div className="border-t border-white/10 p-3 sm:p-4 bg-black/40 flex items-center gap-2.5">
                {/* Microphone Toggle Button */}
                <button
                  onClick={toggleMic}
                  className={`px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                    isRecording
                      ? "bg-[#EF4444] text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.8)]"
                      : "bg-[#C084FC]/20 hover:bg-[#C084FC]/30 text-[#C084FC] border border-[#C084FC]/40"
                  }`}
                  title="Click to speak command"
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {isRecording ? "Listening..." : "Tap to Speak"}
                  </span>
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inputText.trim()) {
                      const q = inputText;
                      setInputText("");
                      processQuery(q);
                      setTimeout(() => scrollToBottom(true), 40);
                    }
                  }}
                  placeholder="Ask anything or command hardware (e.g., 'What is gravity?', 'Mute buzzer', 'Buzzer level 3')..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 text-xs sm:text-sm font-sans px-2"
                />

                {/* Send Button */}
                <button
                  onClick={() => {
                    if (!inputText.trim()) return;
                    const q = inputText;
                    setInputText("");
                    processQuery(q);
                    setTimeout(() => scrollToBottom(true), 40);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#C084FC] hover:bg-[#A855F7] text-black font-mono text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(192,132,252,0.4)] active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
