import React from "react";
import { 
  X, 
  Volume2, 
  Zap, 
  Mic, 
  Radio, 
  Power, 
  Satellite, 
  Gauge, 
  Sliders, 
  Check, 
  ShieldAlert 
} from "lucide-react";
import { TelemetryPayload } from "./TacticalC2Dashboard";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryPayload;
  isConnected: boolean;
  nodeIp?: string;
  buzzerLevel: number;
  frequencyKhz: number;
  isOverdrive: boolean;
  isBeamActive: boolean;
  isPollingPaused: boolean;
  onTogglePolling: () => void;
  onCycleBuzzer: () => void;
  onCycleFrequency: () => void;
  onToggleOverdrive: () => void;
  onToggleBeam: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  telemetry,
  isConnected,
  nodeIp = "famous-meals-brake.loca.lt",
  buzzerLevel,
  frequencyKhz,
  isOverdrive,
  isBeamActive,
  isPollingPaused,
  onTogglePolling,
  onCycleBuzzer,
  onCycleFrequency,
  onToggleOverdrive,
  onToggleBeam
}: SettingsModalProps) {
  if (!isOpen) return null;

  const hasGpsFix = isConnected && Boolean(telemetry.gps_locked) && (telemetry.sats || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#080b12] border border-white/20 p-6 shadow-2xl text-white font-sans overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#C084FC]/10 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C084FC]/20 border border-[#C084FC]/40 flex items-center justify-center text-[#C084FC]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono tracking-wider uppercase text-white">
                HARDWARE CONTROL MATRIX
              </h3>
              <p className="text-[11px] text-white/50 font-mono">
                Target Node: {nodeIp}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Body */}
        <div className="py-5 flex flex-col gap-4 relative z-10 font-mono text-xs">
          
          {/* 1. Hardware Polling & Standby Power */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                !isPollingPaused ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-red-500/20 text-red-400 border border-red-500/40"
              }`}>
                <Power className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">NODE TELEMETRY POLLING</span>
                <span className="text-[10px] text-white/50">
                  {!isPollingPaused ? "Active (300ms continuous feed)" : "PAUSED / STANDBY"}
                </span>
              </div>
            </div>

            <button
              onClick={onTogglePolling}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                !isPollingPaused 
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/40"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40"
              }`}
            >
              {!isPollingPaused ? "TURN OFF" : "RESUME"}
            </button>
          </div>

          {/* 2. Speak Through Beam (Vocal Transmission) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isBeamActive ? "bg-[#C084FC]/30 text-[#C084FC] border border-[#C084FC]" : "bg-white/10 text-white/60"
              }`}>
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">SPEAK THROUGH BEAM</span>
                <span className="text-[10px] text-white/50">
                  Transmit microphone voice through cavity transducer
                </span>
              </div>
            </div>

            <button
              onClick={onToggleBeam}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                isBeamActive
                  ? "bg-[#C084FC] text-black shadow-[0_0_15px_#C084FC]"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
              }`}
            >
              {isBeamActive ? "BEAMING LIVE" : "DISENGAGED"}
            </button>
          </div>

          {/* 3. Increase Buzzer Sound / Locator Level */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">LOCATOR BUZZER SOUND</span>
                <span className="text-[10px] text-white/50">
                  Current: Level {buzzerLevel} ({buzzerLevel === 1 ? "Standard" : buzzerLevel === 2 ? "High Alert" : "Maximum Acoustic"})
                </span>
              </div>
            </div>

            <button
              onClick={onCycleBuzzer}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 font-bold transition-all cursor-pointer"
            >
              CYCLE LEVEL (L{buzzerLevel})
            </button>
          </div>

          {/* 4. Increase Ultrasonic Frequency */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/40 flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">ULTRASONIC FREQUENCY</span>
                <span className="text-[10px] text-white/50">
                  Transducer pulse sweep rate: {frequencyKhz} kHz
                </span>
              </div>
            </div>

            <button
              onClick={onCycleFrequency}
              className="px-3 py-1.5 rounded-xl bg-[#06B6D4]/20 hover:bg-[#06B6D4]/30 text-[#06B6D4] border border-[#06B6D4]/40 font-bold transition-all cursor-pointer"
            >
              {frequencyKhz} kHz (BOOST)
            </button>
          </div>

          {/* 5. Maximize Hardware Performance (Overdrive) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isOverdrive ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.8)]" : "bg-white/10 text-white/60"
              }`}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">MAX HARDWARE OVERDRIVE</span>
                <span className="text-[10px] text-white/50">
                  Run all node sensory registers at 100% duty cycle
                </span>
              </div>
            </div>

            <button
              onClick={onToggleOverdrive}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                isOverdrive
                  ? "bg-amber-400 text-black font-black"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
              }`}
            >
              {isOverdrive ? "OVERDRIVE ON" : "STANDARD"}
            </button>
          </div>

          {/* 6. Real GPS Status Safeguard */}
          <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Satellite className={`w-4 h-4 ${hasGpsFix ? "text-emerald-400" : "text-amber-400"}`} />
              <span className="text-[11px] text-white/70">
                GPS Fix Truthfulness:
              </span>
            </div>
            <span className={`font-bold ${hasGpsFix ? "text-emerald-400" : "text-amber-400"}`}>
              {hasGpsFix ? `LOCKED (${telemetry.sats} SATELLITES)` : "NO GPS SIGNAL (SEARCHING SKY)"}
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#C084FC] hover:bg-[#A855F7] text-black font-mono font-bold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(192,132,252,0.4)]"
          >
            APPLY & RETURN
          </button>
        </div>
      </div>
    </div>
  );
}
