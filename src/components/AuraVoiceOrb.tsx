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
  nodeIp = "10.178.117.16"
}: AuraVoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<"voice" | "theatre_map" | "settings">("theatre_map");

  // Dynamic Hardware Node IP State (User configurable & persisted)
  const [nodeIpState, setNodeIpState] = useState<string>(() => {
    return localStorage.getItem("aura_node_ip") || (nodeIp !== "192.168.43.101" ? nodeIp : "10.178.117.16");
  });
  const [tempIpInput, setTempIpInput] = useState<string>(nodeIpState);

  const handleConnectIp = (targetIp?: string) => {
    const raw = (targetIp !== undefined ? targetIp : tempIpInput).trim();
    if (!raw) return;
    const cleanIp = raw.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
    setNodeIpState(cleanIp);
    setTempIpInput(cleanIp);
    localStorage.setItem("aura_node_ip", cleanIp);
    setIsConnected(false);
    setIsReconnecting(true);
  };

  // Hardware Control Settings State
  const [buzzerLevel, setBuzzerLevel] = useState(1);
  const [frequencyKhz, setFrequencyKhz] = useState(40);
  const [isOverdrive, setIsOverdrive] = useState(false);
  const [isBeamActive, setIsBeamActive] = useState(false);
  const [isPollingPaused, setIsPollingPaused] = useState(false);
  const [bgMode, setBgMode] = useState<"live" | "gif" | "static">("live");

  // Real LLM Neural API Key & Model Configuration
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("aura_openrouter_key") || (import.meta.env.VITE_OPENROUTER_API_KEY as string) || "";
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
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryPayload>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "Hello, I am AURA Intelligence. Microphone is active. Try asking:",
      pills: [
        "Tell them we are coming",
        "Where are the survivors",
        "Evacuation siren mode",
        "Acoustic beacon status",
        "Buzzer level 3 (110 dB)",
        "Mute buzzer",
        "Turn on overdrive"
      ]
    }
  ]);

  // Live robust hardware telemetry poller (250ms Polling to ESP32 / Tunnel with Bypass Headers)
  useEffect(() => {
    if (isPollingPaused) {
      setIsConnected(false);
      setIsReconnecting(false);
      return;
    }

    let isMounted = true;
    let failureCount = 0;
    const pollTelemetry = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);

        const endpoints = [
          "/api/telemetry",
          `http://${nodeIpState || "10.178.117.16"}/api/telemetry`,
          "http://10.178.117.16/api/telemetry",
          "http://192.168.4.1/api/telemetry",
          "http://192.168.43.101/api/telemetry"
        ];

        let res: Response | null = null;
        for (const ep of endpoints) {
          try {
            const r = await fetch(ep, {
              signal: controller.signal,
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Bypass-Tunnel-Reminder": "true"
              }
            });
            if (r && r.ok) {
              res = r;
              break;
            }
          } catch {
            // try next endpoint
          }
        }

        clearTimeout(timeoutId);
        if (!res || !res.ok) throw new Error("Connection failed");
        const data = await res.json();
        if (isMounted) {
          failureCount = 0;
          setTelemetry(data);
          setIsConnected(true);
          setIsReconnecting(false);
          if (data.buzzer_level !== undefined && typeof data.buzzer_level === "number") {
            setBuzzerLevel(data.buzzer_level);
          } else if (data.buzzer_mode !== undefined && typeof data.buzzer_mode === "number") {
            setBuzzerLevel(data.buzzer_mode);
          }
        }
      } catch {
        if (isMounted) {
          failureCount++;
          if (failureCount >= 1 && failureCount < 4) {
            setIsReconnecting(true);
          } else if (failureCount >= 4) {
            setIsConnected(false);
            setIsReconnecting(false);
          }
        }
      }
    };

    pollTelemetry();
    const interval = setInterval(pollTelemetry, 250);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [nodeIpState, isPollingPaused]);

  // Direct Hardware Control Trigger (POST /api/control)
  const sendHardwareBuzzerCommand = async (payload: { [key: string]: any }, feedbackLabel?: string) => {
    const updates = payload;
    if (updates.buzzer_level !== undefined) setBuzzerLevel(updates.buzzer_level);
    if (updates.buzzer_mode !== undefined) setBuzzerLevel(updates.buzzer_mode);
    if (updates.transducer_active !== undefined) setIsBeamActive(updates.transducer_active);
    if (updates.ultrasonic_khz !== undefined) setFrequencyKhz(updates.ultrasonic_khz);
    if (updates.overdrive !== undefined) setIsOverdrive(updates.overdrive);

    try {
      const endpoints = [
        "/api/control",
        "/api/telemetry",
        `http://${nodeIpState || "10.178.117.16"}/api/control`,
        "http://10.178.117.16/api/control",
        "http://192.168.4.1/api/control",
        "http://192.168.43.101/api/control"
      ];

      let success = false;
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Bypass-Tunnel-Reminder": "true"
            },
            body: JSON.stringify(payload)
          });
          if (res && res.ok) {
            success = true;
            break;
          }
        } catch {
          // try next
        }
      }
      return success;
    } catch (err) {
      console.error("Failed to update ESP32 hardware register:", err);
      return false;
    }
  };

  const sendHardwareControl = sendHardwareBuzzerCommand;

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

    const isBuzzerHelp = /(help.*way|communicate.*help|broadcast.*help|send.*help|survivor.*message|comm.*mode|mode.*4)/i.test(q);
    const isBuzzerSiren = /(siren|evac|evacuation.*alarm|emergency.*siren|alarm.*sound|mode.*3)/i.test(q);
    const isBuzzerChirp = /(chirp|rescue.*chirp|pulse.*chirp|ping.*survivor|mode.*2)/i.test(q);
    const isBuzzerBeacon = /(beacon|locator.*beacon|locator.*pulse|pulse.*beacon|mode.*1)/i.test(q);
    const isBuzzerOff = /(off.*buzzer|buzzer.*off|turn.*off.*buzzer|buzzer.*0|mute|silent|silence|stop.*buzzer|kill.*buzzer|shut.*up|quiet.*buzzer|off.*sound|sound.*off|mute.*sound|mode.*0)/i.test(q);
    const isBuzzerMax = /(increase.*(buzzer|sound|hardware)|boost.*(buzzer|sound|hardware)|max.*(buzzer|sound|hardware)|(buzzer|sound).*max|(buzzer|sound).*3|level 3|louder|turn.*up.*buzzer|high.*buzzer|buzzer.*high)/i.test(q);
    const isBuzzerMed = /(buzzer.*2|level 2|medium.*(buzzer|sound)|(buzzer|sound).*medium)/i.test(q);
    const isBuzzerLow = /(buzzer.*1|level 1|low.*(buzzer|sound)|(buzzer|sound).*low|lower.*(buzzer|sound)|decrease.*(buzzer|sound)|turn.*down.*(buzzer|sound))/i.test(q);

    if (isBuzzerHelp) {
      newBuzzerLevel = 4;
      sendHardwareControl({ buzzer_mode: 4, buzzer_level: 4 });
      hwActionExecuted = "Dispatched Acoustic Mode 4: 'HELP IS ON THE WAY' audio signal to ESP32.";
    } else if (isBuzzerSiren || isBuzzerMax) {
      newBuzzerLevel = 3;
      sendHardwareControl({ buzzer_mode: 3, buzzer_level: 3 });
      hwActionExecuted = "Acoustic buzzer set to Mode 3: Evacuation Siren (110 dB).";
    } else if (isBuzzerChirp || isBuzzerMed) {
      newBuzzerLevel = 2;
      sendHardwareControl({ buzzer_mode: 2, buzzer_level: 2 });
      hwActionExecuted = "Acoustic buzzer set to Mode 2: Rescue Chirp.";
    } else if (isBuzzerBeacon || isBuzzerLow) {
      newBuzzerLevel = 1;
      sendHardwareControl({ buzzer_mode: 1, buzzer_level: 1 });
      hwActionExecuted = "Acoustic buzzer set to Mode 1: Locator Beacon Pulse.";
    } else if (isBuzzerOff) {
      newBuzzerLevel = 0;
      sendHardwareControl({ buzzer_mode: 0, buzzer_level: 0 });
      hwActionExecuted = "Acoustic buzzer muted (Mode 0: Standby).";
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
    const micRms = Number(telemetry.acoustic_energy || 0);
    const radarDepthStr = telemetry.ai_depth_meters !== undefined ? `${Number(telemetry.ai_depth_meters).toFixed(1)}m` : "Scanning Strata";
    const cityStr = telemetry.city || "Chennai";
    const gpsCoords = (telemetry.lat && telemetry.lng) ? `${telemetry.lat}°, ${telemetry.lng}°` : "12.9665° N, 79.9450° E";
    const satsCount = telemetry.sats || 0;

    let aiReply: string | null = null;
    let successfulModelName = "AURA Core";

    // 100% Genuine Hardware Telemetry Mapping (Strictly Pure ESP32 Registers)
    const rawD = telemetry.depth_meters !== undefined 
      ? (typeof telemetry.depth_meters === "number" ? telemetry.depth_meters : parseFloat(String(telemetry.depth_meters)) || 0) 
      : (telemetry.radar_dist_cm ? telemetry.radar_dist_cm / 100 : 0);
    const depthMeters: number = isNaN(rawD) ? 0 : Number(rawD);
    const survivorCount = telemetry.survivor_count !== undefined 
      ? Number(telemetry.survivor_count) 
      : (telemetry.detected_persons !== undefined ? Number(telemetry.detected_persons) : 0);
    const rangeMeters = telemetry.range_meters !== undefined ? Number(telemetry.range_meters) : 0;
    const zoneColor = telemetry.zone_color || (survivorCount > 0 ? "RED" : "GREEN");
    const threatLevel = telemetry.threat_level || (survivorCount > 0 ? "CRITICAL" : "NOMINAL");
    const micFreq = telemetry.mic_freq_hz || 0;
    const tapCount = telemetry.tap_count || 0;
    const nh3Ppm = typeof telemetry.nh3_ppm === "number" ? telemetry.nh3_ppm : (parseFloat(String(telemetry.human_scent_ppm || telemetry.nh3_ppm || "0")) || 0);
    const scentLabel = telemetry.human_scent_label || (telemetry.human_scent_detected ? "POSITIVE BIO-VOC" : "CLEAR AMBIENT");
    const heartbeatBpm = telemetry.heartbeat_detected ? telemetry.heartbeat_bpm : null;
    const soundClass = telemetry.sound_classification || (telemetry.ai_classification ?? "Ambient Noise");
    const spectrum = telemetry.acoustic_spectrum || "AMBIENT NOISE FLOOR";

    const isAskingForBio = /(\b(human|person|people|survivor|someone|anybody|voice|breathing|sound|heartbeat|bpm|pulse|alive|deep|depth|nearby|trapped)\b)/i.test(q);
    const isAskingForSensors = isAskingForBio || /(\b(gas|ppm|radar|seismic|satellite|telemetry|sensor readings|hardware readings|all readings|node status)\b)/i.test(q);

    // Exact proximity description based solely on real depthMeters
    let depthProximityCategory = "Standby (No Target Locked)";
    if (depthMeters > 0) {
      if (depthMeters < 1.5) depthProximityCategory = `Surface Cavity (${depthMeters.toFixed(2)}m)`;
      else if (depthMeters <= 3.0) depthProximityCategory = `Intermediate Debris (${depthMeters.toFixed(2)}m)`;
      else depthProximityCategory = `Deep Subterranean (${depthMeters.toFixed(2)}m)`;
    }

    // 4. If hardware command was executed, reply IMMEDIATELY with clean confirmation (no robot bullet dumping!)
    if (hwActionExecuted) {
      aiReply = hwActionExecuted;
      successfulModelName = "ESP32 Hardware Direct";
    } else {
      const activeApiKey = (apiKey && apiKey.trim().length > 0) 
        ? apiKey.trim() 
        : ((import.meta.env.VITE_OPENROUTER_API_KEY as string) || (import.meta.env.VITE_GEMINI_API_KEY as string) || "");

      const systemPrompt = `You are A.U.R.A. Intelligence (Autonomous Underground Reconnaissance & Assessment).
You are a mission-critical Search-and-Rescue tactical AI assistant dedicated to locating buried human survivors with 100% mathematical precision.

NETWORK TOPOLOGY: Node-01 Tactical Probe (Primary Subterranean Link // Swarm Mesh Active)
CONNECTION STATE: ${isConnected ? `ONLINE (Active Node: ${nodeIpState})` : "OFFLINE (Hardware Probe Standby)"}

${isConnected ? `REAL-TIME HARDWARE SENSOR REGISTERS (STRICT LIVE DATA):
- Confirmed Survivor Count: ${survivorCount} ${survivorCount === 1 ? "Person" : "Persons"}
- Threat Level / Zone: ${threatLevel} (Zone ${zoneColor})
- Ultrasonic / Strata Depth: ${depthMeters > 0 ? `${depthMeters.toFixed(2)} meters (${depthProximityCategory})` : "0.00 meters (No target locked)"}
- Search Range: ${rangeMeters > 0 ? `${rangeMeters.toFixed(2)} meters` : "Scanning"}
- Biological Heartbeat Pulse: ${heartbeatBpm ? `${heartbeatBpm} BPM Confirmed Heart Rate` : "No pulse locked"}
- Acoustic Classification: ${spectrum}
- Acoustic Sound: ${soundClass} (${micRms} dB RMS energy, ${micFreq} Hz)
- Bio-Scent VOC Classification: ${scentLabel} (${nh3Ppm.toFixed(2)} PPM)
- Seismic Impact Matrix: ${tapCount} physical taps recorded (${seismicPeak} mm/s impact peak)
- Air Purity / Gas Level: ${gasPpm} PPM (${telemetry.air_rating || (gasPpm > 400 ? "HAZARDOUS" : "SAFE / CLEAR")})
- Metabolic CO2 Level: ${telemetry.co2_ppm || gasPpm} PPM
- Geographic Target Fix: ${cityStr} (${gpsCoords})` : `HARDWARE NODE STATUS: OFFLINE (Standby Mode)
- Anchored Target Coordinates: Nehru Street, Sriperumbudur (12.9674° N, 79.9458° E)
- All live sensor registers: 0 (No active packet stream)
- Blue Location Point: Nehru St west of Sathya Agencies
CRITICAL RESCUE PROTOCOL: Never hallucinate fake survivor heartbeats, gas leaks, or depths when the hardware is offline. Truthfully state that the node is offline and provide cached target fix information.`}

OPERATIONAL DIRECTIVES:
1. Deeply analyze the real-time sensor data above and answer with situational awareness.
2. STRICT DATA FIDELITY: Never invent, guess, or hallucinate survivors or depths. If Survivor Count is 0, explicitly report 0 survivors. If Depth is 0.00m, report that no depth target is currently locked. If Survivor Count is ${survivorCount} > 0, report exactly ${survivorCount} survivor(s) at ${depthMeters.toFixed(2)}m.
3. ACOUSTIC DISCRIMINATION: When evaluating sounds or microphone telemetry, analyze the acoustic energy (${micRms} dB) and frequency spectrum. Discriminate realistically between:
   - Canine barking (sharp 500-1200 Hz bursts)
   - Background rock / rubble settling (low-frequency friction <200 Hz)
   - Human vocalization / distress voice (formant bands 300-3000 Hz)
   - TV / media audio speaker (continuous synthesized audio)
   - SOS structural tapping (periodic mechanical pulses)
   - Ambient noise floor (normal background silence)
   Never blindly announce loud crying unless human vocal formants are explicitly confirmed.
4. Speak in 2 to 3 concise, natural sentences without markdown symbols (*, **, _, #) for smooth voice audio synthesis.`;

      const recentHistory = messages
        .filter((m) => m.id !== "init")
        .slice(-6)
        .map((m) => ({
          role: m.sender === "ai" ? "assistant" : "user",
          content: m.text
        }));

      // PROVIDER 1: DIRECT GOOGLE GEMINI API (AIzaSy...)
      if (!aiReply && activeApiKey.startsWith("AIzaSy")) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${activeApiKey}`;
          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\nUser Question: ${rawQuery}` }]
                }
              ]
            })
          });
          if (res.ok) {
            const data = await res.json();
            const txt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (txt) {
              aiReply = txt.replace(/[*_#`]/g, "");
              successfulModelName = "Google Gemini 2.0 Flash";
            }
          }
        } catch (err) {
          console.warn("Direct Gemini API attempt failed:", err);
        }
      }

      // PROVIDER 2: DIRECT GROQ API (gsk_...)
      if (!aiReply && activeApiKey.startsWith("gsk_")) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${activeApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: systemPrompt },
                ...recentHistory,
                { role: "user", content: rawQuery }
              ],
              temperature: 0.7,
              max_tokens: 350
            })
          });
          if (res.ok) {
            const data = await res.json();
            const txt = data.choices?.[0]?.message?.content?.trim();
            if (txt) {
              aiReply = txt.replace(/[*_#`]/g, "");
              successfulModelName = "Groq LLaMA 3.3 70B";
            }
          }
        } catch (err) {
          console.warn("Groq API attempt failed:", err);
        }
      }

      // PROVIDER 3: OPENROUTER API (sk-or-...)
      if (!aiReply && activeApiKey.startsWith("sk-")) {
        const conversationPayload = [
          { role: "system", content: systemPrompt },
          ...recentHistory,
          { role: "user", content: rawQuery }
        ];

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
                "Authorization": `Bearer ${activeApiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://aura-system.vercel.app",
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
                aiReply = content.replace(/[*_#`]/g, "");
                successfulModelName = modelToTry;
                break;
              }
            }
          } catch (err) {
            console.warn(`Model ${modelToTry} attempt failed:`, err);
          }
        }
      }

      // PROVIDER 4: COMPREHENSIVE ON-DEVICE TACTICAL & CONVERSATIONAL NLP ENGINE
      if (!aiReply) {
        successfulModelName = isConnected ? "AURA Tactical Intelligence Core" : "AURA Standby Engine";

        // 1. Mathematical Calculation Evaluator
        const mathMatch = q.match(/(?:calculate|what is|compute)\s+([0-9\.\+\-\*\/\(\)\s\^]+)/i);
        if (mathMatch && mathMatch[1]) {
          try {
            const cleanedExpr = mathMatch[1].replace(/[^0-9\+\-\*\/\.\(\)]/g, "");
            if (cleanedExpr.length > 0) {
              const mathResult = Function(`"use strict"; return (${cleanedExpr})`)();
              if (typeof mathResult === "number" && !isNaN(mathResult)) {
                aiReply = `Calculation result: ${cleanedExpr} = ${mathResult}`;
              }
            }
          } catch {
            // fallback to conversational
          }
        }

        // 2. Physics & Sensor Principles
        if (!aiReply) {
          if (/(how (does|do) (doppler|radar)|radar physics|microwave radar)/i.test(q)) {
            aiReply = `The RCWL-0516 Doppler radar transmits 3.18 GHz microwave pulses and detects frequency shifts caused by physical motion, capturing survivor chest wall movements through rubble.`;
          } else if (/(how (does|do) (piezo|seismic)|piezoelectric effect)/i.test(q)) {
            aiReply = `The piezoelectric subterranean transducer converts kinetic stress and structural vibrations directly into electrical charges, detecting micro-taps and acoustic impacts.`;
          } else if (/(what is mq-?135|how (does|do) gas sensor)/i.test(q)) {
            aiReply = `The MQ-135 sensor utilizes a tin dioxide sensitive layer to measure ambient concentrations of hazardous gases including ammonia, sulfide, and CO2 in parts per million.`;
          } else if (/(what is (triage|start triage)|triage protocol)/i.test(q)) {
            aiReply = `START triage categorizes casualties into Green (Surface / Immediate), Yellow (Delayed), Red (Immediate Critical Mid-Debris), and Black (Deceased) based on respiration, perfusion, and mental status.`;
          }
        }

        // 3. Situational Hardware & Telemetry Evaluation
        if (!aiReply) {
          if (!isConnected) {
            if (isAskingForSensors || /(\b(depth|gas|survivor|victim|node|status)\b)/i.test(q)) {
              aiReply = `The ESP32 hardware node is currently offline. No active sensor packets are being received. Retaining last active target lock at Nehru Street, Sriperumbudur (12.9674° N, 79.9458° E).`;
            } else if (/who (are|is)|what is aura/i.test(q)) {
              aiReply = `I am A.U.R.A. Intelligence (Autonomous Underground Reconnaissance & Assessment). I monitor subterranean seismic, acoustic, and bio-scent sensors to locate trapped survivors.`;
            } else {
              aiReply = `AURA Tactical Station is active in standby mode. To unlock unrestricted open-ended conversations across any topic, enter a free Google Gemini key (AIzaSy...) in Settings.`;
            }
          } else {
            // ONLINE: Evaluate the user query with domain-specific tactical intelligence
            if (/(who (are|is)|what is aura|identity)/i.test(q)) {
              aiReply = `I am A.U.R.A. Tactical Intelligence (Autonomous Underground Reconnaissance & Assessment). Connected to Node ${nodeIpState}. Currently monitoring live strata depth, bio-acoustic formants, seismic impacts, and metabolic gases.`;
            } else if (/(heartbeat|pulse|vital|alive|bpm|breathing|breath)/i.test(q)) {
              if (heartbeatBpm) {
                aiReply = `Vital pulse lock confirmed at ${heartbeatBpm} BPM. Target indicates active biological respiration with ${scentLabel} scent signature.`;
              } else if (survivorCount > 0) {
                aiReply = `${survivorCount} survivor signature(s) detected via acoustic and bio-scent sensors (${spectrum}, ${scentLabel}). Pulse detection array is currently sweeping.`;
              } else {
                aiReply = `Zero biological vital pulses detected. Sensor registers indicate baseline ambient background noise.`;
              }
            } else if (/(how many|count|number of|anyone|someone|anybody|people|trapped|survivor|victim)/i.test(q)) {
              if (survivorCount > 0) {
                aiReply = `Hardware telemetry reports ${survivorCount} survivor(s) detected at depth ${depthMeters.toFixed(2)} meters (${depthProximityCategory}). Triage zone is ${zoneColor} (${threatLevel}) with acoustic classification: ${spectrum}.`;
              } else {
                aiReply = `Currently zero trapped survivors are detected by the sensor array. Strata scan is nominal with no active distress signatures.`;
              }
            } else if (/(depth|how deep|strata|deep|meters|cavity|distance|range)/i.test(q)) {
              if (depthMeters > 0) {
                aiReply = `Calculated strata depth is ${depthMeters.toFixed(2)} meters (${depthProximityCategory}) with a lateral radar range of ${rangeMeters.toFixed(2)} meters.`;
              } else {
                aiReply = `Ultrasonic sonar depth register reads 0.00 meters. Subterranean strata scan is clear with no void targets locked.`;
              }
            } else if (/(gas|air|ppm|oxygen|co2|ammonia|hazard|toxic|smoke|breathable|purity)/i.test(q)) {
              if (gasPpm > 400 || (telemetry.air_rating || "").includes("DANGER")) {
                aiReply = `Warning: Gas hazard detected at ${gasPpm} PPM (${telemetry.air_rating || "HAZARDOUS"}). Metabolic CO2 is ${telemetry.co2_ppm || gasPpm} PPM. Supplemental breathing apparatus required for rescue personnel.`;
              } else {
                aiReply = `Atmospheric gas reading is ${gasPpm} PPM (${telemetry.air_rating || "SAFE / BREATHABLE"}). Metabolic CO2 is ${telemetry.co2_ppm || gasPpm} PPM, and ammonia VOC is ${nh3Ppm.toFixed(2)} PPM.`;
              }
            } else if (/(seismic|vibration|structural|collapse|taps|tap|knocking|piezo|impact|stable)/i.test(q)) {
              aiReply = `Seismic impact matrix records ${tapCount} physical taps with a peak vibration of ${seismicPeak} mm/s. Structural strata stability is ${seismicPeak > 5 ? "UNSTABLE / POST-SHOCK RISK" : "STABLE"}.`;
            } else if (/(scent|smell|voc|sulfide|effluent|odor|saliva)/i.test(q)) {
              aiReply = `Bio-scent VOC classification is ${scentLabel} with ${nh3Ppm.toFixed(2)} PPM concentration (${telemetry.human_scent_detected ? "POSITIVE HUMAN METABOLITE" : "AMBIENT"}).`;
            } else if (/(how to rescue|rescue plan|extract|extraction|how do we|dig|procedure|protocol|triage|strategy)/i.test(q)) {
              if (survivorCount > 0) {
                if (depthMeters < 1.5) {
                  aiReply = `Triage Protocol: Surface cavity extraction (${depthMeters.toFixed(2)}m). Clear surface debris manually with hand tools and deploy the acoustic beacon to guide the team.`;
                } else if (depthMeters <= 3.0) {
                  aiReply = `Triage Protocol: Intermediate debris extraction (${depthMeters.toFixed(2)}m). Install pneumatic shoring to secure the void and establish auxiliary air ventilation.`;
                } else {
                  aiReply = `Triage Protocol: Deep subterranean extraction (${depthMeters.toFixed(2)}m). Heavy hydraulic trench shoring and core drilling required before team entry.`;
                }
              } else {
                aiReply = `No active rescue extraction required. Continue subterranean radar sweep across grid coordinates.`;
              }
            } else if (/(where|gps|coordinates|location|city|bus stand)/i.test(q)) {
              aiReply = `Target lock is anchored at ${cityStr} (${gpsCoords}) with ${satsCount} GPS satellites locked.`;
            } else if (/(sound|noise|mic|microphone|listen|acoustic|audio|bark|dog|rock|rubble|tv|speaker)/i.test(q)) {
              let soundSource = "Ambient Background Floor";
              if (micRms > 65) {
                soundSource = "High-amplitude acoustic spike. Spectral analysis indicates human voice or impact transient.";
              } else if (micRms > 45) {
                soundSource = "Mid-frequency energy band (45-65 dB). Signature matches canine barking or nearby surface movement.";
              } else if (micRms > 20) {
                soundSource = "Low-frequency acoustic vibration (20-45 dB). Footprint matches subterranean rubble settling or distant ambient speaker.";
              } else {
                soundSource = "Nominal noise floor (<20 dB). No abnormal biological or mechanical sound detected.";
              }
              aiReply = `Acoustic Sensor Telemetry (${micRms} dB): ${soundSource} Current filter status: ${spectrum}.`;
            } else if (/(status|report|sitrep|summary|check|readings|all sensors)/i.test(q)) {
              aiReply = `Sitrep: Node ${nodeIpState} Online. Detected Survivors: ${survivorCount} at ${depthMeters.toFixed(2)}m depth. Gas: ${gasPpm} PPM (${telemetry.air_rating || "NOMINAL"}). Acoustic: ${spectrum}. Seismic: ${seismicPeak} mm/s.`;
            } else {
              aiReply = `AURA Tactical Intelligence active on Node ${nodeIpState}. Current telemetry locks ${survivorCount} survivor(s) at ${depthMeters.toFixed(2)}m with ${gasPpm} PPM gas. To enable open-ended general conversations, paste a free Gemini key in Settings.`;
            }
          }
        }
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
      q.includes("depth") ||
      q.includes("range") ||
      q.includes("radar") ||
      q.includes("seismic") ||
      q.includes("sound") ||
      q.includes("co2") ||
      q.includes("ammonia") ||
      q.includes("air") ||
      q.includes("tap") ||
      q.includes("spectrum") ||
      q.includes("heartbeat");

    const gasProf = isConnected ? (telemetry.gas_profile || "AMBIENT AIR") : "OFFLINE / STANDBY";
    const gasColor = !isConnected ? "#94A3B8" : gasProf.includes("HAZARD") || gasProf.includes("SMOKE") ? "#EF4444" : gasProf.includes("RESPIRATION") || gasProf.includes("VOC") ? "#F59E0B" : "#10B981";

    const acousticSpec = isConnected 
      ? (telemetry.acoustic_spectrum || (micRms > 60 ? "ACOUSTIC TRANSIENT (60+ dB)" : micRms > 35 ? "CANINE / MID-BAND AUDIO" : micRms > 15 ? "LOW-LEVEL RUMBLE / RUBBLE" : "AMBIENT NOISE FLOOR")) 
      : "OFFLINE / NO STREAM";
    const acousticSpecColor = !isConnected ? "#94A3B8" : acousticSpec.includes("TRANSIENT") || acousticSpec.includes("CRY") 
      ? "#F43F5E" 
      : acousticSpec.includes("CANINE") || acousticSpec.includes("SPEECH") 
      ? "#F59E0B" 
      : acousticSpec.includes("RUMBLE") || acousticSpec.includes("RUBBLE")
      ? "#38BDF8"
      : "#10B981";

    const telemetryCard: ChatMessage["telemetryCard"] | undefined = isHwInquiry
      ? isConnected
        ? {
            title: "LIVE ESP32 BIO-ACOUSTIC & MULTI-GAS AUDIT",
            metrics: [
              { label: "Mesh Topology", value: "Node-01 Link (Swarm Expandable)", color: "#38BDF8" },
              { label: "Detected Survivors", value: `${survivorCount} Survivor${survivorCount === 1 ? "" : "s"} (${zoneColor})`, color: survivorCount > 0 ? "#EF4444" : "#10B981" },
              { label: "Threat Assessment", value: threatLevel, color: threatLevel === "CRITICAL" ? "#EF4444" : "#10B981" },
              { label: "Vital Heartbeat", value: telemetry.heartbeat_detected && telemetry.heartbeat_bpm ? `${telemetry.heartbeat_bpm} BPM (Pulse Locked)` : "Scanning Pulse", color: telemetry.heartbeat_detected ? "#EF4444" : "#A855F7" },
              { label: "Strata Depth", value: depthMeters > 0 ? `${depthMeters.toFixed(2)}m (${depthProximityCategory})` : "0.00m (No Target)", color: depthMeters > 0 ? "#00C2FF" : "#94A3B8" },
              { label: "Acoustic Spectrum", value: acousticSpec, color: acousticSpecColor },
              { label: "Seismic Taps", value: `${telemetry.tap_count ?? 0} Taps (${seismicPeak} mm/s)`, color: (telemetry.tap_count ?? 0) > 0 ? "#F59E0B" : "#00C2FF" },
              { label: "Gas Profile", value: gasProf, color: gasColor },
              { label: "Metabolic CO2", value: `${telemetry.co2_ppm ?? gasPpm} PPM`, color: (telemetry.co2_ppm ?? gasPpm) > 800 ? "#F59E0B" : "#10B981" },
              { label: "Ammonia / VOC", value: `${nh3Ppm.toFixed(2)} PPM`, color: "#38BDF8" },
              { label: "Bio-Scent VOC", value: scentLabel, color: scentLabel.toUpperCase().includes("GASTRO") ? "#F59E0B" : scentLabel.toUpperCase().includes("EFFLUENT") ? "#FACC15" : scentLabel.toUpperCase().includes("SHIRT") ? "#C084FC" : scentLabel.toUpperCase().includes("SALIVA") ? "#60A5FA" : "#94A3B8" },
              { label: "Air Rating", value: telemetry.air_rating || (gasPpm > 400 ? "DANGER: TOXIC" : "AIR: SAFE / CLEAR"), color: (telemetry.air_rating || "").includes("DANGER") || gasPpm > 400 ? "#EF4444" : "#10B981" },
              { label: "Acoustic Beacon", value: effectiveBuzzer === 0 ? "MUTED" : `Level ${effectiveBuzzer} (${effectiveBuzzer === 3 ? "110 dB" : effectiveBuzzer === 2 ? "98 dB" : "85 dB"})`, color: "#C084FC" },
              { label: "Precise GPS", value: gpsCoords, color: "#38BDF8" }
            ]
          }
        : {
            title: "HARDWARE AUDIT: ESP32 NODE OFFLINE",
            metrics: [
              { label: "Mesh Topology", value: "Node-01 Gateway (Awaiting Physical Link)", color: "#EF4444" },
              { label: "Detected Survivors", value: "0 Locked (Node Offline)", color: "#94A3B8" },
              { label: "Hardware Link", value: `OFFLINE (${nodeIp})`, color: "#EF4444" },
              { label: "Telemetry Stream", value: "STANDBY (0 PACKETS)", color: "#F59E0B" },
              { label: "Last Active Target", value: "Nehru St, Sriperumbudur", color: "#38BDF8" },
              { label: "Target GPS Fix", value: "12.9674° N, 79.9458° E", color: "#38BDF8" },
              { label: "Piezo Seismic Array", value: "0 mm/s (Offline)", color: "#94A3B8" },
              { label: "Atmospheric Gas", value: "0 PPM (Offline)", color: "#94A3B8" },
              { label: "Vital Pulse Detector", value: "None (Offline)", color: "#94A3B8" },
              { label: "Ultrasonic Radar", value: "Standby (No Signal)", color: "#94A3B8" }
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
        
        {/* LUXURY macOS Tahoe GLASS NAVIGATION HEADER (PERFECT MOBILE & DESKTOP RESPONSIVE LAYOUT) */}
        <header className="w-full bg-black/80 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 flex flex-col lg:flex-row items-center justify-between shadow-2xl gap-2 sm:gap-3 font-sans transform-gpu will-change-transform">
          
          {/* TOP ROW (MOBILE) / LEFT SECTION (DESKTOP) */}
          <div className="w-full lg:w-auto flex flex-wrap items-center justify-between lg:justify-start gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#C084FC]/50 text-white/90 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#C084FC]" />
                  <span>Overview</span>
                </button>
              )}

              <div className="h-4 w-px bg-white/10 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-wider flex items-center gap-1">
                  A.U.R.A.
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-[#C084FC]/20 text-[#C084FC] border border-[#C084FC]/30 uppercase">
                    C2
                  </span>
                </span>
              </div>
            </div>

            {/* DIRECT HARDWARE IP CONNECT BOX */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConnectIp();
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/15 hover:border-cyan-500/40 focus-within:border-cyan-400/70 transition-all shadow-inner"
            >
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1 hidden sm:inline">IP:</span>
              <input
                type="text"
                value={tempIpInput}
                onChange={(e) => setTempIpInput(e.target.value)}
                placeholder="e.g. 10.178.117.16"
                className="w-24 sm:w-32 bg-transparent text-xs font-mono text-cyan-300 placeholder-white/30 focus:outline-none"
              />
              <button
                type="submit"
                className="px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-sm"
              >
                <span>Connect</span>
              </button>
            </form>

            {/* Node Status Pill */}
            <div className="flex items-center gap-2">
              <div
                className={`font-mono text-[11px] font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                  isConnected
                    ? "bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]"
                    : isReconnecting
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                    : "bg-white/5 border-white/10 text-white/50"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[#10B981] animate-ping" : isReconnecting ? "bg-amber-400 animate-pulse" : "bg-white/30"}`} />
                <span className="tracking-tight">{isConnected ? "Online" : isReconnecting ? "Reconnecting..." : "Standby"}</span>
              </div>

              {/* Mobile Clear Button */}
              {activeTab === "voice" && (
                <button
                  onClick={() => processQuery("clear")}
                  className="lg:hidden text-white/70 hover:text-white text-xs flex items-center gap-1 px-2 py-1 rounded-xl bg-white/5 border border-white/10 active:scale-95"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white/60" />
                </button>
              )}
            </div>
          </div>

          {/* CENTER SEGMENTED CAPSULE (FULL WIDTH ON MOBILE, COMPACT ON DESKTOP) */}
          <div className="w-full lg:w-auto flex items-center p-1 rounded-xl bg-black/60 border border-white/15 backdrop-blur-md shadow-inner">
            <button
              onClick={() => setActiveTab("voice")}
              className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer text-xs whitespace-nowrap active:scale-95 ${
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
              className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer text-xs whitespace-nowrap active:scale-95 ${
                activeTab === "theatre_map"
                  ? "bg-[#00C2FF] text-black shadow-[0_0_15px_rgba(0,194,255,0.5)] scale-[1.02]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>🗺️ Tactical Map</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 lg:flex-none px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer text-xs whitespace-nowrap active:scale-95 ${
                activeTab === "settings"
                  ? "bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-[1.02]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>

          {/* DESKTOP RIGHT ACTIONS */}
          <div className="hidden lg:flex items-center gap-2">
            {activeTab === "voice" && (
              <button
                onClick={() => processQuery("clear")}
                className="text-white/70 hover:text-white text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Clear Chat History"
              >
                <Trash2 className="w-3.5 h-3.5 text-white/60" />
                <span>Clear</span>
              </button>
            )}

            <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 font-mono text-[11px] text-white/50 flex items-center gap-1">
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
            nodeIp={nodeIpState}
            buzzerLevel={buzzerLevel}
            frequencyKhz={frequencyKhz}
            isOverdrive={isOverdrive}
            isBeamActive={isBeamActive}
            onSetNodeIp={handleConnectIp}
            onToggleSettings={() => setActiveTab("settings")}
            onToggleOverdrive={() => {
              const next = !isOverdrive;
              setIsOverdrive(next);
              sendHardwareControl({ overdrive: next });
            }}
            onCycleBuzzer={() => {
              const next = buzzerLevel >= 3 ? 0 : buzzerLevel + 1;
              setBuzzerLevel(next);
              sendHardwareControl({ buzzer_mode: next, buzzer_level: next });
            }}
            onSetBuzzerLevel={(lvl) => {
              setBuzzerLevel(lvl);
              sendHardwareControl({ buzzer_mode: lvl, buzzer_level: lvl });
            }}
            onCycleFrequency={() => {
              const next = frequencyKhz === 40 ? 60 : frequencyKhz === 60 ? 80 : 40;
              setFrequencyKhz(next);
              sendHardwareControl({ ultrasonic_khz: next });
            }}
            onToggleBeam={() => {
              const next = !isBeamActive;
              setIsBeamActive(next);
              sendHardwareControl({ transducer_active: next, vocal_beam: next, buzzer_mode: next ? 4 : 0 });
              if (next && typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance("Emergency Vocal Beam Active. Rescue teams are drilling to your location. Tap to confirm.");
                u.rate = 1.0;
                window.speechSynthesis.speak(u);
              }
            }}
            onSwitchToVoice={() => setActiveTab("voice")}
          />
        )}

        {/* VIEW 2: DEDICATED CLEAN & MINIMAL SETTINGS PAGE */}
        {activeTab === "settings" && (
          <SettingsPage
            telemetry={telemetry}
            isConnected={isConnected}
            nodeIp={nodeIpState}
            buzzerLevel={buzzerLevel}
            frequencyKhz={frequencyKhz}
            isOverdrive={isOverdrive}
            isBeamActive={isBeamActive}
            isPollingPaused={isPollingPaused}
            apiKey={apiKey}
            aiModel={aiModel}
            onSetNodeIp={handleConnectIp}
            onSaveApiKey={handleSaveApiKey}
            onTogglePolling={() => setIsPollingPaused(!isPollingPaused)}
            onSetBuzzerLevel={(lvl) => {
              setBuzzerLevel(lvl);
              sendHardwareControl({ buzzer_mode: lvl, buzzer_level: lvl });
            }}
            onSetFrequency={(khz) => {
              setFrequencyKhz(khz);
              sendHardwareControl({ ultrasonic_khz: khz });
            }}
            onToggleOverdrive={() => {
              const next = !isOverdrive;
              setIsOverdrive(next);
              sendHardwareControl({ overdrive: next });
            }}
            onToggleBeam={() => {
              const next = !isBeamActive;
              setIsBeamActive(next);
              sendHardwareControl({ transducer_active: next, vocal_beam: next, buzzer_mode: next ? 4 : 0 });
              if (next && typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance("Emergency Vocal Beam Active. Rescue teams are drilling to your location. Tap to confirm.");
                u.rate = 1.0;
                window.speechSynthesis.speak(u);
              }
            }}
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
                  <div
                    key={m.id}
                    className={`flex items-start gap-3.5 text-sm p-3.5 sm:p-4 rounded-2xl transition-all duration-300 ${
                      m.sender === "ai"
                        ? "bg-gradient-to-br from-[#1c0e30]/90 via-[#130a21]/90 to-[#0a0512]/95 border border-[#C084FC]/35 shadow-[0_0_25px_rgba(192,132,252,0.16)] hover:shadow-[0_0_30px_rgba(192,132,252,0.25)]"
                        : "bg-gradient-to-br from-[#072438]/90 via-[#061826]/90 to-[#030d14]/95 border border-[#06B6D4]/35 shadow-[0_0_25px_rgba(6,182,212,0.16)] hover:shadow-[0_0_30px_rgba(6,182,212,0.25)]"
                    }`}
                  >
                    {m.sender === "ai" ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 text-white shadow-[0_0_15px_rgba(192,132,252,0.65)] flex items-center justify-center text-xs font-black ring-2 ring-purple-400/40 flex-shrink-0 mt-0.5">
                        A
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 via-teal-500 to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.65)] flex items-center justify-center text-xs font-black ring-2 ring-cyan-400/40 flex-shrink-0 mt-0.5">
                        U
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-white/95 leading-relaxed font-medium text-sm">{m.text}</p>

                      {/* Glowing Interactive Suggestion Pills */}
                      {m.pills && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
                          {m.pills.map((pill, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                processQuery(pill);
                                setTimeout(() => scrollToBottom(true), 40);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-950/50 via-indigo-950/50 to-cyan-950/50 hover:from-purple-600/30 hover:to-cyan-500/30 border border-purple-400/35 hover:border-cyan-300 text-purple-200 hover:text-cyan-100 transition-all cursor-pointer text-[11px] shadow-[0_0_12px_rgba(168,85,247,0.18)] hover:shadow-[0_0_18px_rgba(6,182,212,0.4)] active:scale-95 flex items-center"
                            >
                              <span>"{pill}"</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Glowing Telemetry HUD Card */}
                      {m.telemetryCard && (
                        <div className="mt-3.5 p-3.5 rounded-xl bg-black/75 border border-purple-500/30 shadow-[0_0_25px_rgba(147,51,234,0.18)] font-mono text-xs">
                          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-purple-500/20">
                            <span className="text-[11px] text-purple-300 font-black tracking-wider flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                              {m.telemetryCard.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 shadow-[0_0_8px_rgba(192,132,252,0.3)]">
                              TELEMETRY LOCK
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {m.telemetryCard.metrics.map((met, j) => {
                              const isGps = met.label === "Precise GPS";
                              return (
                                <div 
                                  key={j} 
                                  onClick={isGps ? () => {
                                    let targetLat = 12.9674;
                                    let targetLng = 79.9458;
                                    if (telemetry.gps_source === "HIGH_ACCURACY_GPS" && telemetry.lat && telemetry.lat !== 0) {
                                      targetLat = telemetry.lat;
                                      targetLng = telemetry.lng ?? 79.9458;
                                    }
                                    window.open(`https://www.google.com/maps?q=${targetLat},${targetLng}&z=19&t=k`, "_blank", "noopener,noreferrer");
                                  } : undefined}
                                  className={`p-2.5 rounded-lg bg-black/60 border border-white/10 hover:border-purple-400/40 shadow-[0_0_10px_rgba(0,0,0,0.4)] transition-all ${isGps ? "cursor-pointer hover:border-cyan-400/70 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] select-none" : ""}`}
                                  title={isGps ? "Touch to open location on Google Maps" : undefined}
                                >
                                  <span className="text-[10px] text-white/50 flex items-center justify-between font-mono">
                                    <span>{met.label}</span>
                                    {isGps && <span className="text-cyan-400 text-[10px] font-bold">Maps ↗</span>}
                                  </span>
                                  <span className="font-bold text-xs sm:text-sm block mt-0.5 truncate" style={{ color: met.color || "#fff" }}>
                                    {met.value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Real-time Thinking & Neural Reasoning Indicator */}
                {phase === "thinking" && (
                  <div className="flex items-start gap-3.5 text-sm p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent border border-amber-400/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center justify-center text-xs font-black ring-2 ring-amber-400/40 flex-shrink-0">
                      A
                    </div>
                    <div className="text-xs font-mono flex items-center gap-2 text-amber-300">
                      <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>AURA neural engine is probing live hardware registers...</span>
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
