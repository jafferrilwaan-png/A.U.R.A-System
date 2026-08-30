"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export interface TerminalProps {
  commands?: string[];
  outputs?: Record<number, (string | React.ReactNode)[]>;
  typingSpeed?: number;
  delayBetweenCommands?: number;
  title?: string;
  className?: string;
}

const DEFAULT_COMMANDS = [
  "aura-node init --device=ESP32_RESCUE_01",
  "aura-sensor scan --ultrasonic=PIN_5,18 --geophone=PIN_A0",
  "aura-telemetry stream --ap=RESCUE_NODE_01:80/data",
  "curl -s http://192.168.4.1/data | jq",
];

const DEFAULT_OUTPUTS: Record<number, string[]> = {
  0: [
    "✔ Microcontroller ESP32 DevKit V1 detected.",
    "✔ Localized Wi-Fi AP [RESCUE_NODE_01] initialized on 192.168.4.1.",
    "✔ TinyGPS++ subsystem locked to NEO-6M.",
  ],
  1: [
    "✔ Ultrasonic transducer calibrated (Void Threshold: 45.0 cm).",
    "✔ Piezoelectric acoustic noise filter active at 18.4 kHz.",
    "✔ Real-time sub-surface echo profiling online.",
  ],
  2: [
    "📡 Telemetry broadcasting on endpoint: http://192.168.4.1/data",
    "⚡ Frame latency: 12ms | Zero unmapped survivors protocol ACTIVE.",
  ],
  3: [
    "{\n  \"status\": \"VOID_DETECTED\",\n  \"void_depth_cm\": 184.5,\n  \"lat\": 13.082712,\n  \"lng\": 80.270721,\n  \"uptime_ms\": 48210\n}",
  ],
};

export function Terminal({
  commands = DEFAULT_COMMANDS,
  outputs = DEFAULT_OUTPUTS,
  typingSpeed = 35,
  delayBetweenCommands = 1200,
  title = "aura-node@field-station: ~ zsh",
  className = "",
}: TerminalProps) {
  const [displayedSteps, setDisplayedSteps] = useState<
    Array<{ type: "cmd" | "out"; text: string | React.ReactNode; isTyping?: boolean }>
  >([]);
  const [currentCmdIndex, setCurrentCmdIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTypingCommand, setIsTypingCommand] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentCmdIndex >= commands.length) {
      // Loop after a brief delay
      const resetTimer = setTimeout(() => {
        setDisplayedSteps([]);
        setCurrentCmdIndex(0);
        setCharIndex(0);
        setIsTypingCommand(true);
      }, delayBetweenCommands * 3);
      return () => clearTimeout(resetTimer);
    }

    const currentCommand = commands[currentCmdIndex];

    if (isTypingCommand) {
      if (charIndex < currentCommand.length) {
        const timer = setTimeout(() => {
          setCharIndex((prev) => prev + 1);
        }, typingSpeed);
        return () => clearTimeout(timer);
      } else {
        // Finished typing current command
        setIsTypingCommand(false);
        const outs = outputs[currentCmdIndex] || [];
        const timer = setTimeout(() => {
          setDisplayedSteps((prev) => [
            ...prev,
            { type: "cmd", text: currentCommand },
            ...outs.map((out) => ({ type: "out" as const, text: out })),
          ]);
          setCharIndex(0);
          setCurrentCmdIndex((prev) => prev + 1);
          setIsTypingCommand(true);
        }, delayBetweenCommands);
        return () => clearTimeout(timer);
      }
    }
  }, [charIndex, currentCmdIndex, isTypingCommand, commands, outputs, typingSpeed, delayBetweenCommands]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedSteps, charIndex]);

  const handleCopy = () => {
    const textToCopy = commands.join("\n");
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`w-full rounded-2xl overflow-hidden border border-white/15 bg-[#07090e]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(192,132,252,0.1)] font-mono text-left ${className}`}
    >
      {/* macOS Title Bar */}
      <div className="h-11 px-4 bg-gradient-to-r from-[#101420] via-[#0d101a] to-[#101420] border-b border-white/10 flex items-center justify-between select-none">
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 shadow-[0_0_8px_rgba(255,95,86,0.6)] cursor-pointer hover:opacity-80 transition-opacity" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 shadow-[0_0_8px_rgba(255,189,46,0.6)] cursor-pointer hover:opacity-80 transition-opacity" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 shadow-[0_0_8px_rgba(39,201,63,0.6)] cursor-pointer hover:opacity-80 transition-opacity" />
        </div>

        {/* Terminal Title */}
        <div className="flex items-center gap-2 text-xs font-semibold text-white/70 font-mono">
          <i className="bi bi-terminal text-[11px] text-[#C084FC]" />
          <span className="truncate max-w-[200px] sm:max-w-none">{title}</span>
        </div>

        {/* Actions: Copy & Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-[11px] text-white/60 hover:text-[#C084FC] flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 transition-colors"
            title="Copy commands"
          >
            <i className={`bi ${copied ? "bi-check2 text-green-400" : "bi-clipboard"}`} />
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
          <span className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse" title="Connected" />
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={scrollRef}
        className="p-4 sm:p-6 max-h-[360px] sm:max-h-[420px] overflow-y-auto overflow-x-auto text-[11px] sm:text-xs leading-relaxed space-y-3 scrollbar-thin scrollbar-thumb-white/10"
      >
        {/* Rendered History */}
        {displayedSteps.map((step, idx) => (
          <div key={idx} className="space-y-1.5">
            {step.type === "cmd" ? (
              <div className="flex items-start gap-2 text-white">
                <span className="text-[#C084FC] font-bold select-none">➜</span>
                <span className="text-cyan-400 select-none">~</span>
                <span className="text-white/90 font-semibold">{step.text}</span>
              </div>
            ) : (
              <div className="pl-5 text-white/75 font-normal whitespace-pre-wrap leading-relaxed">
                {typeof step.text === "string" && step.text.startsWith("✔") ? (
                  <span className="text-emerald-400">{step.text}</span>
                ) : typeof step.text === "string" && step.text.startsWith("📡") ? (
                  <span className="text-[#C084FC] font-medium">{step.text}</span>
                ) : typeof step.text === "string" && step.text.startsWith("{") ? (
                  <pre className="text-amber-300/90 font-mono text-[11px] bg-black/40 p-2.5 rounded-lg border border-white/5 overflow-x-auto">
                    {step.text}
                  </pre>
                ) : (
                  step.text
                )}
              </div>
            )}
          </div>
        ))}

        {/* Current Typing Command Line */}
        {currentCmdIndex < commands.length && isTypingCommand && (
          <div className="flex items-start gap-2 text-white">
            <span className="text-[#C084FC] font-bold select-none">➜</span>
            <span className="text-cyan-400 select-none">~</span>
            <span className="text-white/90 font-semibold">
              {commands[currentCmdIndex].slice(0, charIndex)}
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-2 h-4 bg-[#C084FC] ml-1 align-middle"
              />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TerminalDemo() {
  return (
    <section className="w-full py-4">
      <Terminal
        commands={[
          "npx shadcn@latest init",
          "npm install motion",
          "npx shadcn@latest add button card",
          "aura-telemetry stream --node=ESP32_RESCUE_01",
        ]}
        outputs={{
          0: [
            "✔ Preflight checks passed.",
            "✔ Created components.json",
            "✔ Initialized A.U.R.A. telemetry environment.",
          ],
          1: ["✔ added 1 package in 1.4s"],
          2: ["✔ Done. Installed tactical button and telemetry card."],
          3: [
            "{\n  \"status\": \"VOID_DETECTED\",\n  \"void_depth_cm\": 184.5,\n  \"lat\": 13.082712,\n  \"lng\": 80.270721,\n  \"uptime_ms\": 48210\n}",
          ],
        }}
        typingSpeed={40}
        delayBetweenCommands={1000}
      />
    </section>
  );
}
export default Terminal;
