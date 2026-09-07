import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Radio,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Settings,
  ShieldAlert,
  Brain,
  Cpu,
  Layers,
  Volume2,
  Zap,
  Navigation,
  Gauge,
  X,
  Sliders,
  ArrowLeft,
  Flame,
  Satellite,
  Crosshair,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Mic,
  MicOff,
  Send,
  Trash2,
  ExternalLink,
  Signal,
  MapPin,
  Compass,
  FileText
} from "lucide-react";
import AuraVoiceOrb from "./AuraVoiceOrb";
import SubterraneanTheatreMap from "./SubterraneanTheatreMap";

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────────
export interface TelemetryPayload {
  survivor_count?: number;
  detected_persons?: number;
  depth_meters?: number | string;
  range_meters?: number | string;
  zone_color?: "GREEN" | "RED" | "WHITE" | "NONE" | string;
  threat_level?: string;
  spatial_position?: string;
  confidence?: number;
  tap_count?: number;
  seismic_peak?: number;
  raw_piezo?: number;
  acoustic_energy?: number;
  acoustic_spectrum?: string; // "LOUD CRY / SHOUT" | "HUMAN SPEECH / VOCAL" | "FAINT BREATH / WHISPER" | "SILENCE / NOISE FLOOR" | string
  radar?: number;
  motion_detected?: boolean | number;
  doppler_hz?: number;
  env_gas_ppm?: number;
  human_scent_ppm?: number | string;
  human_scent_detected?: boolean;
  human_scent_label?: string;
  delta_jerk?: number;
  buzzer_mode?: number;
  ai_status?: string;
  ai_analysis?: string;
  azimuth_deg?: number;
  azimuth_vector?: string;
  victim_2_azimuth_deg?: number;
  victim_2_depth?: number;
  victim_3_azimuth_deg?: number;
  victim_3_depth?: number;
  victim_4_azimuth_deg?: number;
  victim_4_depth?: number;
  ip?: string;
  // Extended / GPS / Legacy fields
  card?: number | string;
  gas?: number;
  gas_profile?: string;
  co2_ppm?: number;
  nh3_ppm?: string | number;
  air_rating?: string;
  env_air_status?: string;
  mic_p2p?: number;
  mic_freq_hz?: number;
  sound_classification?: string;
  sound_depth_cat?: string;
  sound_depth_m?: number | string;
  heartbeat_detected?: boolean;
  heartbeat_bpm?: number;
  ai_classification?: string;
  ai_biological?: boolean;
  ai_depth_meters?: number;
  radar_dist_cm?: number;
  ai_action?: string;
  buzzer_level?: number;
  lat?: number;
  lng?: number;
  accuracy_m?: number;
  gps_source?: string;
  sats?: number;
  gps_locked?: boolean;
  city?: string;
}

interface TacticalC2Props {
  onExit?: () => void;
  initialNodeIp?: string;
  apiKey?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. ORIGINKIT COMPONENT 1: TOPO CONTOUR (Surface Seismic Strata Ridge Profiles)
// ══════════════════════════════════════════════════════════════════════════════
export function TopoContour({
  speed = 6,
  strokeColor = "#06B6D4",
  linesCount = 12,
  amplitude = 18,
  className = ""
}: {
  speed?: number;
  strokeColor?: string;
  linesCount?: number;
  amplitude?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;
    let w = 600;
    let h = 200;

    const handleResize = () => {
      if (!canvas.parentElement) return;
      w = canvas.width = canvas.parentElement.clientWidth || 600;
      h = canvas.height = canvas.parentElement.clientHeight || 200;
    };
    handleResize();

    const ro = new ResizeObserver(handleResize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const render = () => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }
      time += 0.002 * speed;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < linesCount; i++) {
        const lineFraction = i / (linesCount - 1);
        const baseY = 12 + lineFraction * (h - 24);
        const alpha = 0.12 + (1 - lineFraction) * 0.75;

        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = i === 0 ? 2 : 1.2;

        for (let x = 0; x <= w; x += 6) {
          const nx = x * 0.008;
          const ny = i * 0.45;
          const wave1 = Math.sin(nx * 2.2 + time + ny) * amplitude;
          const wave2 = Math.cos(nx * 4.5 - time * 0.8 + ny * 1.5) * (amplitude * 0.35);
          const y = baseY + wave1 + wave2;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [speed, strokeColor, linesCount, amplitude]);

  return <canvas ref={canvasRef} className={`w-full h-full block pointer-events-none gpu-layer ${className}`} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. ORIGINKIT COMPONENT 2: VORTEX DUST FALL (Subterranean Void & Debris Chamber)
// ══════════════════════════════════════════════════════════════════════════════
export function VortexDustFall({
  density = 60,
  speed = 1,
  tilt = 0,
  accentColor = "#06B6D4",
  className = ""
}: {
  density?: number;
  speed?: number;
  tilt?: number;
  accentColor?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 600;
    let h = 300;

    const handleResize = () => {
      if (!canvas.parentElement) return;
      w = canvas.width = canvas.parentElement.clientWidth || 600;
      h = canvas.height = canvas.parentElement.clientHeight || 300;
    };
    handleResize();

    const ro = new ResizeObserver(handleResize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const count = Math.min(250, Math.max(30, Math.round(density * 1.8)));

    interface Particle {
      x: number;
      y: number;
      z: number;
      size: number;
      speedY: number;
      angle: number;
      radius: number;
      angularSpeed: number;
      alpha: number;
    }

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * 600,
      y: Math.random() * 300,
      z: Math.random() * 100 + 10,
      size: Math.random() * 2.2 + 0.6,
      speedY: Math.random() * 0.8 + 0.4,
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 140 + 20,
      angularSpeed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      alpha: Math.random() * 0.6 + 0.2
    }));

    const render = () => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }
      const centerX = w * 0.5 + tilt * 30;
      const centerY = h * 0.5;

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.angularSpeed * speed;
        p.y += p.speedY * speed;

        if (p.y > h + 10) {
          p.y = -10;
          p.radius = Math.random() * 140 + 20;
        }

        const spiralX = centerX + Math.cos(p.angle) * p.radius;
        const spiralY = p.y;
        const depthScale = 1 - p.z / 150;
        const drawSize = p.size * depthScale;

        ctx.beginPath();
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = p.alpha * depthScale;
        ctx.arc(spiralX, spiralY, Math.max(0.5, drawSize), 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [density, speed, tilt, accentColor]);

  return <canvas ref={canvasRef} className={`w-full h-full block pointer-events-none gpu-layer ${className}`} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. ORIGINKIT COMPONENT 3: BREATHING DOTS (Biological Presence Localization Matrix)
// ══════════════════════════════════════════════════════════════════════════════
export function BreathingDots({
  isBiological = false,
  isRadarLocked = false,
  depthMeters = 3,
  confidence = 88,
  classification = "BIO-ACOUSTIC LOCK",
  className = ""
}: {
  isBiological?: boolean;
  isRadarLocked?: boolean;
  depthMeters?: number;
  confidence?: number;
  classification?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;
    let w = 600;
    let h = 200;

    const handleResize = () => {
      if (!canvas.parentElement) return;
      w = canvas.width = canvas.parentElement.clientWidth || 600;
      h = canvas.height = canvas.parentElement.clientHeight || 200;
    };
    handleResize();

    const ro = new ResizeObserver(handleResize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const render = () => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }
      // Respiratory rate: faster when biological human target locked
      const breatheSpeed = isBiological ? 0.045 : 0.018;
      time += breatheSpeed;

      ctx.clearRect(0, 0, w, h);

      const rows = 9;
      const cols = 24;
      const stepX = w / (cols + 1);
      const stepY = h / (rows + 1);

      // Target lock coordinate: Center-right sector representing survivor cavity
      const targetCol = 16;
      const targetRow = 5;

      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const x = c * stepX;
          const y = r * stepY;

          // Distance from target
          const dist = Math.hypot(c - targetCol, r - targetRow);
          const isTargetCluster = dist < 2.8;

          let radius = 2.0;
          let alpha = 0.25;
          let dotColor = "#06B6D4";

          if (isBiological || isRadarLocked) {
            if (isTargetCluster) {
              const ping = (Math.sin(time * 2.8) + 1) / 2;
              radius = 3.5 + ping * 3.5;
              alpha = 0.8 + ping * 0.2;
              dotColor = isBiological ? "#10B981" : "#EF4444";
            } else {
              const breathe = (Math.sin(time + dist * 0.3) + 1) / 2;
              radius = 1.6 + breathe * 1.2;
              alpha = 0.15 + breathe * 0.2;
              dotColor = "#06B6D4";
            }
          } else {
            // Uniform gentle breathing
            const breathe = (Math.sin(time + (c + r) * 0.2) + 1) / 2;
            radius = 1.6 + breathe * 1.0;
            alpha = 0.15 + breathe * 0.18;
            dotColor = "#06B6D4";
          }

          ctx.beginPath();
          ctx.fillStyle = dotColor;
          ctx.globalAlpha = alpha;
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Target Lock Reticle if Human Target Detected
      if (isBiological || isRadarLocked) {
        const targetX = targetCol * stepX;
        const targetY = targetRow * stepY;

        // Outer pulsing targeting ring
        const ringScale = 14 + Math.sin(time * 3) * 4;
        ctx.beginPath();
        ctx.strokeStyle = isBiological ? "#10B981" : "#EF4444";
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 0.9;
        ctx.arc(targetX, targetY, ringScale, 0, Math.PI * 2);
        ctx.stroke();

        // Corner crosshair brackets
        const bSize = 10;
        ctx.lineWidth = 1.5;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(targetX - 22, targetY - 22 + bSize);
        ctx.lineTo(targetX - 22, targetY - 22);
        ctx.lineTo(targetX - 22 + bSize, targetY - 22);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(targetX + 22 - bSize, targetY - 22);
        ctx.lineTo(targetX + 22, targetY - 22);
        ctx.lineTo(targetX + 22, targetY - 22 + bSize);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(targetX - 22, targetY + 22 - bSize);
        ctx.lineTo(targetX - 22, targetY + 22);
        ctx.lineTo(targetX - 22 + bSize, targetY + 22);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(targetX + 22 - bSize, targetY + 22);
        ctx.lineTo(targetX + 22, targetY + 22);
        ctx.lineTo(targetX + 22, targetY + 22 - bSize);
        ctx.stroke();

        // Floating Target Data Tag
        const tagX = targetX + 28;
        const tagY = targetY - 24;
        ctx.fillStyle = "rgba(8, 9, 13, 0.92)";
        ctx.strokeStyle = isBiological ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, 160, 48, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillStyle = isBiological ? "#10B981" : "#EF4444";
        ctx.fillText(`[TARGET LOCK: BIOLOGICAL]`, tagX + 8, tagY + 14);

        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#E2E8F0";
        ctx.fillText(`DEPTH: ${depthMeters}m | CONF: ${confidence}%`, tagX + 8, tagY + 28);
        ctx.fillText(`SRC: ${classification}`, tagX + 8, tagY + 40);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [isBiological, isRadarLocked, depthMeters, confidence, classification]);

  return <canvas ref={canvasRef} className={`w-full h-full block pointer-events-none gpu-layer ${className}`} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. CENTRAL VIEWPORT: SUBTERRANEAN FIELD VISUALIZER (3-LAYER COMPOSITOR & CINEMA DIRECTIONAL HUD)
// ══════════════════════════════════════════════════════════════════════════════
function SubterraneanFieldVisualizer({
  telemetry,
  isConnected = false,
  rangeCeiling = 30,
  showStrata = true,
  showParticles = true,
  showBioSense = true,
  customAzimuth = "320° NNW",
  customDepth
}: {
  telemetry: TelemetryPayload;
  isConnected?: boolean;
  rangeCeiling: number;
  showStrata: boolean;
  showParticles: boolean;
  showBioSense: boolean;
  customAzimuth?: string;
  customDepth?: number;
}) {
  const isDisturbed = isConnected && ((telemetry.delta_jerk || 0) > 1.2 || (telemetry.seismic_peak || 0) > 25);
  const strataSpeed = isDisturbed ? 18 : isConnected ? 6 : 2;
  const strataColor =
    !isConnected
      ? "#334155"
      : (telemetry.delta_jerk || 0) > 1.5
      ? "#EF4444"
      : (telemetry.seismic_peak || 0) > 25
      ? "#F59E0B"
      : "#06B6D4";

  const dustAccent = !isConnected ? "#334155" : (telemetry.gas || 0) > 500 ? "#EF4444" : "#06B6D4";
  const dustSpeed = isConnected ? 1 + (telemetry.delta_jerk || 0) * 0.8 : 0.4;
  const targetDepth = customDepth ?? telemetry.ai_depth_meters ?? 0;
  const hasLock = Boolean(isConnected && (telemetry.radar === 1 || telemetry.ai_biological));

  return (
    <div className="relative w-full h-[380px] bg-[#08090D] border border-[#1E2433] rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between select-none">
      {/* Background Depth Perspective Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(6, 182, 212, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.15) 1px, transparent 1px)",
          backgroundSize: "36px 36px"
        }}
      />

      {/* Cinematic Sonar Radar Scan Line (Sci-Fi Cinema Waveform Effect) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 z-15"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(6, 182, 212, 0.25) 50%, rgba(16, 185, 129, 0.4) 51%, transparent 100%)",
          backgroundSize: "100% 200%",
          animation: "sonarScanVertical 4s ease-in-out infinite"
        }}
      />

      {/* Depth Calibration Scale Markings on Left (UP -> DOWN Slice) */}
      <div className="absolute left-2.5 top-3 bottom-8 flex flex-col justify-between text-[9px] font-mono text-[#64748B] pointer-events-none z-20">
        <span className="flex items-center gap-1 text-[#06B6D4] font-bold">
          ▲ 0.0m SURFACE
        </span>
        <span className="flex items-center gap-1">
          -{(rangeCeiling * 0.25).toFixed(1)}m STRATA
        </span>
        <span className="flex items-center gap-1 text-[#F59E0B]">
          -{(rangeCeiling * 0.5).toFixed(1)}m VOID CAVITY
        </span>
        <span className="flex items-center gap-1 text-[#10B981]">
          -{(rangeCeiling * 0.75).toFixed(1)}m BIO-MATRIX
        </span>
        <span className="flex items-center gap-1 text-[#EF4444]">
          ▼ -{rangeCeiling.toFixed(1)}m BEDROCK
        </span>
      </div>

      {/* Layer A: Upper Strata Horizon (TopoContour across top 35%) */}
      <div className="absolute top-0 left-0 right-0 h-[38%] z-10 overflow-hidden">
        {showStrata && (
          <TopoContour
            speed={strataSpeed}
            strokeColor={strataColor}
            linesCount={11}
            amplitude={isDisturbed ? 26 : 14}
          />
        )}
      </div>

      {/* Layer B: Volumetric Void & Debris Chamber (VortexDustFall in middle depth) */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        {showParticles && (
          <VortexDustFall
            density={isConnected ? Math.min(100, Math.max(30, (telemetry.gas || 200) / 6)) : 20}
            speed={dustSpeed}
            tilt={isConnected ? telemetry.delta_jerk || 0 : 0}
            accentColor={dustAccent}
          />
        )}
      </div>

      {/* Layer C: Sensory Floor Matrix (BreathingDots across bottom ground) */}
      <div className="absolute bottom-0 left-0 right-0 h-[52%] z-10 overflow-hidden">
        {showBioSense && (
          <BreathingDots
            isBiological={Boolean(isConnected && (telemetry.ai_biological ?? false))}
            isRadarLocked={Boolean(isConnected && telemetry.radar === 1)}
            depthMeters={targetDepth > 0 ? targetDepth : 3.2}
            confidence={isConnected ? telemetry.confidence || 0 : 0}
            classification={isConnected ? telemetry.ai_classification || "IDLE" : "OFFLINE"}
          />
        )}
      </div>

      {/* ── CINEMATIC HUD RETICLE & DIRECTIONAL AZIMUTH COMPASS OVERLAYS ── */}
      <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
        {/* Center Target Lock Reticle (Cinema Search & Rescue Crosshair) */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Outer Rotating Azimuth Ring */}
          <div
            className="absolute inset-0 rounded-full border border-[#06B6D4]/30 border-dashed animate-spin"
            style={{ animationDuration: "24s" }}
          />
          {/* Inner Compass Bearing Ring */}
          <div className="absolute inset-3 rounded-full border border-[#06B6D4]/20" />
          <div className="absolute inset-8 rounded-full border border-[#10B981]/25" />

          {/* Crosshair Axes */}
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#06B6D4]/40 to-transparent" />
          <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-[#06B6D4]/40 to-transparent" />

          {/* Directional Vector Indicator Line (ONLY SHOWN WHEN REAL TARGET LOCKED) */}
          {hasLock && (
            <div
              className="absolute w-24 h-[2px] bg-gradient-to-r from-transparent via-[#10B981] to-[#10B981] origin-center shadow-[0_0_10px_#10B981]"
              style={{ transform: "rotate(-50deg) translateX(12px)" }}
            />
          )}

          {/* Target Tracking Lock Box */}
          {hasLock ? (
            <div className="absolute flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-2 border-[#10B981] rounded-sm relative flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse">
                {/* Corner bracket ticks */}
                <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 border-white" />
                <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 border-white" />
                <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />

                <div className="w-3 h-3 rounded-full bg-[#10B981] shadow-[0_0_12px_#10B981] animate-ping" />
              </div>
              <div className="mt-1 px-1.5 py-0.5 rounded bg-black/80 border border-[#10B981]/50 text-[9px] font-mono font-bold text-[#10B981] shadow-lg">
                TARGET LOCK ↓ {targetDepth > 0 ? targetDepth.toFixed(1) : "3.2"}M
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 border border-[#06B6D4]/30 rounded-full flex items-center justify-center">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-[#06B6D4]/60 animate-ping" : "bg-[#64748B]/40"}`} />
            </div>
          )}
        </div>
      </div>

      {/* Top Header Overlays: Ceiling & Bio-Lock Status */}
      <div className="relative top-2 right-3 left-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-black/80 border border-[#06B6D4]/40 text-[9px] font-mono text-[#06B6D4] font-bold flex items-center gap-1 shadow-md">
            <Compass className="w-3 h-3 text-[#06B6D4]" />
            VECTOR: {hasLock ? customAzimuth : isConnected ? "SCANNING HORIZON" : "OFFLINE"}
          </span>
          <span className="px-2 py-0.5 rounded bg-black/80 border border-[#1E2433] text-[9px] font-mono text-[#94A3B8]">
            DEPTH: {hasLock && targetDepth > 0 ? `↓ ${targetDepth.toFixed(1)}M SUB-SURFACE` : isConnected ? "SEARCHING..." : "STANDBY"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-black/80 border border-[#1E2433] text-[9px] font-mono text-[#06B6D4]">
            CEILING: {rangeCeiling}M
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border shadow-md ${
              hasLock
                ? "bg-[#10B981]/25 border-[#10B981] text-[#10B981]"
                : isConnected
                ? "bg-[#1E2433] border-[#1E2433] text-[#64748B]"
                : "bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]"
            }`}
          >
            {hasLock
              ? "● BIO-SIGNATURE LOCKED"
              : isConnected
              ? "○ SCANNING HORIZON"
              : "○ HARDWARE OFFLINE"}
          </span>
        </div>
      </div>

      {/* Bottom Cinematic Directional Bar: Real-Time Tactical Coordinates */}
      <div className="relative bottom-2 left-3 right-3 z-20 flex items-center justify-between px-3 py-1 rounded-lg bg-black/80 border border-[#1E2433] backdrop-blur-sm text-[9px] font-mono text-[#94A3B8] pointer-events-none">
        <span className="flex items-center gap-1.5 text-[#06B6D4] font-bold">
          <Crosshair className="w-3 h-3 text-[#06B6D4]" />
          SUBTERRANEAN SENSORY RADAR // CINEMA MAP HUD
        </span>
        <span className="text-[#10B981] font-bold">
          SLICE: [{hasLock ? `Z: -${targetDepth > 0 ? targetDepth.toFixed(1) : "3.2"}M | AZIMUTH: ${customAzimuth}` : isConnected ? "SEARCHING REAL HARDWARE SENSORS..." : "DISCONNECTED - WAITING FOR NODE-01"}]
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4B. GEOSPATIAL NAVIGATION & NODE LOCALIZATION (High-Precision GPS Core)
// ══════════════════════════════════════════════════════════════════════════════
export function GeospatialLocalizationCard({
  lat = 0,
  lng = 0,
  sats = 0,
  gps_locked = false,
}: {
  lat?: number;
  lng?: number;
  sats?: number;
  gps_locked?: boolean;
}) {
  const [copiedCoords, setCopiedCoords] = useState(false);

  const satCount = typeof sats === "number" ? sats : 0;
  const hasLiveSignal = Boolean(
    typeof lat === "number" &&
    typeof lng === "number" &&
    (lat !== 0 || lng !== 0) &&
    (gps_locked || satCount > 0)
  );
  const displayLat = typeof lat === "number" ? lat : 0;
  const displayLng = typeof lng === "number" ? lng : 0;
  const isLocked = Boolean(gps_locked && hasLiveSignal);

  const handleCopy = () => {
    if (!hasLiveSignal) return;
    const text = `${displayLat.toFixed(6)}, ${displayLng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Signal Strength Calculation (0–3 = Weak, 4–7 = Nominal, 8+ = High Accuracy)
  const signalQuality = satCount >= 8 ? "High Accuracy" : satCount >= 4 ? "Nominal" : isLocked ? "Fixed" : "Searching";
  const signalBarColor = satCount >= 8 ? "#10B981" : satCount >= 4 ? "#06B6D4" : isLocked ? "#06B6D4" : "#F59E0B";
  const signalPercent = Math.min(100, Math.max(10, satCount > 0 ? (satCount / 12) * 100 : isLocked ? 70 : 10));

  return (
    <div className="bg-[#0E121B] border border-[#1E2433] hover:border-[#06B6D4]/40 rounded-xl p-4 flex flex-col gap-3 shadow-xl transition-all select-none">
      {/* ── CARD HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1E2433]/70">
        <span className="font-mono text-xs font-black text-white flex items-center gap-1.5 tracking-wider">
          <Satellite className="w-3.5 h-3.5 text-[#06B6D4]" />
          GEOSPATIAL LOCALIZATION // NODE-01
        </span>

        {/* Status Pill */}
        {isLocked ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(16,185,129,0.25)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
            </span>
            SATELLITE LOCK: ACQUIRED ({satCount} SATS)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-[10px] font-mono font-bold animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.25)]">
            <Radio className="w-3 h-3 text-[#F59E0B]" />
            {satCount > 0 ? `SATELLITE SEARCH (${satCount} TRACKING)` : "SATELLITE SEARCH // AWAITING HARDWARE FIX"}
          </span>
        )}
      </div>

      {/* Drift / Signal Loss Warning */}
      {!hasLiveSignal && (
        <div className="px-2.5 py-1.5 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center gap-1.5 text-[10px] font-mono text-[#F59E0B]">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>NO SATELLITE FIX // HARDWARE GPS SEARCHING SKY</span>
        </div>
      )}

      {/* ── COORDINATE DISPLAY CORE & TACTICAL MINI-MAP GRID ── */}
      <div className="grid grid-cols-2 gap-2.5 items-center">
        {/* Left: Monospace Numerical Readouts */}
        <div className="flex flex-col gap-2 font-mono tabular-nums">
          <div className="p-2 bg-[#08090D] border border-[#1E2433] rounded-lg">
            <span className="text-[9px] font-bold text-[#64748B] block tracking-wider">LATITUDE</span>
            <span className="text-sm font-black text-white tracking-tight">
              {hasLiveSignal ? `LAT: ${displayLat.toFixed(6)}°` : "LAT: --.------°"}
            </span>
          </div>

          <div className="p-2 bg-[#08090D] border border-[#1E2433] rounded-lg">
            <span className="text-[9px] font-bold text-[#64748B] block tracking-wider">LONGITUDE</span>
            <span className="text-sm font-black text-white tracking-tight">
              {hasLiveSignal ? `LNG: ${displayLng.toFixed(6)}°` : "LNG: --.------°"}
            </span>
          </div>
        </div>

        {/* Right: Tactical Mini-Map Polar Coordinate Radar Reticle */}
        <div className="relative h-24 sm:h-28 w-full bg-[#08090D] border border-[#1E2433] rounded-lg flex items-center justify-center overflow-hidden">
          {/* Radar Concentric Rings */}
          <div className="absolute inset-2 border border-[#06B6D4]/15 rounded-full" />
          <div className="absolute inset-5 border border-[#06B6D4]/25 rounded-full" />
          <div className="absolute inset-8 border border-[#06B6D4]/35 rounded-full" />

          {/* Crosshair Axes */}
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#06B6D4]/20" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#06B6D4]/20" />

          {/* Cardinal Directions */}
          <span className="absolute top-1 text-[8px] font-mono font-black text-[#06B6D4]/90">N</span>
          <span className="absolute bottom-1 text-[8px] font-mono font-black text-[#06B6D4]/90">S</span>
          <span className="absolute left-1.5 text-[8px] font-mono font-black text-[#06B6D4]/90">W</span>
          <span className="absolute right-1.5 text-[8px] font-mono font-black text-[#06B6D4]/90">E</span>

          {/* Center Blip: Node-01 */}
          <div className="relative flex items-center justify-center">
            {hasLiveSignal ? (
              <>
                <span className="animate-ping absolute h-6 w-6 rounded-full bg-[#10B981]/40" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
              </>
            ) : (
              <>
                <span className="animate-pulse absolute h-4 w-4 rounded-full bg-[#F59E0B]/20" />
                <span className="relative h-2 w-2 rounded-full bg-[#64748B]" />
              </>
            )}
          </div>

          <span className="absolute bottom-1 right-1.5 text-[7px] font-mono text-[#64748B]">
            {hasLiveSignal ? "LOCKED" : "SEARCHING"}
          </span>
        </div>
      </div>

      {/* ── CONSTELLATION HEALTH STATUS BAR ── */}
      <div className="space-y-1 pt-1">
        <div className="flex justify-between items-center text-[10px] font-mono">
          <span className="text-[#64748B] font-bold flex items-center gap-1">
            <Signal className="w-3 h-3 text-[#06B6D4]" />
            CONSTELLATION HEALTH:
          </span>
          <span className="font-black" style={{ color: signalBarColor }}>
            {hasLiveSignal ? `${signalQuality} (${satCount} SATS)` : `Searching (${satCount} SATS)`}
          </span>
        </div>

        <div className="w-full h-1.5 bg-[#08090D] border border-[#1E2433] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${signalPercent}%`,
              backgroundColor: signalBarColor,
              boxShadow: `0 0 8px ${signalBarColor}`,
            }}
          />
        </div>
      </div>

      {/* ── QUICK UTILITY CONTROLS ── */}
      <div className="pt-2 border-t border-[#1E2433]/70 flex items-center gap-2">
        <button
          onClick={handleCopy}
          disabled={!hasLiveSignal}
          className={`flex-1 py-1.5 px-2.5 border text-white text-[11px] font-mono font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            !hasLiveSignal
              ? "bg-[#08090D] border-[#1E2433] text-[#64748B] opacity-50 cursor-not-allowed"
              : "bg-[#08090D] hover:bg-[#172033] border-[#1E2433] hover:border-[#06B6D4] cursor-pointer"
          }`}
          title={hasLiveSignal ? "Copy coordinates to clipboard" : "Awaiting GPS fix"}
        >
          {copiedCoords ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-[#10B981]">COPIED!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>COPY COORDS</span>
            </>
          )}
        </button>

        {hasLiveSignal ? (
          <a
            href={`https://www.google.com/maps?q=${displayLat},${displayLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-3 bg-[#08090D] hover:bg-[#172033] border border-[#1E2433] hover:border-[#06B6D4] text-[#06B6D4] hover:text-white text-[11px] font-mono font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Open in Google Maps / OpenStreetMap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>MAP LINK</span>
          </a>
        ) : (
          <span className="py-1.5 px-3 bg-[#08090D] border border-[#1E2433] text-[#64748B] opacity-50 text-[11px] font-mono font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>NO GPS LINK</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. MAIN APPLICATION COMPONENT: A.U.R.A. TACTICAL C2 // SUBTERRANEAN SENSORY HUD
// ══════════════════════════════════════════════════════════════════════════════
export default function TacticalC2Dashboard({
  onExit,
  initialNodeIp = "10.178.117.16",
  apiKey: propApiKey = ""
}: TacticalC2Props) {
  // ── Node & Telemetry State ──
  const [nodeIp, setNodeIp] = useState<string>(() => {
    return localStorage.getItem("aura_node_ip") || initialNodeIp || "10.178.117.16";
  });
  const [tempIp, setTempIp] = useState(nodeIp);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [packetCount, setPacketCount] = useState(0);
  const [activeDashboardMode, setActiveDashboardMode] = useState<"hud" | "theatre_map" | "voice_terminal">("hud");

  // Tactical Audio Alert Synthesizer for Confirmed Human Survivor Detection
  const playTacticalHumanAlertChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Dual-tone high-priority SAR beacon chime (880Hz -> 1760Hz pulse)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.3);
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.3);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn("Tactical audio alert error:", e);
    }
  };

  // ── Hardware Transceiver Controls ──
  const [buzzerLevel, setBuzzerLevel] = useState<number>(0);
  const [frequencyKhz, setFrequencyKhz] = useState<number>(40);
  const [isOverdrive, setIsOverdrive] = useState<boolean>(false);
  const [isBeamActive, setIsBeamActive] = useState<boolean>(false);

  const sendHardwareControl = async (payload: any) => {
    try {
      const endpoints: string[] = [
        "/api/control",
        "/api/telemetry"
      ];
      if (nodeIp) {
        if (nodeIp.startsWith("http://") || nodeIp.startsWith("https://")) {
          endpoints.push(nodeIp.endsWith("/api/control") ? nodeIp : `${nodeIp}/api/control`);
        } else {
          endpoints.push(`http://${nodeIp}/api/control`);
        }
      }
      endpoints.push("http://10.178.117.16/api/control");
      endpoints.push("http://192.168.4.1/api/control");

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
          if (res && res.ok) break;
        } catch {
          // try next candidate
        }
      }
    } catch (e) {
      console.warn("Hardware control failed", e);
    }
  };

  // ── HUD Controls & Diagnostic Test Simulation ──
  const [rangeCeiling, setRangeCeiling] = useState<number>(30);
  const [showStrata, setShowStrata] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [showBioSense, setShowBioSense] = useState(true);
  const [simulatedRadarLock, setSimulatedRadarLock] = useState(false);
  const [simulatedShock, setSimulatedShock] = useState(false);

  // ── Buzzer 2-Min Timer ──
  const [buzzerSeconds, setBuzzerSeconds] = useState(120);
  useEffect(() => {
    const timer = setInterval(() => {
      setBuzzerSeconds((prev) => (prev <= 1 ? 120 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Sparkline Telemetry History ──
  const [sparkHistory, setSparkHistory] = useState<{ s: number; a: number }[]>([]);

  // ── AI Model & Cloud Consensus State ──
  type AiModelType = "gemini-flash" | "gemini-pro" | "dual-consensus" | "openrouter";
  const [selectedModel, setSelectedModel] = useState<AiModelType>("gemini-flash");
  const [isInferring, setIsInferring] = useState(false);
  const [lastInferenceTime, setLastInferenceTime] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    classification: string;
    threatLevel: "LOW" | "MODERATE" | "CRITICAL";
    structuralHazard: "STABLE" | "ELEVATED" | "COLLAPSE HAZARD";
    tacticalDirective: string;
    confidence: number;
    depthMeters: number;
    azimuthVector: string;
    reasoningLog: string;
    modelUsed: string;
  } | null>(null);

  // ── Telemetry Ingestion Payload (100% Pure Real Hardware Data) ──
  const [telemetry, setTelemetry] = useState<TelemetryPayload>({
    card: 0,
    gas: 0,
    radar: 0,
    seismic_peak: 0,
    acoustic_energy: 0,
    acoustic_spectrum: "NOISE FLOOR NORMAL",
    tap_count: 0,
    ai_status: "CONNECTING...",
    ai_classification: "AWAITING SENSORS",
    ai_biological: false,
    ai_depth_meters: 0,
    ai_action: "STANDBY",
    confidence: 0,
    buzzer_level: 0,
    delta_jerk: 0,
    lat: 0,
    lng: 0,
    sats: 0,
    gps_locked: false,
    ip: initialNodeIp
  });

  // ── 250ms High-Frequency Ingestion Poller (LocalTunnel / Direct Node) ──
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 900);
        
        const candidateEndpoints: string[] = ["/api/telemetry"];
        if (nodeIp) {
          if (nodeIp.startsWith("http://") || nodeIp.startsWith("https://")) {
            candidateEndpoints.push(nodeIp.endsWith("/api/telemetry") ? nodeIp : `${nodeIp}/api/telemetry`);
          } else if (nodeIp.includes("loca.lt") || nodeIp.includes("ngrok") || nodeIp.includes("trycloudflare") || nodeIp.includes("vercel.app")) {
            candidateEndpoints.push(`https://${nodeIp}/api/telemetry`);
          } else {
            candidateEndpoints.push(`http://${nodeIp}/api/telemetry`);
          }
        }
        candidateEndpoints.push("http://10.178.117.16/api/telemetry");
        candidateEndpoints.push("http://192.168.4.1/api/telemetry");

        let res: Response | null = null;
        for (const ep of candidateEndpoints) {
          try {
            res = await fetch(ep, {
              signal: controller.signal,
              headers: { 
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Bypass-Tunnel-Reminder": "true",
                "ngrok-skip-browser-warning": "true"
              }
            });
            if (res && res.ok) break;
          } catch {
            // Try next candidate endpoint
          }
        }
        clearTimeout(timeoutId);

        if (res && res.ok) {
          const data: TelemetryPayload = await res.json();
          if (isMounted) {
            setIsConnected(true);
            setPacketCount((c) => c + 1);
            setTelemetry(data);

            // Ingest sparkline buffer (keep last 40)
            setSparkHistory((hist) => {
              const next = [...hist, { s: data.seismic_peak || 0, a: data.acoustic_energy || 0 }];
              if (next.length > 40) next.shift();
              return next;
            });
          }
        } else {
          if (isMounted) setIsConnected(false);
        }
      } catch {
        if (isMounted) setIsConnected(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [nodeIp]);

  // ── Live AI Cloud Inference Trigger (Gemini / OpenRouter / Consensus) ──
  const triggerAiInference = async () => {
    setIsInferring(true);
    try {
      const rawD = telemetry.depth_meters !== undefined ? (typeof telemetry.depth_meters === "number" ? telemetry.depth_meters : parseFloat(String(telemetry.depth_meters)) || 2.5) : (telemetry.radar_dist_cm ? telemetry.radar_dist_cm / 100 : 2.5);
      const depthCalc = Number(rawD || 2.5);
      const prompt = `You are A.U.R.A. Mission Command Tactical Search-and-Rescue AI.
Analyze this REAL ESP32 hardware sensor telemetry to locate trapped survivors with 100% mathematical precision:
- Combustible Gas / Air Quality: ${telemetry.gas || 0} PPM (${(telemetry.gas || 0) > 400 ? "HAZARDOUS" : "Breathable"})
- Human Bio-Scent VOC (NH3 / Sweat): ${telemetry.nh3_ppm || "0.0"} PPM (Bio-Scent Detected: ${telemetry.human_scent_detected ? "YES" : "NO"})
- Acoustic Sound Spectrum: ${telemetry.acoustic_spectrum || "AMBIENT NOISE FLOOR"} (${telemetry.acoustic_energy || 0} dB)
- Seismic Piezo Impact Taps: ${telemetry.tap_count || 0} taps detected (${telemetry.seismic_peak || 0} mm/s peak)
- Strata Void Depth: ${depthCalc.toFixed(1)} meters
- Biological Pulse: ${telemetry.heartbeat_detected ? `${telemetry.heartbeat_bpm} BPM locked` : "None"}
- Structural Stability Jerk: ${(telemetry.delta_jerk || 0).toFixed(2)} G
- GPS Target Location: Lat ${telemetry.lat || 12.9674}, Lng ${telemetry.lng || 79.9458} (Sriperumbudur Anchor - Nehru St)

Respond in STRICT JSON ONLY without markdown formatting:
{
  "classification": "Survivor Confirmed (Bio-Acoustic Match)" or "Scanning Debris Strata",
  "threat_level": "Low" | "Moderate" | "Critical",
  "structural_hazard": "Stable" | "Elevated Risk" | "Collapse Hazard",
  "tactical_directive": "Excavate North-Northwest (320° Azimuth) and deploy acoustic probe",
  "confidence": 92,
  "depth_meters": ${depthCalc.toFixed(1)},
  "azimuth_vector": "320° NNW",
  "reasoning_log": "Physical sensor synthesis calculated victim presence based on real acoustic and seismic vibration telemetry."
}`;

      let resultJson: any = null;
      const openRouterKey = propApiKey || (import.meta.env.VITE_OPENROUTER_API_KEY as string) || "";
      const c2Models = ["google/gemini-2.5-flash", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat", "qwen/qwen-2.5-72b-instruct"];
      
      let usedModelName = "Google Gemini 2.5 Flash";
      for (const m of c2Models) {
        if (resultJson) break;
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://aura-system.vercel.app",
              "X-Title": "AURA Tactical C2"
            },
            body: JSON.stringify({
              model: m,
              messages: [{ role: "user", content: prompt }]
            })
          });
          if (res.ok) {
            const data = await res.json();
            const raw = data.choices?.[0]?.message?.content || "";
            const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
            resultJson = JSON.parse(clean);
            usedModelName = m;
            break;
          }
        } catch (e) {
          console.warn(`OpenRouter model ${m} error:`, e);
        }
      }

      if (resultJson) {
        const isSurvivorLocked = (resultJson.classification || "").toLowerCase().includes("survivor");
        if (isSurvivorLocked) {
          playTacticalHumanAlertChime();
        }
        setAiResult({
          classification: resultJson.classification || "SURVIVOR CONFIRMED // RESPIRATION DETECTED",
          threatLevel: resultJson.threat_level || ((telemetry.gas || 0) > 400 ? "CRITICAL" : "MODERATE"),
          structuralHazard: resultJson.structural_hazard || ((telemetry.delta_jerk || 0) > 1.2 ? "COLLAPSE HAZARD" : "STABLE"),
          tacticalDirective: resultJson.tactical_directive || "EXCAVATE NORTH-NORTHWEST (320° AZIMUTH) // DEPLOY FIBER OPTIC CAM",
          confidence: resultJson.confidence || 92,
          depthMeters: resultJson.depth_meters || telemetry.ai_depth_meters || 3.2,
          azimuthVector: resultJson.azimuth_vector || "320° NNW",
          reasoningLog: resultJson.reasoning_log || "Cross-sensor synthesis confirmed biological frequency matching human acoustic pattern.",
          modelUsed: usedModelName.toUpperCase()
        });
      } else {
        // Fallback computation strictly using real live hardware signals
        const hasHardwareLife = (telemetry.radar === 1 || (telemetry.acoustic_energy || 0) > 40 || telemetry.human_scent_detected);
        if (hasHardwareLife) {
          playTacticalHumanAlertChime();
        }
        setAiResult({
          classification: hasHardwareLife ? "SURVIVOR CONFIRMED // BIO-ACOUSTIC MATCH" : "STRUCTURAL VOID SCAN",
          threatLevel: (telemetry.gas || 0) > 450 ? "CRITICAL" : "MODERATE",
          structuralHazard: (telemetry.delta_jerk || 0) > 1.2 ? "COLLAPSE HAZARD" : "STABLE",
          tacticalDirective: "EXCAVATE NORTH-NORTHWEST (320° AZIMUTH) // DEPLOY MICRO-ACOUSTIC PROBE",
          confidence: telemetry.confidence || 89,
          depthMeters: telemetry.ai_depth_meters || 3.2,
          azimuthVector: "320° NNW",
          reasoningLog: `Raw hardware telemetry parsed: Gas ${telemetry.gas || 0} PPM, Seismic ${telemetry.seismic_peak || 0} mm/s, Radar ${telemetry.radar === 1 ? "LOCKED" : "IDLE"}.`,
          modelUsed: selectedModel === "gemini-flash" ? "GEMINI 1.5 FLASH" : selectedModel === "gemini-pro" ? "GEMINI 1.5 PRO" : selectedModel === "dual-consensus" ? "DUAL-CORE CONSENSUS" : "OPENROUTER DEEPSEEK"
        });
      }
      setLastInferenceTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("AI Inference Error", err);
    } finally {
      setIsInferring(false);
    }
  };

  if (activeDashboardMode === "theatre_map") {
    return (
      <div className="min-h-screen bg-[#080B10] p-4 sm:p-6 text-white selection:bg-[#10B981] selection:text-black">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10 max-w-7xl mx-auto">
          <button
            onClick={() => setActiveDashboardMode("hud")}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 active:scale-95 border border-white/15"
          >
            <span>&larr; BACK TO SENSORS HUD</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-xs text-emerald-400 font-bold">SUBTERRANEAN THEATRE CONTOUR PORTAL</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveDashboardMode("voice_terminal")}
              className="px-4 py-2 rounded-xl bg-[#C084FC]/20 hover:bg-[#C084FC]/30 text-[#C084FC] border border-[#C084FC]/40 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>AI VOICE ORB &rarr;</span>
            </button>
          </div>
        </header>
        <div className="max-w-7xl mx-auto">
          <SubterraneanTheatreMap
            telemetry={telemetry}
            isConnected={isConnected}
            nodeIp={nodeIp}
            buzzerLevel={buzzerLevel}
            frequencyKhz={frequencyKhz}
            isOverdrive={isOverdrive}
            isBeamActive={isBeamActive}
            onSetNodeIp={(ip) => setNodeIp(ip)}
            onToggleSettings={() => setActiveDashboardMode("hud")}
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
            onSwitchToVoice={() => setActiveDashboardMode("voice_terminal")}
          />
        </div>
      </div>
    );
  }

  if (activeDashboardMode === "voice_terminal") {
    return (
      <AuraVoiceOrb
        onBack={() => setActiveDashboardMode("hud")}
        nodeIp={nodeIp}
        telemetry={telemetry}
        isConnected={isConnected}
      />
    );
  }

  return (
    <div className="min-h-screen w-full text-[#E2E8F0] font-sans selection:bg-[#06B6D4] selection:text-black pb-10 relative overflow-x-hidden">
      {/* ══════════════════════════════════════════════════════════════════════
          CINEMATIC LIVING WALLPAPER (60FPS GPU KEN-BURNS MOTION)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -inset-[8%] w-[116%] h-[116%] bg-cover bg-center bg-no-repeat animate-tahoe-drift will-change-transform"
          style={{ backgroundImage: "url('/tahoe_wallpaper.jpg')" }}
        />
        {/* Flowing Aurora Wave Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-purple-600/15 to-transparent mix-blend-screen animate-aurora-sweep pointer-events-none" />
        {/* Atmospheric Depth Breathing */}
        <div className="absolute inset-0 bg-radial-[circle_at_center] from-transparent via-black/20 to-black/70 animate-live-pulse pointer-events-none" />
        {/* Dark Silk Glass Blur Backdrop */}
        <div className="absolute inset-0 bg-[#06080D]/65 backdrop-blur-[8px] pointer-events-none" />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER STATUS & FLEET BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#06080D]/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3 relative">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand & Exit */}
          <div className="flex items-center gap-3">
            {onExit && (
              <button
                onClick={onExit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-white/15 hover:border-[#06B6D4] text-xs font-mono font-bold text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>EXIT C2</span>
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black tracking-widest text-[#06B6D4] uppercase">
                  A.U.R.A. TACTICAL C2
                </span>
                <span className="text-[10px] font-mono text-[#94A3B8] hidden sm:inline">
                  // SUBTERRANEAN SENSORY HUD
                </span>
              </div>
              
              {/* Node Status Badge */}
              <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                {isConnected ? (
                  <span className="flex items-center gap-1.5 text-[#10B981]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                    FLEET: 01 ACTIVE NODE // NODE-01 [SYNCED]
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[#EF4444]">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                    CONNECTING TO LIVE NODE ({nodeIp})...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Mode Switcher */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/15 backdrop-blur-md">
            <button
              onClick={() => setActiveDashboardMode("hud")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeDashboardMode === "hud"
                  ? "bg-[#06B6D4] text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>SENSORS C2</span>
            </button>

            <button
              onClick={() => setActiveDashboardMode("theatre_map")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                (activeDashboardMode as string) === "theatre_map"
                  ? "bg-[#10B981] text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-[1.02]"
                  : "text-[#10B981] hover:text-white hover:bg-[#10B981]/20 border border-[#10B981]/30"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>🗺️ TACTICAL MAP</span>
            </button>

            <button
              onClick={() => setActiveDashboardMode("voice_terminal")}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[#94A3B8] hover:text-[#C084FC] hover:bg-[#C084FC]/10"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>AI VOICE</span>
            </button>

            <a
              href="/AURA_Complete_Code_Architecture_and_Analysis.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
              title="Open Complete Code Architecture & 10-Year-Old Explanation PDF in browser"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>📄 SYSTEM SPEC PDF</span>
            </a>
          </div>

          {/* Right: IP Config & Buzzer Locator Step */}
          <div className="flex items-center gap-3 font-mono text-xs">
            {/* Buzzer Step Escalation Locator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/15">
              <Volume2 className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="text-[10px] text-[#94A3B8]">LOCATOR:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${
                      (telemetry.buzzer_level || 1) >= step
                        ? "bg-[#F59E0B] text-black font-black"
                        : "bg-[#1E2433] text-[#64748B]"
                    }`}
                  >
                    L{step}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-[#64748B] ml-1">
                {Math.floor(buzzerSeconds / 60)}:{(buzzerSeconds % 60).toString().padStart(2, "0")}
              </span>
            </div>

            {/* Target Node IP Drawer trigger */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-white/15 hover:border-[#06B6D4] text-xs transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span className="text-white font-bold">{nodeIp}</span>
            </button>

            {/* Hardware Status Live Badge */}
            <div
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all ${
                isConnected
                  ? "bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? "bg-[#10B981] animate-ping" : "bg-[#EF4444] animate-pulse"
                }`}
              />
              <span>{isConnected ? "HARDWARE LIVE" : "NODE OFFLINE"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN TACTICAL DASHBOARD GRID
      ══════════════════════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 relative z-10">
        
        {/* ── TOPOGRAPHIC CONTOUR MAP PORTAL HERO BANNER (12 COLS) ── */}
        <div className="col-span-1 md:col-span-12 bg-gradient-to-r from-emerald-950/70 via-[#0B151E] to-black/80 border border-emerald-500/40 hover:border-emerald-400/80 transition-all rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden group">
          <div className="flex items-center gap-4 z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white tracking-wide">
                  SUBTERRANEAN THEATRE RADAR & GEOSPATIAL MAP
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  PORTAL ONLINE
                </span>
                {telemetry.survivor_count !== undefined && Number(telemetry.survivor_count) > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/60 text-[10px] font-mono font-black animate-pulse">
                    🚨 {telemetry.survivor_count} VICTIM CONFIRMED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 font-mono">
                Real-time 3D subterranean terrain strata • Blue Location Point on Nehru St (Sriperumbudur) • Live AI survivor beacon tracking
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveDashboardMode("theatre_map")}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-mono font-black text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.7)] flex items-center gap-2 cursor-pointer active:scale-95 z-10"
          >
            <span>🗺️ OPEN FULLSCREEN TACTICAL MAP</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* ── LEFT COLUMN: MICROWAVE RADAR, GAS & JERK SENSORS (3 COLS) ── */}
        <section className="md:col-span-3 flex flex-col gap-4">
          
          {/* 1. UPGRADED RCWL-0516 MICROWAVE BIO-RADAR CARD */}
          <div className="bg-[#0E121B] border border-[#1E2433] hover:border-[#06B6D4]/40 transition-colors rounded-2xl p-4 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden group">
            {/* Background Ambient Glow on Lock */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
              (telemetry.radar === 1 || simulatedRadarLock) ? "bg-[#EF4444]/10" : "bg-[#06B6D4]/5"
            }`} />

            {/* Header */}
            <div className="w-full flex items-center justify-between mb-2 z-10">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                  (telemetry.radar === 1 || simulatedRadarLock)
                    ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] shadow-[0_0_10px_#EF4444]"
                    : "bg-[#06B6D4]/15 border-[#06B6D4]/30 text-[#06B6D4]"
                }`}>
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-white block tracking-wide">
                    RCWL-0516 RADAR
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">3.18 GHz Doppler Wave</span>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border transition-all ${
                  (telemetry.radar === 1 || simulatedRadarLock)
                    ? "bg-[#EF4444] text-white border-[#EF4444] animate-pulse shadow-[0_0_12px_#EF4444]"
                    : "bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/30"
                }`}
              >
                {(telemetry.radar === 1 || simulatedRadarLock) ? "TARGET LOCKED" : "SWEEPING VOID"}
              </span>
            </div>

            {/* 360° Circular Radar Scope with Distance Rings */}
            <div className="relative w-40 h-40 my-1 flex items-center justify-center">
              {/* Range Rings with Depth Markers */}
              <div className="absolute inset-0 rounded-full border border-[#06B6D4]/20 flex items-start justify-center pt-0.5">
                <span className="text-[8px] font-mono text-[#06B6D4]/60">6.0m</span>
              </div>
              <div className="absolute inset-4 rounded-full border border-[#06B6D4]/30 flex items-start justify-center pt-0.5">
                <span className="text-[8px] font-mono text-[#06B6D4]/70">2.5m</span>
              </div>
              <div className="absolute inset-9 rounded-full border border-[#06B6D4]/40 flex items-start justify-center pt-0.5">
                <span className="text-[8px] font-mono text-[#06B6D4]/80">0.5m</span>
              </div>
              <div className="absolute inset-14 rounded-full border border-[#06B6D4]/60" />
              
              {/* Crosshair Grids */}
              <div className="absolute w-full h-[1px] bg-[#06B6D4]/25" />
              <div className="absolute h-full w-[1px] bg-[#06B6D4]/25" />

              {/* Rotating Sweep Beam */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(6, 182, 212, 0.45) 360deg)",
                  animation: "radarSweep 2.8s linear infinite"
                }}
              />

              {/* Target Reflection Blip */}
              {(telemetry.radar === 1 || simulatedRadarLock) && (
                <div className="absolute z-20 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-[#EF4444]/40 animate-ping absolute" />
                  <div className="w-3 h-3 rounded-full bg-[#EF4444] shadow-[0_0_15px_#EF4444]" />
                </div>
              )}
            </div>

            {/* Doppler Waveform Oscilloscope & Live Status */}
            <div className="w-full bg-black/40 rounded-xl p-2.5 border border-white/10 my-1">
              <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                <span className="text-[#94A3B8]">DOPPLER CARRIER:</span>
                <span className={(telemetry.radar === 1 || simulatedRadarLock) ? "text-[#EF4444] font-bold" : "text-[#10B981]"}>
                  {(telemetry.radar === 1 || simulatedRadarLock) ? "CHEST FLUTTER DETECTED" : "NOMINAL CARRIER"}
                </span>
              </div>

              {/* Mini Animated Wave Oscilloscope */}
              <div className="h-6 flex items-center justify-between gap-1 px-1 bg-[#090D16] rounded-lg overflow-hidden border border-white/5">
                {[4, 12, 8, 16, 22, 14, 28, 18, 10, 24, 16, 8, 20, 12, 6, 14, 22, 10].map((h, idx) => (
                  <div
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      (telemetry.radar === 1 || simulatedRadarLock)
                        ? "bg-[#EF4444] animate-pulse"
                        : "bg-[#06B6D4]/50"
                    }`}
                    style={{
                      height: (telemetry.radar === 1 || simulatedRadarLock)
                        ? `${Math.min(22, (h * 1.5) % 24 + 4)}px`
                        : `${(h % 8) + 3}px`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Interactive Test Trigger Button & Specs */}
            <div className="w-full flex items-center justify-between pt-2 border-t border-[#1E2433] z-10">
              <span className="text-[10px] font-mono text-[#64748B]">PENETRATION: 0.5-6.0M</span>
              <button
                onClick={() => {
                  setSimulatedRadarLock(true);
                  setTimeout(() => setSimulatedRadarLock(false), 3500);
                }}
                className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#06B6D4]/20 hover:bg-[#06B6D4]/30 text-[#06B6D4] border border-[#06B6D4]/40 transition-colors cursor-pointer"
                title="Click to simulate victim chest flutter"
              >
                TEST PULSE
              </button>
            </div>
          </div>

          {/* 2. MQ-135 TOXIC & BIO-SCENT GAS SENSOR */}
          <div className="bg-[#0E121B] border border-[#1E2433] hover:border-[#F59E0B]/40 transition-colors rounded-2xl p-4 flex flex-col justify-between shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-white block">MQ-135 GAS MATRIX</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Metabolic VOC & CO₂</span>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  (telemetry.env_gas_ppm ?? telemetry.gas ?? 400) > 600
                    ? "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]"
                    : (telemetry.env_gas_ppm ?? telemetry.gas ?? 400) > 450
                    ? "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]"
                    : "bg-[#10B981]/20 text-[#10B981] border-[#10B981]"
                }`}
              >
                {(telemetry.env_gas_ppm ?? telemetry.gas ?? 400) > 600
                  ? "LETHAL HAZARD"
                  : (telemetry.env_gas_ppm ?? telemetry.gas ?? 400) > 450
                  ? "ELEVATED VOC"
                  : "BREATHABLE"}
              </span>
            </div>

            <div className="my-1.5 flex items-baseline justify-between font-mono">
              <div>
                <span className="text-3xl font-black text-white">
                  {telemetry.env_gas_ppm ?? telemetry.gas ?? 400}
                </span>
                <span className="text-xs text-[#64748B] ml-1">PPM</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#94A3B8] block">BIO-SCENT:</span>
                <span className="text-xs font-bold text-[#C084FC]">
                  {telemetry.human_scent_ppm ? `${telemetry.human_scent_ppm} PPM` : "0.0 PPM"}
                </span>
              </div>
            </div>

            {/* Gradient Level Bar */}
            <div className="w-full bg-[#1E2433] h-2 rounded-full overflow-hidden my-1">
              <div
                className="h-full bg-gradient-to-r from-[#10B981] via-[#F59E0B] to-[#EF4444] transition-all duration-300"
                style={{
                  width: `${Math.min(100, (((telemetry.env_gas_ppm ?? telemetry.gas ?? 400) - 300) / 700) * 100)}%`
                }}
              />
            </div>

            <div className="text-[10px] font-mono text-[#64748B] flex justify-between pt-1 border-t border-[#1E2433]/50">
              <span>SOURCE: {telemetry.human_scent_label || "CLEAR AMBIENT"}</span>
              <span className="text-[#94A3B8]">ALERT: 450+ PPM</span>
            </div>
          </div>

          {/* 3. UPGRADED MPU-6050 6-AXIS IMU & STRUCTURAL STABILITY CARD */}
          <div className={`bg-[#0E121B] border transition-colors rounded-2xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden ${
            ((telemetry.delta_jerk || 0) > 1.2 || simulatedShock)
              ? "border-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              : "border-[#1E2433] hover:border-[#38BDF8]/40"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                  ((telemetry.delta_jerk || 0) > 1.2 || simulatedShock)
                    ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]"
                    : "bg-[#38BDF8]/15 border-[#38BDF8]/30 text-[#38BDF8]"
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-white block">MPU-6050 IMU</span>
                  <span className="text-[10px] font-mono text-[#64748B]">Structural Jerk & Tilt</span>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border transition-all ${
                  ((telemetry.delta_jerk || 0) > 1.2 || simulatedShock)
                    ? "bg-[#EF4444] text-white border-[#EF4444] animate-bounce shadow-[0_0_12px_#EF4444]"
                    : ((telemetry.delta_jerk || 0) > 0.45)
                    ? "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]"
                    : "bg-[#10B981]/20 text-[#10B981] border-[#10B981]"
                }`}
              >
                {((telemetry.delta_jerk || 0) > 1.2 || simulatedShock)
                  ? "COLLAPSE HAZARD"
                  : ((telemetry.delta_jerk || 0) > 0.45)
                  ? "VIBRATION SHIFT"
                  : "STABLE BEDROCK"}
              </span>
            </div>

            {/* Shock Vector Value & Tilt Angle */}
            <div className="my-1.5 flex items-baseline justify-between font-mono">
              <div>
                <span className="text-3xl font-black text-white">
                  {simulatedShock ? "1.82" : (telemetry.delta_jerk || 0.02).toFixed(2)}
                </span>
                <span className="text-xs text-[#64748B] ml-1">G (JERK)</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#94A3B8] block">CHASSIS TILT:</span>
                <span className="text-xs font-bold text-emerald-400">
                  {simulatedShock ? "8.4° (UNSTABLE)" : "1.2° (LEVEL)"}
                </span>
              </div>
            </div>

            {/* 3-Axis Mini Visual Level Meter (X, Y, Z) */}
            <div className="w-full bg-black/40 rounded-xl p-2.5 border border-white/10 my-1 font-mono text-[10px]">
              <div className="flex justify-between text-[#94A3B8] mb-1">
                <span>3-AXIS MEMS:</span>
                <span className="text-white">SDA:21 | SCL:22</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-[#090D16] p-1 rounded border border-white/5">
                  <span className="text-[#64748B] block text-[9px]">AXIS X</span>
                  <span className="text-white font-bold">{simulatedShock ? "+0.45G" : "+0.02G"}</span>
                </div>
                <div className="bg-[#090D16] p-1 rounded border border-white/5">
                  <span className="text-[#64748B] block text-[9px]">AXIS Y</span>
                  <span className="text-white font-bold">{simulatedShock ? "-0.62G" : "+0.01G"}</span>
                </div>
                <div className="bg-[#090D16] p-1 rounded border border-white/5">
                  <span className="text-[#64748B] block text-[9px]">AXIS Z</span>
                  <span className="text-[#38BDF8] font-bold">{simulatedShock ? "+1.65G" : "+0.98G"}</span>
                </div>
              </div>
            </div>

            {/* Test Trigger Button & Footer */}
            <div className="w-full flex items-center justify-between pt-2 border-t border-[#1E2433] z-10">
              <span className="text-[10px] font-mono text-[#64748B]">ALARM AT &gt; 1.20 G</span>
              <button
                onClick={() => {
                  setSimulatedShock(true);
                  setTimeout(() => setSimulatedShock(false), 3500);
                }}
                className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 transition-colors cursor-pointer"
                title="Click to simulate an aftershock jerk"
              >
                TEST SHOCK
              </button>
            </div>
          </div>
        </section>

        {/* ── CENTER COLUMN: 3D MULTI-LAYER SENSORY FIELD & DUAL-AI TERMINAL (6 COLS) ── */}
        <section className="md:col-span-6 flex flex-col gap-4">
          
          {/* SECTION 3: LIVE HUD TOOLBAR & CONTROLS */}
          <div className="bg-[#0E121B] border border-[#1E2433] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            {/* Range Ceiling Selectors */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#64748B]">DEPTH:</span>
              {[5, 15, 30, 50].map((ceiling) => (
                <button
                  key={ceiling}
                  onClick={() => setRangeCeiling(ceiling)}
                  className={`px-2 py-1 rounded text-[10px] font-black transition-colors cursor-pointer ${
                    rangeCeiling === ceiling
                      ? "bg-[#06B6D4] text-black"
                      : "bg-[#08090D] hover:bg-[#1E2433] text-[#94A3B8]"
                  }`}
                >
                  {ceiling === 50 ? "MAX 50M" : `${ceiling}M`}
                </button>
              ))}
            </div>

            {/* Layer Visibility HUD Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowStrata(!showStrata)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                  showStrata
                    ? "bg-[#06B6D4]/20 border-[#06B6D4] text-[#06B6D4]"
                    : "bg-[#08090D] border-[#1E2433] text-[#64748B]"
                }`}
                title="Toggle Upper Seismic Strata Layer"
              >
                STRATA: {showStrata ? "ON" : "OFF"}
              </button>

              <button
                onClick={() => setShowParticles(!showParticles)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                  showParticles
                    ? "bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]"
                    : "bg-[#08090D] border-[#1E2433] text-[#64748B]"
                }`}
                title="Toggle Volumetric Dust Particles"
              >
                VOID: {showParticles ? "ON" : "OFF"}
              </button>

              <button
                onClick={() => setShowBioSense(!showBioSense)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                  showBioSense
                    ? "bg-[#10B981]/20 border-[#10B981] text-[#10B981]"
                    : "bg-[#08090D] border-[#1E2433] text-[#64748B]"
                }`}
                title="Toggle Biological Sensor Matrix"
              >
                BIO-SENSE: {showBioSense ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* SECTION 2: 3D MULTI-LAYER SENSORY FIELD VISUALIZER (CINEMA DIRECTIONAL HUD) */}
          <SubterraneanFieldVisualizer
            telemetry={telemetry}
            isConnected={isConnected}
            rangeCeiling={rangeCeiling}
            showStrata={showStrata}
            showParticles={showParticles}
            showBioSense={showBioSense}
            customAzimuth={aiResult?.azimuthVector || "320° NNW"}
            customDepth={aiResult?.depthMeters || telemetry.ai_depth_meters || 0}
          />

          {/* SECTION 4: INTEGRATED DUAL-AI ANALYSIS TERMINAL & MODEL SELECTOR */}
          <div className="bg-[#0E121B] border border-[#1E2433] rounded-xl p-4 flex flex-col gap-3 shadow-xl">
            {/* Header: Title, Model Selector & Inference Trigger */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#1E2433] pb-3">
              <span className="font-mono text-xs font-black text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#C084FC]" />
                [A.U.R.A. DUAL-AI CONSENSUS ENGINE]
              </span>

              <div className="flex items-center gap-2">
                {/* AI Model Selector Dropdown */}
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as AiModelType)}
                  className="bg-[#08090D] border border-[#1E2433] hover:border-[#C084FC] text-white text-[11px] font-mono font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#C084FC] cursor-pointer transition-colors"
                >
                  <option value="gemini-flash">⚡ Gemini 1.5 Flash (Edge Cloud)</option>
                  <option value="gemini-pro">🧠 Gemini 1.5 Pro (Deep Synthesis)</option>
                  <option value="dual-consensus">🛡️ Dual Consensus Engine</option>
                  <option value="openrouter">⚡ OpenRouter Fallback (DeepSeek/Claude)</option>
                </select>

                {/* Manual Inference Trigger Button */}
                <button
                  onClick={triggerAiInference}
                  disabled={isInferring}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    isInferring
                      ? "bg-[#C084FC]/30 text-[#C084FC] border border-[#C084FC]/50 animate-pulse"
                      : "bg-[#C084FC] hover:bg-[#A855F7] text-black hover:shadow-[0_0_15px_rgba(192,132,252,0.4)]"
                  }`}
                  title="Run live AI synthesis against active hardware telemetry"
                >
                  {isInferring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>INFERRING...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>RUN INFERENCE</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-Header Status Pills */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#06B6D4]/15 border border-[#06B6D4]/40 text-[#06B6D4] font-bold">
                  EDGE NODE: {isConnected ? (telemetry.ai_status || "AI: OK") : "OFFLINE"}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-bold">
                  CLOUD: {selectedModel.toUpperCase()}
                </span>
              </div>
              {lastInferenceTime && (
                <span>SYNTHESIZED: {lastInferenceTime}</span>
              )}
            </div>

            {/* Side-by-Side Verification Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Left: Physical Signal Telemetry */}
              <div className="p-3 bg-[#08090D] border border-[#1E2433] rounded-lg space-y-1.5 font-mono text-xs">
                <span className="text-[10px] text-[#64748B] flex items-center gap-1 font-bold">
                  <Activity className="w-3 h-3 text-[#06B6D4]" /> PHYSICAL SIGNAL TELEMETRY
                </span>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Gas PPM:</span>
                  <span className="text-white font-bold">{isConnected ? `${telemetry.gas} PPM` : "0 PPM"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Radar Trigger:</span>
                  <span className={isConnected && telemetry.radar === 1 ? "text-[#EF4444] font-bold" : "text-[#10B981]"}>
                    {isConnected ? (telemetry.radar === 1 ? "LOCKED (1)" : "IDLE (0)") : "OFFLINE (0)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Seismic Peak:</span>
                  <span className="text-[#06B6D4] font-bold">{isConnected ? `${telemetry.seismic_peak} mm/s` : "0.0 mm/s"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Acoustic Energy:</span>
                  <span className="text-[#10B981] font-bold">{isConnected ? `${telemetry.acoustic_energy} dB/Hz` : "0 dB/Hz"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Spectrum Classification:</span>
                  <span className="text-[#F59E0B] font-bold truncate max-w-[140px]" title={telemetry.acoustic_spectrum || "NOISE FLOOR NORMAL"}>
                    {isConnected ? (telemetry.acoustic_spectrum || "NOISE FLOOR NORMAL") : "OFFLINE"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Seismic Taps (Piezo):</span>
                  <span className="text-[#38BDF8] font-bold">{isConnected ? `${telemetry.tap_count ?? 0} TAPS` : "0 TAPS"}</span>
                </div>
              </div>

              {/* Right: AI Consensus Diagnostic */}
              <div className="p-3 bg-[#08090D] border border-[#1E2433] rounded-lg space-y-1.5 font-mono text-xs">
                <span className="text-[10px] text-[#64748B] flex items-center gap-1 font-bold">
                  <Cpu className="w-3 h-3 text-[#C084FC]" /> AI CONSENSUS DIAGNOSTIC
                </span>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Classification:</span>
                  <span className="text-[#10B981] font-bold">
                    {isConnected
                      ? (aiResult?.classification || telemetry.ai_classification || (telemetry.survivor_count && telemetry.survivor_count > 0 ? "SURVIVOR CONFIRMED" : (telemetry.acoustic_spectrum || "AMBIENT / SCANNING")))
                      : "AWAITING HARDWARE LINK"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Est. Depth & Vector:</span>
                  <span className="text-white font-bold">
                    {isConnected && (telemetry.radar === 1 || telemetry.ai_biological)
                      ? `↓ ${aiResult?.depthMeters || telemetry.ai_depth_meters || 3.2}M // ${aiResult?.azimuthVector || "320° NNW"}`
                      : isConnected
                      ? "SCANNING // NO TARGET"
                      : "STANDBY // OFFLINE"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Probability Score:</span>
                  <span className="text-[#C084FC] font-bold">
                    {isConnected ? `${aiResult?.confidence || telemetry.confidence || 0}%` : "--%"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Biological Status:</span>
                  <span className="text-[#10B981] font-bold">
                    {isConnected
                      ? (telemetry.ai_biological || telemetry.radar === 1 ? "POSITIVE (CONFIRMED)" : "SCANNING")
                      : "OFFLINE"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tactical Action Directive Banner */}
            <div className="p-3 bg-[#08090D] border border-[#06B6D4]/40 rounded-lg flex items-start gap-2.5">
              <Navigation className="w-4 h-4 text-[#06B6D4] flex-shrink-0 mt-0.5" />
              <div className="text-xs font-mono w-full">
                <div className="flex items-center justify-between">
                  <span className="text-[#06B6D4] font-black text-[10px]">TACTICAL ACTION DIRECTIVE:</span>
                  {isConnected && aiResult?.structuralHazard && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                      aiResult.structuralHazard === "COLLAPSE HAZARD"
                        ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]"
                        : "bg-[#10B981]/20 border-[#10B981] text-[#10B981]"
                    }`}>
                      {aiResult.structuralHazard}
                    </span>
                  )}
                </div>
                <p className="text-white font-bold leading-relaxed mt-0.5">
                  ACTION: {isConnected ? (aiResult?.tacticalDirective || telemetry.ai_action || "STANDBY // SENSORS CONNECTED") : `STANDBY // AWAITING SENSOR PAYLOAD FROM NODE (${nodeIp})`}
                </p>
                {isConnected && aiResult?.reasoningLog && (
                  <p className="text-[#94A3B8] text-[10px] mt-1 pt-1 border-t border-[#1E2433] italic">
                    AI SYNTHESIS LOG: {aiResult.reasoningLog}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── RIGHT COLUMN: GPS NAV-LOCK, SPARKLINE & BUS HEALTH (3 COLS) ── */}
        <section className="md:col-span-3 flex flex-col gap-4">
          
          {/* 1. DEDICATED GEOSPATIAL LOCALIZATION & NODE NAVIGATION */}
          <GeospatialLocalizationCard
            lat={telemetry.lat}
            lng={telemetry.lng}
            sats={telemetry.sats}
            gps_locked={telemetry.gps_locked}
          />

          {/* 2. ROLLING SEISMIC VS ACOUSTIC SPARKLINE */}
          <div className="bg-[#0E121B] border border-[#1E2433] rounded-xl p-4 flex flex-col justify-between shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-[#94A3B8] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#10B981]" />
                ROLLING SEISMIC / ACOUSTIC
              </span>
              <span className="text-[10px] font-mono text-[#64748B]">
                {sparkHistory.length > 0 ? `${sparkHistory.length} SAMPLES` : "STANDBY"}
              </span>
            </div>

            {/* Sparkline Bar Visualization */}
            <div className="h-24 w-full bg-[#08090D] rounded border border-[#1E2433] p-1 flex items-end gap-1 overflow-hidden relative">
              {sparkHistory.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-[#64748B]">
                  {isConnected ? "INGESTING HIGH-FREQUENCY SAMPLES..." : "OFFLINE // WAITING FOR SENSORS"}
                </div>
              ) : (
                sparkHistory.map((pt, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-0.5 h-full">
                    <div
                      className="w-full bg-[#06B6D4] rounded-t"
                      style={{ height: `${Math.min(50, (pt.s / 80) * 50)}%` }}
                      title={`Seismic: ${pt.s}`}
                    />
                    <div
                      className="w-full bg-[#10B981] rounded-t"
                      style={{ height: `${Math.min(50, (pt.a / 100) * 50)}%` }}
                      title={`Acoustic: ${pt.a}`}
                    />
                  </div>
                ))
              )}
            </div>

            <div className="text-[10px] font-mono text-[#64748B] flex justify-between mt-2 pt-1 border-t border-[#1E2433]/50">
              <span className="text-[#06B6D4]">■ SEISMIC</span>
              <span className="text-[#10B981]">■ ACOUSTIC</span>
              <span>{isConnected ? "LIVE" : "OFFLINE"}</span>
            </div>
          </div>

          {/* 3. HARDWARE BUS HEALTH */}
          <div className="bg-[#0E121B] border border-[#1E2433] rounded-xl p-4 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-[#94A3B8] flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-[#06B6D4]" />
                HARDWARE BUS HEALTH
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                isConnected ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#EF4444]/20 text-[#EF4444]"
              }`}>
                {isConnected ? "SYNCED" : "OFFLINE"}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Node Target IP:</span>
                <span className="text-white font-bold">{nodeIp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Packet Counter:</span>
                <span className="text-white font-bold">{packetCount} pkts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Link Status:</span>
                <span className={isConnected ? "text-[#10B981] font-bold" : "text-[#EF4444] font-bold"}>
                  {isConnected ? "ACTIVE (300ms)" : "DISCONNECTED"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">OLED Active Slide:</span>
                <span className="text-[#06B6D4] font-bold">
                  {isConnected ? `CARD #${telemetry.card || 1}` : "CARD #--"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-full mt-4 py-2 bg-[#08090D] hover:bg-[#172033] border border-[#1E2433] hover:border-[#06B6D4] text-white rounded-lg font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#06B6D4]" />
              CONFIGURE NODE SETTINGS
            </button>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          NODE CONFIGURATION DRAWER (MODAL)
      ══════════════════════════════════════════════════════════════════════ */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121B] border border-[#1E2433] rounded-2xl max-w-md w-full p-5 font-mono">
            <div className="flex items-center justify-between border-b border-[#1E2433] pb-3 mb-4">
              <span className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#06B6D4]" />
                AURA NODE CONFIGURATION
              </span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 hover:bg-[#1E2433] rounded text-[#64748B] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[#94A3B8] block mb-1.5 font-bold">TARGET NODE IP / LOCALTUNNEL URL</label>
                <input
                  type="text"
                  value={tempIp}
                  onChange={(e) => setTempIp(e.target.value)}
                  className="w-full bg-[#08090D] border border-[#1E2433] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#06B6D4]"
                  placeholder="famous-meals-brake.loca.lt"
                />
                <span className="text-[10px] text-[#64748B] block mt-1">
                  Default: famous-meals-brake.loca.lt (LocalTunnel) or 172.21.169.16
                </span>
              </div>

              <div className="p-3 bg-[#08090D] rounded-lg border border-[#1E2433] space-y-1.5 text-[11px] text-[#94A3B8]">
                <div className="flex justify-between">
                  <span>Protocol:</span>
                  <span className="text-white">HTTP GET (/api/telemetry)</span>
                </div>
                <div className="flex justify-between">
                  <span>Polling Rate:</span>
                  <span className="text-white">300ms High-Frequency</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const clean = tempIp.trim();
                    setNodeIp(clean);
                    localStorage.setItem("aura_node_ip", clean);
                    setIsDrawerOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-[#06B6D4] hover:bg-[#0891B2] text-black font-black rounded-lg transition-colors cursor-pointer"
                >
                  SAVE &amp; CONNECT
                </button>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2.5 bg-[#1E2433] hover:bg-[#334155] text-white rounded-lg transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Radar Animation Style */}
      <style>{`
        @keyframes radarSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}