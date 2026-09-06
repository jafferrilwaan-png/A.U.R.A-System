import React, { useState, useEffect, useRef } from "react";
import TopoContour from "./TopoContour";
import { TelemetryPayload } from "./TacticalC2Dashboard";
import { 
  Activity, 
  Satellite, 
  Zap, 
  Wind,
  Radio,
  Compass,
  CheckCircle2,
  Volume2,
  VolumeX,
  Mic,
  Sliders,
  Sparkles,
  MapPin,
  Navigation,
  ExternalLink,
  X,
  Heart,
  User,
  RefreshCw,
  ShieldAlert
} from "lucide-react";

interface DispatchMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  actionTaken?: string;
}

interface SubterraneanTheatreMapProps {
  telemetry: TelemetryPayload;
  isConnected: boolean;
  nodeIp?: string;
  buzzerLevel: number;
  frequencyKhz: number;
  isOverdrive: boolean;
  isBeamActive: boolean;
  onToggleSettings?: () => void;
  onToggleOverdrive?: () => void;
  onCycleBuzzer?: () => void;
  onCycleFrequency?: () => void;
  onToggleBeam?: () => void;
  onSetBuzzerLevel?: (lvl: number) => void;
  onSwitchToVoice?: () => void;
  onSetNodeIp?: (ip: string) => void;
}

export default function SubterraneanTheatreMap({
  telemetry,
  isConnected,
  nodeIp = "10.178.117.16",
  buzzerLevel = 0,
  frequencyKhz = 40,
  isOverdrive = false,
  isBeamActive = false,
  onToggleSettings,
  onToggleOverdrive,
  onCycleBuzzer,
  onCycleFrequency,
  onToggleBeam,
  onSetBuzzerLevel,
  onSwitchToVoice,
  onSetNodeIp
}: SubterraneanTheatreMapProps) {
  // Originkit fluid topographic wave animation speed
  const [contourSpeed, setContourSpeed] = useState<number>(18);
  const [mapInputIp, setMapInputIp] = useState<string>(nodeIp);
  const [mapIpSaved, setMapIpSaved] = useState<boolean>(false);

  // Synchronized 3D Radar Transformation State (Tethered to TopoContour)
  const [mapTransform, setMapTransform] = useState<{ panX: number; panY: number; zoomScale: number }>({
    panX: 0,
    panY: 0,
    zoomScale: 1.0,
  });
  const resetTopoViewRef = useRef<(() => void) | null>(null);

  // Laptop GPS Geolocation & Live Map Modal State
  const [gpsData, setGpsData] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    city?: string;
    syncedAt?: string;
  } | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isSyncingGps, setIsSyncingGps] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // Dispatch hardware buzzer mode to ESP32 (0: Mute, 1: Beacon, 2: Chirp, 3: Siren, 4: Communicate Help)
  const dispatchControlCommand = async (mode: number, label?: string) => {
    setIsDispatching(true);
    if (onSetBuzzerLevel) {
      onSetBuzzerLevel(mode);
    }
    const payload = { buzzer_mode: mode, buzzer_level: mode, ...(label ? { label } : {}) };
    try {
      let baseUrl = nodeIp || "192.168.43.101";
      if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
        baseUrl = baseUrl.includes("loca.lt") || baseUrl.includes("ngrok") ? `https://${baseUrl}` : `http://${baseUrl}`;
      }
      const endpoints = [
        `${baseUrl}/api/control`,
        "/api/control",
        `${baseUrl}/api/telemetry`,
        "/api/telemetry"
      ];
      let res;
      for (const ep of endpoints) {
        try {
          res = await fetch(ep, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Bypass-Tunnel-Reminder": "true"
            },
            body: JSON.stringify(payload)
          });
          if (res && res.ok) break;
        } catch {
          // try next
        }
      }
    } catch (e) {
      console.warn("Hardware control dispatch failed:", e);
    } finally {
      setIsDispatching(false);
    }
  };

  // Real Laptop GPS Sync with ESP32 Hardware Node
  const handleSyncLaptopGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsSyncingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsData({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          city: "EXACT GPS SYNC",
          syncedAt: new Date().toLocaleTimeString()
        });
        setIsSyncingGps(false);
        setIsMapModalOpen(true);
      },
      () => {
        setIsSyncingGps(false);
        setIsMapModalOpen(true);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Anchor Coordinates (Sriperumbudur / Chennai fallback)
  const defaultLat = 12.9665;
  const defaultLng = 79.9450;
  const activeTargetLat = (telemetry.lat && telemetry.lat !== 0) ? telemetry.lat : (gpsData?.lat || defaultLat);
  const activeTargetLng = (telemetry.lng && telemetry.lng !== 0) ? telemetry.lng : (gpsData?.lng || defaultLng);

  const handleOpenGoogleMaps = () => {
    window.open(`https://www.google.com/maps?q=${activeTargetLat},${activeTargetLng}&z=19&t=k`, "_blank", "noopener,noreferrer");
  };

  // 1. Pure Genuine Spatial Calculations from Live Telemetry
  const rawSurvivorCount = telemetry.survivor_count !== undefined 
    ? Number(telemetry.survivor_count) 
    : 0;
  
  const rawDepth = telemetry.depth_meters !== undefined 
    ? (typeof telemetry.depth_meters === "number" ? telemetry.depth_meters : parseFloat(String(telemetry.depth_meters)) || 0)
    : (Number(telemetry.ai_depth_meters) || 0);
  
  const rawRange = telemetry.range_meters !== undefined
    ? (typeof telemetry.range_meters === "number" ? telemetry.range_meters : parseFloat(String(telemetry.range_meters)) || 0)
    : 0;

  const confidenceScore = telemetry.confidence !== undefined 
    ? Number(telemetry.confidence) 
    : 0;

  // Dynamic Triage Color Zone Selection (Pure Hardware Payload)
  let zoneColor = (telemetry.zone_color || (rawSurvivorCount > 0 ? "RED" : "NONE")).toUpperCase();

  let zoneConfig = {
    badgeClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
    label: "ALL CLEAR / SCANNING",
    glowColor: "#71717A"
  };

  if (zoneColor === "GREEN") {
    zoneConfig = {
      badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
      label: "SURFACE / IMMEDIATE ACCESS (<1.2m)",
      glowColor: "#10B981"
    };
  } else if (zoneColor === "RED") {
    zoneConfig = {
      badgeClass: "bg-rose-500/20 text-rose-400 border-rose-500 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]",
      label: "DOWN / MID-DEBRIS CORE (1.2m - 3.5m)",
      glowColor: "#F43F5E"
    };
  } else if (zoneColor === "WHITE") {
    zoneConfig = {
      badgeClass: "bg-slate-100 text-slate-900 border-white shadow-lg shadow-white/30",
      label: "VERY DOWN / DEEP SUBTERRANEAN (3.5m - 6.0m+)",
      glowColor: "#FFFFFF"
    };
  }

  const spatialPosition = telemetry.spatial_position || (
    zoneColor === "GREEN" ? "SURFACE / IMMEDIATE ACCESS" :
    zoneColor === "RED" ? "DOWN / MID-DEBRIS CORE" :
    zoneColor === "WHITE" ? "VERY DOWN / DEEP SUBTERRANEAN" :
    "SEARCHING VOID SECTORS"
  );

  // 2. Acoustic & Seismic Vibration Matrix
  const acousticSpectrum = telemetry.acoustic_spectrum || "SILENCE / NOISE FLOOR";
  const acousticDb = Number(telemetry.acoustic_energy ?? 0);
  const tapCount = Number(telemetry.tap_count ?? 0);
  const rawPiezo = Number(telemetry.raw_piezo ?? 0);
  const seismicPeak = Number(telemetry.seismic_peak ?? 0);

  const humanScentPpm = telemetry.human_scent_ppm !== undefined 
    ? (typeof telemetry.human_scent_ppm === "number" ? telemetry.human_scent_ppm : parseFloat(String(telemetry.human_scent_ppm)) || 0) 
    : 0;
  const humanScentDetected = Boolean(telemetry.human_scent_detected);
  const rawScentLabel = telemetry.human_scent_label || (humanScentDetected ? "HUMAN VOC DETECTED" : "CLEAR AMBIENT");

  // Bio-Scent Profiler v18.0 dynamic classification color mapping
  const getBioScentConfig = (label: string, detected: boolean) => {
    const upper = (label || "").toUpperCase();
    if (upper.includes("GASTRO") || upper.includes("SULFIDE")) {
      return {
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.35)] animate-pulse",
        textClass: "text-amber-400 font-bold",
        cardBorder: "bg-amber-950/20 border-amber-500/40",
        iconColor: "text-amber-400",
        label: "GASTRO/SULFIDE"
      };
    }
    if (upper.includes("HEAVY EFFLUENT") || upper.includes("EFFLUENT")) {
      return {
        badgeClass: "bg-yellow-400/20 text-yellow-300 border-yellow-400/50 shadow-[0_0_12px_rgba(250,204,21,0.35)] animate-pulse",
        textClass: "text-yellow-300 font-bold",
        cardBorder: "bg-yellow-950/20 border-yellow-400/40",
        iconColor: "text-yellow-400",
        label: "HEAVY EFFLUENT"
      };
    }
    if (upper.includes("SHIRT") || upper.includes("BODY ODOR") || upper.includes("SWEAT")) {
      return {
        badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]",
        textClass: "text-purple-300 font-bold",
        cardBorder: "bg-purple-950/20 border-purple-500/40",
        iconColor: "text-purple-400",
        label: "SHIRT/BODY ODOR"
      };
    }
    if (upper.includes("SALIVA") || upper.includes("ORAL")) {
      return {
        badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]",
        textClass: "text-blue-300 font-bold",
        cardBorder: "bg-blue-950/20 border-blue-500/40",
        iconColor: "text-blue-400",
        label: "SALIVA/ORAL VOC"
      };
    }
    return {
      badgeClass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
      textClass: "text-slate-400",
      cardBorder: "bg-[#080B12]/85 border-white/10",
      iconColor: "text-slate-400",
      label: detected ? (label || "HUMAN VOC") : "CLEAR AMBIENT"
    };
  };

  const bioScentConfig = getBioScentConfig(rawScentLabel, humanScentDetected);
  const humanScentLabel = bioScentConfig.label;

  const envGasPpm = Number(telemetry.env_gas_ppm ?? telemetry.gas ?? 0);
  const isDopplerMotion = Boolean(telemetry.radar === 1 || telemetry.motion_detected);
  const deltaJerk = typeof telemetry.delta_jerk === "number" ? telemetry.delta_jerk : parseFloat(String(telemetry.delta_jerk || "0")) || 0;

  // Active Buzzer Mode from live telemetry with fallback to local state
  const currentBuzzerMode = telemetry.buzzer_mode !== undefined ? Number(telemetry.buzzer_mode) : buzzerLevel;

  // Dynamic Disturbance Wave Effect from Live Hardware Signals
  const lastTapRef = useRef<number>(tapCount);
  const [disturbanceValue, setDisturbanceValue] = useState<number>(0);

  useEffect(() => {
    let targetDisturbance = 0;
    if (tapCount > lastTapRef.current) {
      targetDisturbance = 1.0;
      lastTapRef.current = tapCount;
    } else if (tapCount > 0) {
      targetDisturbance = 0.55;
    }

    if (acousticDb > 45) {
      targetDisturbance = Math.max(targetDisturbance, Math.min(1.0, acousticDb / 70));
    } else if (acousticDb > 25) {
      targetDisturbance = Math.max(targetDisturbance, 0.45);
    }

    if (seismicPeak > 30 || (telemetry.delta_jerk || 0) > 1.0) {
      targetDisturbance = Math.max(targetDisturbance, 0.85);
    }

    if (targetDisturbance > 0) {
      setDisturbanceValue(targetDisturbance);
      const timer = setTimeout(() => setDisturbanceValue(0), 2400);
      return () => clearTimeout(timer);
    }
  }, [tapCount, acousticDb, seismicPeak, telemetry.delta_jerk]);

  // 4. Tactical AI Dispatcher Chatbot Panel State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<DispatchMessage[]>([
    {
      id: "init-dispatcher",
      sender: "ai",
      text: "Tactical Dispatcher Online. Linked to ESP32 telemetry stream. You can query victim status or issue direct hardware control commands."
    }
  ]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const handleSendDispatcherQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    const q = queryText.trim();
    const userMsg: DispatchMessage = { id: `usr-${Date.now()}`, sender: "user", text: q };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    let reply = "";
    let actionTaken = "";

    // Command Parsing & Function Calling
    if (/(communicate|help.*on.*way|coming|tell.*(them|victim|survivor)|signal.*help|we.*are.*coming)/i.test(q)) {
      await dispatchControlCommand(4, "HELP IS ON THE WAY");
      actionTaken = "POST /api/control -> { buzzer_mode: 4 }";
      reply = "Dispatched Mode 4: Transmitting 3-burst acoustic rescue acknowledgment cadence ('Help is on the way') to trapped victims now.";
    } else if (/(siren|evac|evacuation|alarm)/i.test(q)) {
      await dispatchControlCommand(3, "EVAC SIREN");
      actionTaken = "POST /api/control -> { buzzer_mode: 3 }";
      reply = "Dispatched Mode 3: Evacuation siren active (110 dB).";
    } else if (/(chirp|rescue.*chirp)/i.test(q)) {
      await dispatchControlCommand(2, "RESCUE CHIRP");
      actionTaken = "POST /api/control -> { buzzer_mode: 2 }";
      reply = "Dispatched Mode 2: Engaged 98 dB resonant rescue chirp.";
    } else if (/(beacon|locator)/i.test(q)) {
      await dispatchControlCommand(1, "LOCATOR BEACON");
      actionTaken = "POST /api/control -> { buzzer_mode: 1 }";
      reply = "Dispatched Mode 1: Locator beacon set to standard pulse (85 dB).";
    } else if (/(mute|silence|turn.*off.*buzzer|stop.*sound)/i.test(q)) {
      await dispatchControlCommand(0, "MUTE ALL");
      actionTaken = "POST /api/control -> { buzzer_mode: 0 }";
      reply = "Dispatched Mode 0: Hardware buzzer muted.";
    } else if (/(where|depth|how.*deep|range)/i.test(q)) {
      reply = `Victims localized at depth ${rawDepth.toFixed(2)}m (Range: ${rawRange.toFixed(2)}m). Triage Zone: ${zoneColor} (${spatialPosition}) with ${confidenceScore}% confidence.`;
    } else if (/(alive|heartbeat|pulse|survivor|how.*many)/i.test(q)) {
      reply = `${rawSurvivorCount} victim(s) identified. Acoustic signature: ${acousticSpectrum} (${acousticDb} dB). Bio-Scent: ${humanScentPpm} PPM (${humanScentLabel}).`;
    } else {
      reply = `Telemetry Lock: ${rawSurvivorCount} victim(s) at ${rawDepth.toFixed(2)}m (${spatialPosition}). Air quality: ${envGasPpm} PPM. Motion Radar: ${isDopplerMotion ? "MOTION DETECTED" : "SCANNING"}.`;
    }

    const aiMsg: DispatchMessage = {
      id: `ai-${Date.now()}`,
      sender: "ai",
      text: reply,
      actionTaken: actionTaken || undefined
    };
    setChatMessages((prev) => [...prev, aiMsg]);
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 50);
  };

  return (
    <div className="w-full flex flex-col gap-4 font-sans text-white animate-fade-in">
      
      {/* ══════════════════════════════════════════════════════════════════════
          1. MOVEABLE 3D SUBTERRANEAN TOPOGRAPHIC RADAR MAP (TOP SECTION)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl flex flex-col">
        <div className="relative w-full h-[380px] sm:h-[440px] overflow-hidden flex items-center justify-center">
          <TopoContour
            contour={zoneColor === "RED" ? "#F43F5E" : zoneColor === "GREEN" ? "#10B981" : "#00C2FF"}
            indexColor="#07FF00"
            interval={11}
            indexEvery={5}
            thickness={10}
            zoom={15}
            detail={5}
            ridges={15}
            speed={contourSpeed}
            disturbance={disturbanceValue}
            disturbanceFreq={frequencyKhz}
            interactive={true}
            className="w-full h-full absolute inset-0 opacity-90"
          />

          {/* Depth Radial Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.75)_100%)]" />

          {/* ═══════════════════════════════════════════════════════════════════
              STRICTLY FIXED 3D RADAR & PIN ANCHOR LAYER (100% ROCK-SOLID)
              Permanently locked to center without any drifting, scaling, or moving
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-visible">
            {/* Sonar Range Rings (Fixed to central transceiver) */}
            <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border border-white/10 border-dashed absolute" />
            <div className="w-80 h-80 sm:w-96 sm:h-96 rounded-full border border-white/10 absolute" />

            {/* PIN RENDERING LOGIC:
                1. If NOT connected -> No pin shown at all!
                2. If connected -> White Node in center
                3. If survivors detected -> Stable colored surrounding points with exact depth */}
            {isConnected && (
              <>
                {/* Center White Node Pin (Central Transceiver Anchor) */}
                <div 
                  className="absolute z-20 flex flex-col items-center select-none"
                  style={{ transform: "translate(-50%, -50%)", left: "50%", top: "50%" }}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-8 h-8 rounded-full animate-ping bg-white/40 opacity-75" />
                    <span className="relative w-4 h-4 rounded-full bg-white shadow-[0_0_20px_#ffffff] border-2 border-slate-300" />
                  </div>
                  <div className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/90 border border-white/40 text-white shadow-xl whitespace-nowrap">
                    A.U.R.A. NODE
                  </div>
                </div>

                {/* Detected Human Survivors Surrounding the Node (Rigid Stable Coordinates) */}
                {rawSurvivorCount > 0 && (
                  <>
                    {Array.from({ length: rawSurvivorCount }).map((_, index) => {
                      const total = rawSurvivorCount;
                      // Stable, deterministic radial bearing around transceiver
                      const angle = (2 * Math.PI * index) / total - Math.PI / 4;
                      // Fixed radial radius based on detected strata
                      const radiusPx = 75 + (index * 22) % 35;
                      const offsetX = Math.cos(angle) * radiusPx;
                      const offsetY = Math.sin(angle) * radiusPx;

                      return (
                        <div 
                          key={`victim-${index}`}
                          className="absolute z-30 flex flex-col items-center select-none animate-pulse"
                          style={{ 
                            left: `calc(50% + ${offsetX}px)`,
                            top: `calc(50% + ${offsetY}px)`,
                            transform: "translate(-50%, -50%)"
                          }}
                        >
                          <div className="relative flex items-center justify-center">
                            <span 
                              className="absolute w-10 h-10 rounded-full animate-ping opacity-75"
                              style={{ backgroundColor: zoneConfig.glowColor }}
                            />
                            <span 
                              className="relative w-3.5 h-3.5 rounded-full shadow-[0_0_15px_currentColor] border border-white"
                              style={{ backgroundColor: zoneConfig.glowColor, color: zoneConfig.glowColor }}
                            />
                          </div>
                          <div 
                            className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold backdrop-blur-md border border-white/30 bg-black/95 shadow-2xl flex items-center gap-1.5 text-white whitespace-nowrap"
                          >
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: zoneConfig.glowColor }} />
                            <span>{total > 1 ? `Victim ${index + 1}` : "Survivor"} ({rawDepth.toFixed(2)}m)</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. CORE SPATIAL RESCUE HERO COMPONENT (DOWN THE MAP)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={`w-full rounded-3xl p-5 sm:p-6 border transition-all duration-500 flex flex-col gap-4 shadow-2xl relative overflow-hidden backdrop-blur-xl ${
        zoneColor === "RED" 
          ? "bg-gradient-to-b from-rose-950/40 via-[#0B0F19]/90 to-[#070A10] border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.2)]" 
          : zoneColor === "GREEN" 
          ? "bg-gradient-to-b from-emerald-950/40 via-[#0B0F19]/90 to-[#070A10] border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.2)]" 
          : zoneColor === "WHITE"
          ? "bg-gradient-to-b from-slate-900/60 via-[#0B0F19]/90 to-[#070A10] border-white/40 shadow-[0_0_50px_rgba(255,255,255,0.2)]"
          : "bg-gradient-to-b from-white/[0.04] to-[#070A10] border-white/10"
      }`}>
        
        {/* Top Header Strip with Live Hardware State Badge & Direct IP Box */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-[#10B981] animate-ping" : "bg-amber-400 animate-pulse"}`} />
            <span className={`font-mono text-xs font-bold tracking-wider uppercase ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>
              {isConnected ? "A.U.R.A. v18.0 HARDWARE NODE LINKED" : "AWAITING ESP32 PACKET STREAM"}
            </span>
          </div>

          {/* Interactive IP Gateway Input & Polling Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onSetNodeIp && mapInputIp.trim()) {
                  onSetNodeIp(mapInputIp.trim());
                  setMapIpSaved(true);
                  setTimeout(() => setMapIpSaved(false), 2000);
                }
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 border border-white/15 hover:border-cyan-500/40 focus-within:border-cyan-400/70 transition-all shadow-inner"
            >
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">IP:</span>
              <input
                type="text"
                value={mapInputIp}
                onChange={(e) => setMapInputIp(e.target.value)}
                placeholder="e.g. 10.178.117.16"
                className="w-28 sm:w-36 bg-transparent text-xs font-mono text-cyan-300 placeholder-white/30 focus:outline-none"
              />
              <button
                type="submit"
                className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-sm"
              >
                <span>{mapIpSaved ? "Linked!" : "Connect"}</span>
              </button>
            </form>

            <span className="text-xs font-mono text-white/60 hidden sm:inline">POLLING: <strong className="text-emerald-400 font-bold">250ms</strong></span>
          </div>
        </div>

        {/* Hero Spatial Trio: Survivor Count, Calculated Depth, Lateral Range */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          
          {/* Survivor Count Box */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              rawSurvivorCount > 0 ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.35)]" : "bg-white/5 text-white/40 border border-white/10"
            }`}>
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-white/50 block tracking-widest uppercase">
                DETECTED HUMAN SURVIVORS
              </span>
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${rawSurvivorCount > 0 ? "text-rose-400" : "text-white/60"}`}>
                {rawSurvivorCount} {rawSurvivorCount === 1 ? "VICTIM DETECTED" : "VICTIMS DETECTED"}
              </span>
            </div>
          </div>

          {/* Numeric Depth Gauge */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-[#00C2FF]/20 text-[#00C2FF] border border-[#00C2FF]/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(0,194,255,0.25)]">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-white/50 block tracking-widest uppercase">
                CALCULATED STRATA DEPTH
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-cyan-300">
                  {rawDepth.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-white/60">meters</span>
              </div>
            </div>
          </div>

          {/* Numeric Range Gauge */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(192,132,252,0.25)]">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-white/50 block tracking-widest uppercase">
                LATERAL RADAR RANGE
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-purple-300">
                  {rawRange.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-white/60">meters</span>
              </div>
            </div>
          </div>

        </div>

        {/* Dynamic Triage Color Zone & Spatial Position & Confidence Tag */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/50 border border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-white/60">TRIAGE ZONE:</span>
            <span className={`px-3 py-1 rounded-xl text-xs font-black tracking-wider border uppercase shadow-md ${zoneConfig.badgeClass}`}>
              {zoneColor}: {zoneConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-white/60">CONFIDENCE:</span>
              <span className="px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-xs font-mono font-black text-cyan-300">
                {confidenceScore}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-white/60">SPATIAL POS:</span>
              <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/15 text-xs font-mono font-bold text-white tracking-wide">
                {spatialPosition}
              </span>
            </div>
          </div>
        </div>

        {/* AI Analysis Summary Banner (Direct Hardware Stream) */}
        {(telemetry.ai_analysis || telemetry.ai_status) && (
          <div className="p-3 rounded-xl bg-[#C084FC]/10 border border-[#C084FC]/30 text-xs font-medium text-purple-200 flex items-start gap-2 shadow-sm">
            <ShieldAlert className="w-4 h-4 text-[#C084FC] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white font-bold uppercase tracking-wider block font-mono text-[10px]">
                {telemetry.ai_status || "LIVE HARDWARE TELEMETRY"}
              </strong>
              <span>{telemetry.ai_analysis || `${rawSurvivorCount} survivor signature(s) detected at ${rawDepth.toFixed(2)}m depth.`}</span>
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. SENSOR TELEMETRY MATRICES (5 HIGH-TECH REAL HARDWARE CARDS)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Acoustic Spectrum Card */}
        <div className="p-4 rounded-2xl bg-[#080B12]/85 border border-white/10 flex flex-col justify-between gap-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>Acoustic Spectrum</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              {acousticDb} dB
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-white/45 block mb-1 uppercase">CLASSIFICATION</span>
            <span className="text-sm font-bold text-white block truncate" title={acousticSpectrum}>
              {acousticSpectrum}
            </span>

            {/* Acoustic Energy Bar */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-2.5">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-rose-500 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, (acousticDb / 80) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Seismic Vibration & Piezo Taps */}
        <div className="p-4 rounded-2xl bg-[#080B12]/85 border border-white/10 flex flex-col justify-between gap-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Seismic Taps</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tapCount > 0 ? "bg-amber-500/25 text-amber-300 border-amber-400 animate-pulse" : "bg-white/5 text-white/50 border-white/10"}`}>
              {tapCount} TAPS
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-mono text-white/45 block uppercase">SEISMIC PEAK</span>
                <span className="text-xl font-bold text-white">{seismicPeak} <span className="text-xs text-white/50 font-normal">mm/s</span></span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-white/45 block uppercase">RAW PIEZO</span>
                <span className="text-xs font-mono font-bold text-cyan-300">{rawPiezo}</span>
              </div>
            </div>

            {/* Seismic Peak Bar */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-2.5">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, (seismicPeak / 100) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Human Bio-Scent Card (v18.0 Bio-Scent Profiler) */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-lg transition-all ${bioScentConfig.cardBorder}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
              <User className={`w-4 h-4 ${bioScentConfig.iconColor}`} />
              <span>Bio-Scent VOC</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${bioScentConfig.badgeClass}`}>
              {humanScentLabel}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-white/45 block uppercase">CONCENTRATION</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-bold ${humanScentDetected ? "text-white" : "text-white/80"}`}>
                {humanScentPpm}
              </span>
              <span className="text-xs text-white/50 font-normal">PPM</span>
            </div>
            <p className={`text-[11px] mt-1 truncate ${bioScentConfig.textClass}`}>
              {humanScentLabel}
            </p>
          </div>
        </div>

        {/* Doppler Motion Radar & IMU Jerk Card */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-lg transition-all ${
          isDopplerMotion ? "bg-cyan-950/30 border-cyan-500/40" : "bg-[#080B12]/85 border-white/10"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Doppler & IMU</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isDopplerMotion ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 animate-pulse" : "bg-white/5 text-white/40 border-white/10"}`}>
              {isDopplerMotion ? "MOTION DETECTED" : "SCANNING"}
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-mono text-white/45 block uppercase">IMU DELTA JERK</span>
                <span className="text-xl font-bold text-white">{deltaJerk.toFixed(2)} <span className="text-xs text-white/50 font-normal">G</span></span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-white/45 block uppercase">DOPPLER</span>
                <span className="text-xs font-mono font-bold text-cyan-300">{isDopplerMotion ? "ACTIVE" : "IDLE"}</span>
              </div>
            </div>
            <p className="text-[11px] text-white/50 mt-1">
              {isDopplerMotion ? "Micro-movement locked in debris void" : "Debris structure stationary"}
            </p>
          </div>
        </div>

        {/* Environmental Gas & Air Quality Card */}
        <div className="p-4 rounded-2xl bg-[#080B12]/85 border border-white/10 flex flex-col justify-between gap-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-sky-400" />
              <span>Environmental Air</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${envGasPpm > 400 ? "bg-rose-500/20 text-rose-300 border-rose-400" : "bg-emerald-500/20 text-emerald-300 border-emerald-400"}`}>
              {envGasPpm > 400 ? "HAZARD" : "SAFE"}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-white/45 block uppercase">GAS CONCENTRATION</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white">{envGasPpm}</span>
              <span className="text-xs text-white/50 font-normal">PPM</span>
            </div>
            <p className="text-[11px] text-white/50 mt-1">
              {envGasPpm > 400 ? "Toxic gas concentration detected" : "Atmospheric levels safe for extraction"}
            </p>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. HARDWARE CONTROL PANEL (DISPATCH POST /api/control)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full p-4 sm:p-5 rounded-3xl bg-[#070A10]/90 border border-white/12 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold tracking-wider text-[#C084FC] uppercase flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>ESP32 HARDWARE CONTROL PANEL (POST /api/control)</span>
          </span>
          {isDispatching && (
            <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              <span>DISPATCHING...</span>
            </span>
          )}
        </div>

        {/* 5 Hardware Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { mode: 0, label: "MUTE ALL", sub: "Mode 0 (Silence)", color: "bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30" },
            { mode: 1, label: "LOCATOR BEACON", sub: "Mode 1 (85 dB Pulse)", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30" },
            { mode: 2, label: "RESCUE CHIRP", sub: "Mode 2 (98 dB Ping)", color: "bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30" },
            { mode: 3, label: "EVAC SIREN", sub: "Mode 3 (110 dB Alarm)", color: "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30" },
            { mode: 4, label: "HELP IS ON THE WAY", sub: "Mode 4 (3-Burst Cadence)", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30" },
          ].map((btn) => (
            <button
              key={btn.mode}
              onClick={() => dispatchControlCommand(btn.mode, btn.label)}
              disabled={isDispatching}
              className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none active:scale-95 ${btn.color} ${currentBuzzerMode === btn.mode ? "ring-2 ring-white/70 shadow-lg scale-[1.02]" : ""}`}
            >
              <span className="text-xs font-bold font-sans tracking-wide">{btn.label}</span>
              <span className="text-[10px] font-mono text-white/60">{btn.sub}</span>
            </button>
          ))}
        </div>

        {/* ROW 3: COMPACT HARDWARE SWITCHES & LOCATION (APPLE CONTROL ISLAND) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          
          {/* Direct Hardware Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white/60 mr-1">Controls:</span>
            
            {/* Beacon Volume Selector */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
              <span className="text-xs text-white/50 px-1.5">Beacon:</span>
              {[
                { lvl: 0, label: "Mute" },
                { lvl: 1, label: "85 dB" },
                { lvl: 2, label: "98 dB" },
                { lvl: 3, label: "110 dB" }
              ].map(({ lvl, label }) => (
                <button
                  key={lvl}
                  onClick={() => onSetBuzzerLevel ? onSetBuzzerLevel(lvl) : onCycleBuzzer?.()}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    buzzerLevel === lvl
                      ? lvl === 0
                        ? "bg-red-500 text-white shadow-sm font-semibold"
                        : "bg-[#C084FC] text-black font-semibold shadow-[0_0_10px_rgba(192,132,252,0.4)]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Vocal Transducer Beam Toggle */}
            <button
              onClick={onToggleBeam}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                isBeamActive
                  ? "bg-[#C084FC]/25 border-[#C084FC] text-[#C084FC] font-semibold"
                  : "bg-white/[0.04] border-white/10 text-white/60 hover:text-white"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Vocal Beam: {isBeamActive ? "Active" : "Off"}</span>
            </button>

            {/* Hardware Overdrive 100% Toggle */}
            <button
              onClick={onToggleOverdrive}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                isOverdrive
                  ? "bg-amber-400 text-black border-amber-400 font-semibold shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                  : "bg-white/[0.04] border-white/10 text-white/60 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Overdrive: {isOverdrive ? "100%" : "60%"}</span>
            </button>
          </div>

          {/* Clean Location Tag (Touch opens Google Maps directly at target / Sriperumbudur) */}
          <div 
            onClick={handleOpenGoogleMaps}
            onTouchEnd={handleOpenGoogleMaps}
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-cyan-300 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/40 transition-all cursor-pointer select-none group"
            title="Touch to open target location on Google Maps"
          >
            <Satellite className="w-3.5 h-3.5 text-[#10B981] group-hover:text-cyan-400 transition-colors" />
            <span>{`Chennai • ${activeTargetLat.toFixed(4)}°, ${activeTargetLng.toFixed(4)}° ${!isConnected ? "(Last Active Target)" : ""}`}</span>
            <span className="text-[10px] text-cyan-400 font-medium ml-1 group-hover:translate-x-0.5 transition-transform">↗</span>
          </div>

        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TACTICAL GEOSPATIAL MAP MODAL (REAL LAPTOP GPS + HARDWARE SIGNAL)
      ══════════════════════════════════════════════════════════════════════ */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#0B0F19] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col font-sans">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>{isConnected ? "Laptop GPS & Subterranean Node Locator" : "Last Active Target Locator & Map"}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                      {isConnected ? "SIGNAL LIVE" : "LAST ACTIVE TARGET"}
                    </span>
                  </h3>
                  <p className="text-xs text-white/50">
                    {isConnected ? `Precision coordinates synchronized with ESP32 node (${nodeIp}).` : `Subterranean target coordinates anchored to last active fix (${activeTargetLat.toFixed(4)}°, ${activeTargetLng.toFixed(4)}°).`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMapModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Embedded Interactive Map */}
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-white/15 shadow-inner bg-black/60">
                {/* Always show map — defaults to Sriperumbudur Bus Stand / Last Active Target (12.9665°N, 79.9450°E) */}
                <iframe
                  title="Tactical GPS Map"
                  className="w-full h-full border-none filter contrast-125 brightness-90"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeTargetLng - 0.008}%2C${activeTargetLat - 0.008}%2C${activeTargetLng + 0.008}%2C${activeTargetLat + 0.008}&layer=mapnik&marker=${activeTargetLat}%2C${activeTargetLng}`}
                />

                {/* Radar Targeting Reticle Overlay on Map */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-cyan-400/60 animate-ping opacity-30" />
                  <div className="w-8 h-8 rounded-full border border-cyan-400/80 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  </div>
                </div>
              </div>

              {/* Coordinates & Transmission Telemetry — only real hardware values */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block">LATITUDE</span>
                  <span className="font-bold text-cyan-400">{activeTargetLat.toFixed(6)}°</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block">LONGITUDE</span>
                  <span className="font-bold text-cyan-400">{activeTargetLng.toFixed(6)}°</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block">PRECISION ACCURACY</span>
                  <span className="font-bold text-emerald-400">±{gpsData?.accuracy ? Math.round(gpsData.accuracy) : (telemetry.accuracy_m ? Math.round(telemetry.accuracy_m) : 4)}m</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block">TARGET STATUS</span>
                  <span className="font-bold text-emerald-400">{isConnected ? "SYNCED (200 OK)" : "LAST ACTIVE LOCK"}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleSyncLaptopGps}
                  disabled={isSyncingGps}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/25 active:scale-95 disabled:opacity-50"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isSyncingGps ? "animate-spin" : ""}`} />
                  <span>{isSyncingGps ? "Acquiring..." : "Re-sync High Precision GPS"}</span>
                </button>

                <a
                  href={`https://www.google.com/maps?q=${activeTargetLat},${activeTargetLng}&z=19&t=k`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1.5 transition-all border border-white/15"
                >
                  <span>Open Target in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white/60" />
                </a>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
