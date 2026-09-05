import React, { useState } from "react";
import { 
  Power, 
  Mic, 
  Volume2, 
  Radio, 
  Zap, 
  Satellite, 
  Check, 
  ShieldAlert, 
  Cpu, 
  Activity, 
  Sliders, 
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Loader2,
  Bot,
  Server
} from "lucide-react";
import { TelemetryPayload } from "./TacticalC2Dashboard";

interface SettingsPageProps {
  telemetry: TelemetryPayload;
  isConnected: boolean;
  nodeIp?: string;
  buzzerLevel: number;
  frequencyKhz: number;
  isOverdrive: boolean;
  isBeamActive: boolean;
  isPollingPaused: boolean;
  apiKey?: string;
  aiModel?: string;
  onSaveApiKey?: (key: string, model: string) => void;
  onTogglePolling: () => void;
  onSetBuzzerLevel: (lvl: number) => void;
  onSetFrequency: (khz: number) => void;
  onToggleOverdrive: () => void;
  onToggleBeam: () => void;
}

export default function SettingsPage({
  telemetry,
  isConnected,
  nodeIp = "172.21.169.16",
  buzzerLevel,
  frequencyKhz,
  isOverdrive,
  isBeamActive,
  isPollingPaused,
  apiKey = "",
  aiModel = "google/gemini-2.5-flash",
  onSaveApiKey,
  onTogglePolling,
  onSetBuzzerLevel,
  onSetFrequency,
  onToggleOverdrive,
  onToggleBeam
}: SettingsPageProps) {
  const hasGpsFix = isConnected && (Boolean(telemetry.gps_locked) || (Boolean(telemetry.lat) && telemetry.lat !== 0));

  const [customKey, setCustomKey] = useState<string>(apiKey);
  const [selectedModel, setSelectedModel] = useState<string>(aiModel);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ status: "idle" | "success" | "error"; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Instant API Key Verification Ping
  const handleTestKey = async () => {
    if (!customKey.trim()) {
      setTestResult({ status: "error", message: "Please enter an API key first." });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const startTime = performance.now();
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${customKey.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "AURA AI Key Diagnostic"
        },
        body: JSON.stringify({
          model: selectedModel || "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Respond with 2 words: Verified OK" },
            { role: "user", content: "Ping" }
          ],
          max_tokens: 10
        })
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText.slice(0, 80)}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || "OK";
      setTestResult({
        status: "success",
        message: `API Key Verified (${elapsed}ms latency) • ${selectedModel.split("/").pop()}`
      });
    } catch (err: any) {
      setTestResult({
        status: "error",
        message: `Verification Failed: ${err?.message || "Check network/key"}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (onSaveApiKey) {
      onSaveApiKey(customKey.trim(), selectedModel);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 font-sans text-white py-2">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Hardware & AI Configuration</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/70">
              {nodeIp}
            </span>
          </h2>
          <p className="text-xs text-white/50 mt-1 font-sans">
            Manage live ESP32 hardware telemetry registers, acoustic transducers, and LLM Neural Intelligence keys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-[#10B981] animate-ping" : "bg-amber-400 animate-pulse"}`} />
          <span className="font-mono text-xs font-bold text-white/80">
            {isConnected ? "SYSTEM READY" : "OFFLINE / STANDBY"}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          AURA NEURAL AI & API KEY CONTROL SUITE
      ══════════════════════════════════════════════════════════════════ */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-950/40 via-black/50 to-cyan-950/30 backdrop-blur-xl border border-purple-500/25 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>A.U.R.A. AI Neural Intelligence & API Key</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  LIVE REASONING
                </span>
              </h3>
              <p className="text-xs text-white/50">
                Powers conversational voice queries, real ESP32 telemetry reasoning, and hardware synthesis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestKey}
              disabled={isTesting}
              className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-400/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isTesting ? "Testing..." : "Test Key"}</span>
            </button>

            <button
              onClick={handleSave}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                saveSuccess
                  ? "bg-emerald-500 text-black font-black"
                  : "bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-md shadow-cyan-500/25"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saveSuccess ? "Saved!" : "Save Key"}</span>
            </button>
          </div>
        </div>

        {/* Form Inputs: API Key & Model Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* API Key Input */}
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>OpenRouter / LLM API Key</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full bg-black/60 border border-white/15 focus:border-purple-400/80 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-white/25 outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>Model Architecture</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-black/60 border border-white/15 focus:border-cyan-400/80 rounded-xl px-3 py-2 text-xs font-sans text-white outline-none transition-all cursor-pointer"
            >
              <option value="google/gemini-2.5-flash" className="bg-[#0f1422] text-white">Google Gemini 2.5 Flash (Ultra Fast & Stable)</option>
              <option value="meta-llama/llama-3.3-70b-instruct" className="bg-[#0f1422] text-white">Meta LLaMA 3.3 70B (High Reasoning)</option>
              <option value="deepseek/deepseek-chat" className="bg-[#0f1422] text-white">DeepSeek V3</option>
              <option value="qwen/qwen-2.5-72b-instruct" className="bg-[#0f1422] text-white">Qwen 2.5 72B</option>
              <option value="meta-llama/llama-3.1-8b-instruct" className="bg-[#0f1422] text-white">Meta LLaMA 3.1 8B</option>
            </select>
          </div>
        </div>

        {/* Live Test Status Banner */}
        {testResult && (
          <div className={`p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 border ${
            testResult.status === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${testResult.status === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Neat Minimal Grid of Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 1. Telemetry Ingestion Power */}
        <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col justify-between gap-4 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                !isPollingPaused ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">Telemetry Polling</h4>
                <p className="text-[11px] text-white/50">Continuous 300ms hardware feed</p>
              </div>
            </div>
            
            <button
              onClick={onTogglePolling}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                !isPollingPaused
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/40"
                  : "bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/40"
              }`}
            >
              {!isPollingPaused ? "Turn Off" : "Resume"}
            </button>
          </div>

          <div className="text-[11px] font-mono text-white/40 flex justify-between pt-2 border-t border-white/5">
            <span>Status:</span>
            <span className={!isPollingPaused ? "text-[#10B981] font-bold" : "text-amber-400"}>
              {!isPollingPaused ? "POLLING ACTIVE (300ms)" : "PAUSED"}
            </span>
          </div>
        </div>

        {/* 2. Speak Through Beam Transducer */}
        <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col justify-between gap-4 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isBeamActive ? "bg-[#C084FC]/30 text-[#C084FC] border border-[#C084FC]" : "bg-white/10 text-white/60"
              }`}>
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">Vocal Beam Transmission</h4>
                <p className="text-[11px] text-white/50">Cavity acoustic speaker dispatch</p>
              </div>
            </div>

            <button
              onClick={onToggleBeam}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                isBeamActive
                  ? "bg-[#C084FC] text-black shadow-[0_0_15px_#C084FC]"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
              }`}
            >
              {isBeamActive ? "Active" : "Disabled"}
            </button>
          </div>

          <div className="text-[11px] font-mono text-white/40 flex justify-between pt-2 border-t border-white/5">
            <span>Transducer Mode:</span>
            <span className={isBeamActive ? "text-[#C084FC] font-bold" : "text-white/40"}>
              {isBeamActive ? "TRANSMITTING VOICE" : "STANDBY"}
            </span>
          </div>
        </div>

        {/* 3. Locator Buzzer Sound Level */}
        <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col justify-between gap-4 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">Buzzer Alert Sound</h4>
                <p className="text-[11px] text-white/50">Locator audio step volume</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
              {[
                { lvl: 0, label: "Mute" },
                { lvl: 1, label: "L1" },
                { lvl: 2, label: "L2" },
                { lvl: 3, label: "L3" }
              ].map(({ lvl, label }) => (
                <button
                  key={lvl}
                  onClick={() => onSetBuzzerLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                    buzzerLevel === lvl
                      ? lvl === 0 
                        ? "bg-red-500 text-white shadow-md shadow-red-500/40" 
                        : "bg-amber-400 text-black shadow-md"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-mono text-white/40 flex justify-between pt-2 border-t border-white/5">
            <span>Acoustic Output:</span>
            <span className={buzzerLevel === 0 ? "text-red-400 font-bold" : "text-amber-400 font-bold"}>
              {buzzerLevel === 0 ? "MUTED / OFF (0 dB)" : buzzerLevel === 1 ? "LOW SOUND (85 dB)" : buzzerLevel === 2 ? "MEDIUM SOUND (98 dB)" : "MAXIMUM ALERT (110 dB)"}
            </span>
          </div>
        </div>

        {/* 4. Ultrasonic Pulse Sweep Frequency */}
        <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col justify-between gap-4 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">Ultrasonic Frequency</h4>
                <p className="text-[11px] text-white/50">Depth transducer pulse rate</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
              {[40, 60, 80].map((khz) => (
                <button
                  key={khz}
                  onClick={() => onSetFrequency(khz)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                    frequencyKhz === khz
                      ? "bg-[#06B6D4] text-black shadow-md"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {khz}k
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-mono text-white/40 flex justify-between pt-2 border-t border-white/5">
            <span>Sweep Resolution:</span>
            <span className="text-[#06B6D4] font-bold">
              {frequencyKhz} kHz (± 1.2 cm)
            </span>
          </div>
        </div>

        {/* 5. Maximize Hardware Performance (Overdrive) */}
        <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col justify-between gap-4 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isOverdrive ? "bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.8)]" : "bg-white/10 text-white/60"
              }`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">Hardware Overdrive</h4>
                <p className="text-[11px] text-white/50">Run registers at 100% duty cycle</p>
              </div>
            </div>

            <button
              onClick={onToggleOverdrive}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                isOverdrive
                  ? "bg-amber-400 text-black font-black"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
              }`}
            >
              {isOverdrive ? "Enabled" : "Standard"}
            </button>
          </div>

          <div className="text-[11px] font-mono text-white/40 flex justify-between pt-2 border-t border-white/5">
            <span>Duty Cycle:</span>
            <span className={isOverdrive ? "text-amber-400 font-bold" : "text-white/40"}>
              {isOverdrive ? "100% MAXIMUM POWER" : "NOMINAL (60%)"}
            </span>
          </div>
        </div>

        {/* 6. Truthful GPS Constellation Guard */}
        <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col justify-between gap-4 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                hasGpsFix ? "bg-[#10B981]/20 text-[#10B981]" : "bg-amber-400/20 text-amber-400"
              }`}>
                <Satellite className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">GPS Satellites</h4>
                <p className="text-[11px] text-white/50">Real hardware constellation feed</p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold ${
              hasGpsFix ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40" : "bg-amber-400/15 text-amber-400 border border-amber-400/30"
            }`}>
              {hasGpsFix ? `${telemetry.city ? telemetry.city + " • " : ""}${telemetry.sats ? telemetry.sats + " SATS" : "LOCKED"}` : "NO SATELLITE FIX"}
            </span>
          </div>

          <div className="text-[11px] font-mono text-white/40 flex justify-between pt-2 border-t border-white/5">
            <span>Coordinates:</span>
            <span className="text-white font-bold">
              {hasGpsFix ? `${telemetry.lat?.toFixed(4)}° N, ${telemetry.lng?.toFixed(4)}° E` : "SEARCHING OPEN SKY"}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
