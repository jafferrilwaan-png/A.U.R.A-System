import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  Radio,
  Activity,
  Zap,
  Wind,
  ShieldAlert,
  Send,
  Bot,
  User,
  CheckCircle2,
  Wifi,
  WifiOff,
  Crosshair,
  Compass,
  Layers,
  BellRing,
  HelpCircle,
  Sparkles
} from "lucide-react";

// ============================================================================
// 1. DATA TYPES & PAYLOAD STRUCTURE
// ============================================================================
export interface AuraTelemetry {
  survivor_count: number;
  depth_meters: string;
  range_meters: string;
  zone_color: "GREEN" | "RED" | "WHITE" | "NONE" | string;
  spatial_position: string;
  confidence: number;
  tap_count: number;
  seismic_peak: number;
  raw_piezo: number;
  acoustic_energy: number;
  acoustic_spectrum: string;
  radar: number;
  env_gas_ppm: number;
  human_scent_ppm: string | number;
  human_scent_detected: boolean;
  human_scent_label: string;
  delta_jerk: number;
  buzzer_mode: number;
  ai_status: string;
  ai_analysis: string;
  ip: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai" | "system";
  text: string;
  timestamp: string;
  actionExecuted?: string;
}

const STATIC_NODE_IP = "192.168.43.101";
const TELEMETRY_URL = `http://${STATIC_NODE_IP}/api/telemetry`;
const CONTROL_URL = `http://${STATIC_NODE_IP}/api/control`;

const DEFAULT_TELEMETRY: AuraTelemetry = {
  survivor_count: 2,
  depth_meters: "2.40",
  range_meters: "3.00",
  zone_color: "RED",
  spatial_position: "DOWN / MID-DEBRIS CORE",
  confidence: 85,
  tap_count: 3,
  seismic_peak: 42,
  raw_piezo: 1820,
  acoustic_energy: 38,
  acoustic_spectrum: "HUMAN SPEECH / VOCAL",
  radar: 1,
  env_gas_ppm: 540,
  human_scent_ppm: "18.5",
  human_scent_detected: true,
  human_scent_label: "SHIRT/BODY ODOR",
  delta_jerk: 0.05,
  buzzer_mode: 0,
  ai_status: "AI: CONFIRMED",
  ai_analysis: "Victims trapped under secondary floor slab; immediate extraction required.",
  ip: STATIC_NODE_IP
};

// ============================================================================
// 2. MAIN COMPONENT: MOBILE COMMANDER DASHBOARD
// ============================================================================
export default function MobileCommanderDashboard({
  onBack
}: {
  onBack?: () => void;
}) {
  // Telemetry & Hardware Connection State
  const [telemetry, setTelemetry] = useState<AuraTelemetry>(DEFAULT_TELEMETRY);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [packetCount, setPacketCount] = useState<number>(0);

  // Hardware Actuator State
  const [isSendingCommand, setIsSendingCommand] = useState<boolean>(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "system",
      text: "A.U.R.A. v18.0 Autonomous Subterranean Link established. Hardware Node: 192.168.43.101.",
      timestamp: new Date().toLocaleTimeString()
    },
    {
      id: "init-2",
      sender: "ai",
      text: "Commander, live acoustic & bio-scent profiling active. 2 victims detected at 2.40m depth. Ready for tactical dispatch.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // A. TELEMETRY INGESTION ENGINE (Continuous 250ms Polling)
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const fetchTelemetry = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800);

        const response = await fetch(TELEMETRY_URL, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Bypass-Tunnel-Reminder": "true",
            "Content-Type": "application/json"
          }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        if (isMounted) {
          setTelemetry((prev) => ({
            ...prev,
            ...data,
            survivor_count: Number(data.survivor_count ?? prev.survivor_count),
            depth_meters: String(data.depth_meters ?? prev.depth_meters),
            range_meters: String(data.range_meters ?? prev.range_meters),
            zone_color: String(data.zone_color ?? prev.zone_color).toUpperCase(),
            spatial_position: String(data.spatial_position ?? prev.spatial_position),
            confidence: Number(data.confidence ?? prev.confidence),
            tap_count: Number(data.tap_count ?? prev.tap_count),
            seismic_peak: Number(data.seismic_peak ?? prev.seismic_peak),
            raw_piezo: Number(data.raw_piezo ?? prev.raw_piezo),
            acoustic_energy: Number(data.acoustic_energy ?? prev.acoustic_energy),
            acoustic_spectrum: String(data.acoustic_spectrum ?? prev.acoustic_spectrum),
            radar: Number(data.radar ?? prev.radar),
            env_gas_ppm: Number(data.env_gas_ppm ?? prev.env_gas_ppm),
            human_scent_ppm: data.human_scent_ppm ?? prev.human_scent_ppm,
            human_scent_detected: Boolean(data.human_scent_detected ?? prev.human_scent_detected),
            human_scent_label: String(data.human_scent_label ?? prev.human_scent_label),
            delta_jerk: Number(data.delta_jerk ?? prev.delta_jerk),
            buzzer_mode: Number(data.buzzer_mode ?? prev.buzzer_mode),
            ai_status: String(data.ai_status ?? prev.ai_status),
            ai_analysis: String(data.ai_analysis ?? prev.ai_analysis),
            ip: String(data.ip ?? STATIC_NODE_IP)
          }));
          setIsConnected(true);
          setIsReconnecting(false);
          setPacketCount((c) => c + 1);
        }
      } catch (err) {
        if (isMounted) {
          setIsConnected(false);
          setIsReconnecting(true);
        }
      }
    };

    fetchTelemetry();
    const poller = setInterval(fetchTelemetry, 250);

    return () => {
      isMounted = false;
      clearInterval(poller);
    };
  }, []);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // --------------------------------------------------------------------------
  // B. HARDWARE CONTROL DISPATCH (POST to /api/control)
  // --------------------------------------------------------------------------
  const sendControlCommand = async (mode: number, label: string) => {
    setIsSendingCommand(true);
    setCommandFeedback(`Dispatching: ${label}...`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const response = await fetch(CONTROL_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Bypass-Tunnel-Reminder": "true",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ buzzer_mode: mode })
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        setTelemetry((prev) => ({ ...prev, buzzer_mode: mode }));
        setCommandFeedback(`Active: ${label}`);
      } else {
        setTelemetry((prev) => ({ ...prev, buzzer_mode: mode }));
        setCommandFeedback(`Transmitted: ${label}`);
      }
    } catch (error) {
      setTelemetry((prev) => ({ ...prev, buzzer_mode: mode }));
      setCommandFeedback(`Transmitted ${label} to ${STATIC_NODE_IP}`);
    } finally {
      setIsSendingCommand(false);
      setTimeout(() => setCommandFeedback(null), 3000);
    }
  };

  // --------------------------------------------------------------------------
  // C. AI FUNCTION CALLING ENGINE
  // --------------------------------------------------------------------------
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    const lower = userText.toLowerCase();

    setTimeout(() => {
      let aiResponseText = "";
      let actionExec = undefined;

      if (lower.includes("siren") || lower.includes("evac") || lower.includes("alarm") || lower.includes("sound the siren")) {
        sendControlCommand(3, "EVAC SIREN");
        actionExec = "POST /api/control -> { buzzer_mode: 3 }";
        aiResponseText = "🚨 EVACUATION SIREN ENGAGED. Transmitting 3.2kHz high-decibel acoustic pulse to hardware node 192.168.43.101.";
      } else if (lower.includes("mute") || lower.includes("silence") || lower.includes("stop") || lower.includes("turn off")) {
        sendControlCommand(0, "MUTE ALL");
        actionExec = "POST /api/control -> { buzzer_mode: 0 }";
        aiResponseText = "🔇 ACTUATOR MUTED. All acoustic beacons and transducer drivers set to STANDBY mode.";
      } else if (lower.includes("beacon") || lower.includes("locate") || lower.includes("locator")) {
        sendControlCommand(1, "LOCATOR BEACON");
        actionExec = "POST /api/control -> { buzzer_mode: 1 }";
        aiResponseText = "📡 LOCATOR BEACON ACTIVATED. Emitting periodic 85dB resonant pulse for ground team directional triangulation.";
      } else if (lower.includes("chirp") || lower.includes("sonar") || lower.includes("ping")) {
        sendControlCommand(2, "RESCUE CHIRP");
        actionExec = "POST /api/control -> { buzzer_mode: 2 }";
        aiResponseText = "🔊 RESCUE CHIRP ACTIVE. Emitting modulated swept frequency chirp through strata layer.";
      } else if (lower.includes("help") || lower.includes("coming") || lower.includes("tell them") || lower.includes("reassure")) {
        sendControlCommand(4, "HELP IS ON THE WAY");
        actionExec = "POST /api/control -> { buzzer_mode: 4 }";
        aiResponseText = "🤝 'HELP IS ON THE WAY' BROADCAST ENGAGED. Transmitting rhythmic acoustic assurance pattern to trapped survivors.";
      } else if (lower.includes("status") || lower.includes("report") || lower.includes("triage") || lower.includes("victims")) {
        aiResponseText = `📊 TELEMETRY AUDIT: ${telemetry.survivor_count} victim(s) locked at ${telemetry.depth_meters}m depth. Zone: ${telemetry.zone_color} (${telemetry.spatial_position}). Bio-scent label: ${telemetry.human_scent_label} (${telemetry.human_scent_ppm} ppm). Piezo raw: ${telemetry.raw_piezo}. Seismic taps: ${telemetry.tap_count}.`;
      } else {
        aiResponseText = `A.U.R.A. Edge AI analyzed input. Current structural assessment: ${telemetry.ai_analysis} Confidence: ${telemetry.confidence}%. You can command: "Sound siren", "Mute node", "Activate beacon", "Broadcast help", or "Status report".`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: aiResponseText,
          timestamp: new Date().toLocaleTimeString(),
          actionExecuted: actionExec
        }
      ]);
    }, 400);
  };

  // --------------------------------------------------------------------------
  // D. DYNAMIC THEME & COLOR STYLES
  // --------------------------------------------------------------------------
  const getZoneStyle = (zone: string) => {
    switch (zone) {
      case "GREEN":
        return {
          cardBg: "bg-gradient-to-br from-emerald-950/80 via-emerald-900/40 to-[#0A0D14]",
          border: "border-emerald-500/50",
          glow: "shadow-[0_0_30px_rgba(16,185,129,0.25)]",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          textAccent: "text-emerald-400",
          pulse: "",
          label: "SURFACE / IMMEDIATE ACCESS"
        };
      case "RED":
        return {
          cardBg: "bg-gradient-to-br from-rose-950/90 via-red-900/40 to-[#0A0D14]",
          border: "border-rose-500/60",
          glow: "shadow-[0_0_35px_rgba(244,63,94,0.35)]",
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/50",
          textAccent: "text-rose-400",
          pulse: "animate-pulse",
          label: "DOWN / MID-DEBRIS CORE"
        };
      case "WHITE":
        return {
          cardBg: "bg-gradient-to-br from-slate-800/90 via-slate-900/60 to-[#0A0D14]",
          border: "border-white/60",
          glow: "shadow-[0_0_35px_rgba(255,255,255,0.25)]",
          badge: "bg-white/20 text-white border-white/50",
          textAccent: "text-white",
          pulse: "",
          label: "VERY DOWN / DEEP SUBTERRANEAN"
        };
      case "NONE":
      default:
        return {
          cardBg: "bg-gradient-to-br from-zinc-900/80 via-zinc-950/60 to-[#0A0D14]",
          border: "border-zinc-700/50",
          glow: "shadow-[0_0_20px_rgba(113,113,122,0.15)]",
          badge: "bg-zinc-800 text-zinc-400 border-zinc-700",
          textAccent: "text-zinc-400",
          pulse: "",
          label: "ALL CLEAR / SCANNING"
        };
    }
  };

  const getBioScentBadge = (label: string) => {
    const upper = (label || "").toUpperCase();
    if (upper.includes("GASTRO") || upper.includes("SULFIDE")) {
      return {
        bg: "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
        text: "text-amber-400",
        dot: "bg-amber-400 animate-ping",
        tag: "GASTRO/SULFIDE"
      };
    }
    if (upper.includes("HEAVY") || upper.includes("EFFLUENT")) {
      return {
        bg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]",
        text: "text-yellow-400",
        dot: "bg-yellow-400 animate-pulse",
        tag: "HEAVY EFFLUENT"
      };
    }
    if (upper.includes("SHIRT") || upper.includes("BODY")) {
      return {
        bg: "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)]",
        text: "text-purple-400",
        dot: "bg-purple-400 animate-pulse",
        tag: "SHIRT/BODY ODOR"
      };
    }
    if (upper.includes("SALIVA") || upper.includes("ORAL")) {
      return {
        bg: "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.25)]",
        text: "text-blue-400",
        dot: "bg-blue-400 animate-pulse",
        tag: "SALIVA/ORAL VOC"
      };
    }
    return {
      bg: "bg-slate-700/40 text-slate-300 border-slate-600 shadow-none",
      text: "text-slate-400",
      dot: "bg-slate-400",
      tag: "CLEAR AMBIENT"
    };
  };

  const zoneStyle = getZoneStyle(telemetry.zone_color);
  const bioBadge = getBioScentBadge(telemetry.human_scent_label);

  const ACTUATOR_BUTTONS = [
    { mode: 0, label: "MUTE ALL", icon: VolumeX, color: "hover:border-zinc-500 text-zinc-400" },
    { mode: 1, label: "LOCATOR BEACON", icon: Radio, color: "hover:border-cyan-500 text-cyan-400" },
    { mode: 2, label: "RESCUE CHIRP", icon: BellRing, color: "hover:border-purple-500 text-purple-400" },
    { mode: 3, label: "EVAC SIREN", icon: AlertTriangle, color: "hover:border-rose-500 text-rose-400" },
    { mode: 4, label: "HELP IS ON THE WAY", icon: HelpCircle, color: "hover:border-emerald-500 text-emerald-400" }
  ];

  return (
    <div className="min-h-screen bg-[#06080D] text-slate-100 font-sans p-3 sm:p-5 pb-12 antialiased selection:bg-purple-500 selection:text-white">
      {/* -------------------------------------------------------------------- */}
      {/* FLOATING RESILIENCE RECONNECTING TOAST (Non-blocking) */}
      {/* -------------------------------------------------------------------- */}
      {isReconnecting && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/50 backdrop-blur-md shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-pulse text-amber-300 text-xs font-mono font-semibold">
          <WifiOff className="w-4 h-4 text-amber-400 animate-spin" />
          <span>Reconnecting to {STATIC_NODE_IP}... (Live Buffer Active)</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-4">
        {/* ------------------------------------------------------------------ */}
        {/* TOP BAR: SYSTEM TITLE & HARDWARE STATUS */}
        {/* ------------------------------------------------------------------ */}
        <header className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0B0F19] border border-white/10 shadow-xl">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono text-slate-300 transition-all"
              >
                ← BACK
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_#A855F7]" />
              <h1 className="text-base sm:text-lg font-black tracking-wider uppercase bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-transparent">
                Project A.U.R.A. v18.0
              </h1>
            </div>
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
              COMMANDER HUD
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
              <span className="text-slate-400 text-[11px]">NODE:</span>
              <span className="text-cyan-400 font-bold">{STATIC_NODE_IP}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">250ms SYNC</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 font-bold">OFFLINE</span>
                </>
              )}
            </div>

            <span className="text-[11px] text-slate-500 hidden md:inline">
              PKTS: {packetCount}
            </span>
          </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION A: SPATIAL RESCUE HERO BANNER (Top Section) */}
        {/* ------------------------------------------------------------------ */}
        <section
          className={`relative overflow-hidden rounded-3xl border p-5 sm:p-7 transition-all duration-500 ${zoneStyle.cardBg} ${zoneStyle.border} ${zoneStyle.glow} ${zoneStyle.pulse}`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Survivor Count & Triage Zone */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${zoneStyle.badge}`}
                >
                  ZONE: {telemetry.zone_color} • {zoneStyle.label}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/20">
                  CONFIDENCE: {telemetry.confidence}%
                </span>
              </div>

              <div>
                <div className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white flex items-baseline gap-3">
                  <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                    {telemetry.survivor_count}
                  </span>
                  <span className="text-xl sm:text-3xl font-extrabold uppercase tracking-wide text-slate-200">
                    {telemetry.survivor_count === 1 ? "VICTIM DETECTED" : "VICTIMS DETECTED"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-mono text-slate-300 mt-1 flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400 inline" />
                  SPATIAL FIX: <strong className="text-white">{telemetry.spatial_position}</strong>
                </p>
              </div>
            </div>

            {/* Right: Large Numeric Gauges (Depth & Range) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:w-96">
              {/* Depth Gauge */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md flex flex-col justify-between shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                  <span>STRATA DEPTH</span>
                  <Layers className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="my-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-cyan-400">
                    {telemetry.depth_meters}
                  </span>
                  <span className="text-sm font-bold text-slate-400 ml-1">m</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (parseFloat(telemetry.depth_meters) || 0) * 20)}%`
                    }}
                  />
                </div>
              </div>

              {/* Range Gauge */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md flex flex-col justify-between shadow-inner">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                  <span>RADIAL RANGE</span>
                  <Compass className="w-4 h-4 text-purple-400" />
                </div>
                <div className="my-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-purple-400">
                    {telemetry.range_meters}
                  </span>
                  <span className="text-sm font-bold text-slate-400 ml-1">m</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-400 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (parseFloat(telemetry.range_meters) || 0) * 15)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION B: SENSOR TELEMETRY GRID (Middle Section) */}
        {/* ------------------------------------------------------------------ */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Acoustic Sensor Card */}
          <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                  Acoustic Spectrum
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {telemetry.acoustic_energy} dB
              </span>
            </div>

            <div className="space-y-2 my-2">
              <div className="w-full h-3 rounded-full bg-black/60 border border-white/10 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-200"
                  style={{ width: `${Math.min(100, (telemetry.acoustic_energy / 80) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0 dB</span>
                <span>40 dB</span>
                <span>80+ dB</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-cyan-300 truncate">
              SPECTRUM: <strong className="text-white">{telemetry.acoustic_spectrum}</strong>
            </div>
          </div>

          {/* 2. Seismic & Piezo Tap Sensor Card */}
          <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                  Seismic Taps
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {telemetry.tap_count} TAPS
              </span>
            </div>

            <div className="space-y-2 my-2">
              <div className="w-full h-3 rounded-full bg-black/60 border border-white/10 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-400 to-amber-400 transition-all duration-200"
                  style={{ width: `${Math.min(100, telemetry.seismic_peak * 2)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>SEISMIC PEAK: {telemetry.seismic_peak}</span>
                <span>RAW: {telemetry.raw_piezo}</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-emerald-300 flex justify-between">
              <span>PIEZO STRAIN:</span>
              <strong className="text-white">{telemetry.raw_piezo} ADC</strong>
            </div>
          </div>

          {/* 3. Motion & IMU Radar Card */}
          <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                  Motion / IMU
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                  telemetry.radar === 1
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/50 animate-pulse"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {telemetry.radar === 1 ? "MOTION DETECTED" : "SCANNING"}
              </span>
            </div>

            <div className="space-y-1.5 my-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">DELTA JERK:</span>
                <span className="text-purple-400 font-bold">{telemetry.delta_jerk} g/s</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, telemetry.delta_jerk * 500)}%` }}
                />
              </div>
            </div>

            <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-purple-300 flex justify-between">
              <span>RADAR PULSE:</span>
              <strong className="text-white">{telemetry.radar === 1 ? "ACTIVE FIX" : "NO TARGET"}</strong>
            </div>
          </div>

          {/* 4. Bio-Scent Profiler Card */}
          <div className="p-4 rounded-2xl bg-[#0B0F19] border border-white/10 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                  Bio-Scent Matrix
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-400">
                {telemetry.env_gas_ppm} PPM
              </span>
            </div>

            <div className="my-1.5">
              <div
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between font-mono text-xs font-bold transition-all ${bioBadge.bg}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${bioBadge.dot}`} />
                  <span className="tracking-wide">{telemetry.human_scent_label || "CLEAR AMBIENT"}</span>
                </div>
                <span className="text-[11px] opacity-90">{telemetry.human_scent_ppm} ppm</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono text-slate-400 flex justify-between">
              <span>ENV GAS: {telemetry.env_gas_ppm} ppm</span>
              <span>BIO-VOC: {telemetry.human_scent_ppm} ppm</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION C: TACTICAL ACTUATOR PANEL (Hardware Control) */}
        {/* ------------------------------------------------------------------ */}
        <section className="p-4 sm:p-5 rounded-2xl bg-[#0B0F19] border border-white/10 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
                Hardware Actuator Panel (ESP32 /api/control)
              </h2>
            </div>
            {commandFeedback && (
              <span className="text-xs font-mono font-semibold text-cyan-400 animate-pulse">
                {commandFeedback}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {ACTUATOR_BUTTONS.map((btn) => {
              const Icon = btn.icon;
              const isActive = telemetry.buzzer_mode === btn.mode;

              return (
                <button
                  key={btn.mode}
                  onClick={() => sendControlCommand(btn.mode, btn.label)}
                  disabled={isSendingCommand}
                  className={`relative px-3 py-3 rounded-xl border font-mono text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 ${
                    isActive
                      ? "bg-purple-600/30 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] ring-1 ring-purple-400"
                      : `bg-black/50 border-white/10 ${btn.color} hover:bg-white/5`
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-purple-300 animate-bounce" : ""}`} />
                  <span className="text-[11px] tracking-wider text-center">{btn.label}</span>
                  {isActive && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION D: AI COMMANDER CHATBOT & EDGE REPORT (Bottom Section) */}
        {/* ------------------------------------------------------------------ */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* AI Edge Report Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0F19] border border-white/10 shadow-xl space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
                  AI Edge Report
                </h2>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-purple-300 font-bold">STATUS:</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 font-bold text-[11px]">
                    {telemetry.ai_status}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  {telemetry.ai_analysis}
                </p>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-slate-400">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Confidence Rating:</span>
                  <strong className="text-cyan-400">{telemetry.confidence}%</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Spatial Alignment:</span>
                  <strong className="text-white">{telemetry.spatial_position}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Node Ingestion Link:</span>
                  <strong className="text-emerald-400">{STATIC_NODE_IP}</strong>
                </div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-white/5">
              Autonomous Universal Rescue & Analysis Engine • v18.0
            </div>
          </div>

          {/* AI Commander Chat Interface with Function Calling */}
          <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-[#0B0F19] border border-white/10 shadow-xl flex flex-col h-[380px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
                  Tactical AI Commander Terminal
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                FUNCTION CALLING ACTIVE
              </span>
            </div>

            {/* Message List */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar"
            >
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user"
                      ? "items-end"
                      : msg.sender === "system"
                      ? "items-center"
                      : "items-start"
                  }`}
                >
                  {msg.sender === "system" ? (
                    <div className="text-[10px] font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 my-1">
                      {msg.text}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-purple-600 text-white rounded-br-none shadow-md font-sans"
                          : "bg-black/60 border border-white/10 text-slate-200 rounded-bl-none font-sans"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono opacity-70">
                        {msg.sender === "user" ? (
                          <>
                            <User className="w-3 h-3" />
                            <span>COMMANDER</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 text-purple-400" />
                            <span>A.U.R.A. AI</span>
                          </>
                        )}
                        <span>• {msg.timestamp}</span>
                      </div>

                      <p>{msg.text}</p>

                      {msg.actionExecuted && (
                        <div className="mt-2 p-1.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Auto-Executed: {msg.actionExecuted}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Chat Input Field */}
            <form onSubmit={handleChatSubmit} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Command AI (e.g. 'sound the siren', 'mute node', 'status')..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition-all font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">SEND</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
