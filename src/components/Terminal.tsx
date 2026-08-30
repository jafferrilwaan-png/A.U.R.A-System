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

const ESP32_FIRMWARE_CODE = [
  "// ESP32 DevKit V1 - Realtime Rescue Telemetry Node",
  "#include <WiFi.h>",
  "#include <WebServer.h>",
  "#include <TinyGPSPlus.h>",
  "",
  "#define TRIG_PIN 5",
  "#define ECHO_PIN 18",
  "#define VOID_THRESHOLD_CM 45.0 // Clearance threshold",
  "",
  "TinyGPSPlus gps;",
  "WebServer server(80);",
  "",
  "float measureVoidDistance() {",
  "  digitalWrite(TRIG_PIN, LOW);",
  "  delayMicroseconds(2);",
  "  digitalWrite(TRIG_PIN, HIGH);",
  "  delayMicroseconds(10);",
  "  digitalWrite(TRIG_PIN, LOW);",
  "  ",
  "  long duration = pulseIn(ECHO_PIN, HIGH, 30000);",
  "  if (duration == 0) return -1.0;",
  "  return (duration * 0.0343) / 2.0;",
  "}",
  "",
  "void handleTelemetry() {",
  "  float depth = measureVoidDistance();",
  "  bool voidDetected = (depth >= VOID_THRESHOLD_CM);",
  "  ",
  "  String json = \"{\";",
  "  json += \"\\\"status\\\":\\\"\" + String(voidDetected ? \"VOID_DETECTED\" : \"OBSTRUCTED\") + \"\\\",\";",
  "  json += \"\\\"void_depth_cm\\\":\" + String(depth, 1) + \",\";",
  "  json += \"\\\"lat\\\":\" + String(gps.location.lat(), 6) + \",\";",
  "  json += \"\\\"lng\\\":\" + String(gps.location.lng(), 6) + \",\";",
  "  json += \"\\\"uptime_ms\\\":\" + String(millis());",
  "  json += \"}\";",
  "  ",
  "  server.send(200, \"application/json\", json);",
  "}",
  "",
  "void setup() {",
  "  pinMode(TRIG_PIN, OUTPUT);",
  "  pinMode(ECHO_PIN, INPUT);",
  "  WiFi.softAP(\"RESCUE_NODE_01\", \"rescue123\");",
  "  server.on(\"/data\", HTTP_GET, handleTelemetry);",
  "  server.begin();",
  "}",
  "",
  "void loop() {",
  "  server.handleClient();",
  "}",
];

const PYTHON_TELEMETRY_CODE = [
  "import time",
  "import requests",
  "import numpy as np",
  "",
  "class AuraTelemetryClient:",
  "    def __init__(self, endpoint='http://192.168.4.1/data'):",
  "        self.endpoint = endpoint",
  "        self.active_voids = []",
  "",
  "    def fetch_node_telemetry(self):",
  "        try:",
  "            resp = requests.get(self.endpoint, timeout=0.8)",
  "            data = resp.json()",
  "            if data.get('status') == 'VOID_DETECTED':",
  "                print(f\"[ALERT] Cavity at {data['void_depth_cm']}cm | GPS: {data['lat']},{data['lng']}\")",
  "            return data",
  "        except Exception as e:",
  "            return {'status': 'OFFLINE', 'error': str(e)}",
  "",
  "# Initiating autonomous rescue telemetry receiver...",
  "client = AuraTelemetryClient()",
  "while True:",
  "    packet = client.fetch_node_telemetry()",
  "    time.sleep(0.5)",
];

const DEFAULT_COMMANDS = [
  "npx shadcn@latest init",
  "npm install motion",
  "npx shadcn@latest add button card",
  "curl -s http://192.168.4.1/data | jq .",
];

const DEFAULT_OUTPUTS: Record<number, string[]> = {
  0: [
    "✔ Preflight checks passed.",
    "✔ Created components.json",
    "✔ Initialized A.U.R.A. node interface.",
  ],
  1: ["✔ added motion in 1.4s"],
  2: ["✔ Done. Installed tactical button and telemetry card."],
  3: [
    "{\n  \"status\": \"VOID_DETECTED\",\n  \"void_depth_cm\": 184.5,\n  \"lat\": 13.082712,\n  \"lng\": 80.270721,\n  \"uptime_ms\": 48210\n}",
  ],
};

export function Terminal({
  commands = DEFAULT_COMMANDS,
  outputs = DEFAULT_OUTPUTS,
  typingSpeed = 35,
  delayBetweenCommands = 1000,
  title = "aura-field-node@rescue-01",
  className = "",
}: TerminalProps) {
  const [activeTab, setActiveTab] = useState<"terminal" | "esp32" | "python">("terminal");
  const [displayedSteps, setDisplayedSteps] = useState<
    Array<{ type: "cmd" | "out"; text: string | React.ReactNode }>
  >([]);
  const [currentCmdIndex, setCurrentCmdIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTypingCommand, setIsTypingCommand] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab !== "terminal") return;

    if (currentCmdIndex >= commands.length) {
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
  }, [charIndex, currentCmdIndex, isTypingCommand, commands, outputs, typingSpeed, delayBetweenCommands, activeTab]);

  useEffect(() => {
    if (scrollRef.current && activeTab === "terminal") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedSteps, charIndex, activeTab]);

  const handleCopy = () => {
    let textToCopy = "";
    if (activeTab === "terminal") textToCopy = commands.join("\n");
    else if (activeTab === "esp32") textToCopy = ESP32_FIRMWARE_CODE.join("\n");
    else if (activeTab === "python") textToCopy = PYTHON_TELEMETRY_CODE.join("\n");

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`w-full rounded-2xl overflow-hidden border border-white/15 bg-[#07090e]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(192,132,252,0.1)] font-mono text-left ${className}`}
    >
      {/* macOS Title Bar & Tabs */}
      <div className="h-11 px-4 bg-gradient-to-r from-[#101420] via-[#0d101a] to-[#101420] border-b border-white/10 flex items-center justify-between select-none">
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 shadow-[0_0_8px_rgba(255,95,86,0.6)] cursor-pointer hover:opacity-80 transition-opacity" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 shadow-[0_0_8px_rgba(255,189,46,0.6)] cursor-pointer hover:opacity-80 transition-opacity" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 shadow-[0_0_8px_rgba(39,201,63,0.6)] cursor-pointer hover:opacity-80 transition-opacity" />
        </div>

        {/* macOS Tabs */}
        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5 text-[10px] sm:text-xs">
          <button
            onClick={() => setActiveTab("terminal")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "terminal"
                ? "bg-[#C084FC]/20 text-[#C084FC] font-bold border border-[#C084FC]/30 shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <i className="bi bi-terminal text-[10px]" />
            <span>terminal.zsh</span>
          </button>

          <button
            onClick={() => setActiveTab("esp32")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "esp32"
                ? "bg-[#C084FC]/20 text-[#C084FC] font-bold border border-[#C084FC]/30 shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <i className="bi bi-cpu text-[10px]" />
            <span>esp32_aura.ino</span>
          </button>

          <button
            onClick={() => setActiveTab("python")}
            className={`hidden sm:flex px-2.5 py-1 rounded-md transition-all items-center gap-1.5 ${
              activeTab === "python"
                ? "bg-[#C084FC]/20 text-[#C084FC] font-bold border border-[#C084FC]/30 shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <i className="bi bi-code-slash text-[10px]" />
            <span>telemetry_feed.py</span>
          </button>
        </div>

        {/* Actions: Copy & Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-[11px] text-white/60 hover:text-[#C084FC] flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 transition-colors"
            title="Copy Code"
          >
            <i className={`bi ${copied ? "bi-check2 text-green-400" : "bi-clipboard"}`} />
            <span className="hidden md:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
          <span className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse" title="Connected" />
        </div>
      </div>

      {/* Terminal / Code Body */}
      <div
        ref={scrollRef}
        className="p-4 sm:p-6 max-h-[360px] sm:max-h-[420px] overflow-y-auto overflow-x-auto text-[11px] sm:text-xs leading-relaxed space-y-2 scrollbar-thin scrollbar-thumb-white/10"
      >
        {activeTab === "terminal" && (
          <div className="space-y-3">
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
        )}

        {activeTab === "esp32" && (
          <div className="space-y-1 select-text">
            {ESP32_FIRMWARE_CODE.map((line, idx) => (
              <div key={idx} className="flex gap-4">
                <span className="text-white/20 select-none w-6 text-right">{idx + 1}</span>
                <span className={`whitespace-pre ${
                  line.startsWith("//") ? "text-white/40 italic" :
                  line.startsWith("#") ? "text-[#C084FC] font-bold" :
                  line.includes("void") || line.includes("float") || line.includes("bool") ? "text-cyan-300" :
                  line.includes("return") || line.includes("if") ? "text-amber-400" :
                  line.includes("\"") ? "text-emerald-300" : "text-white/85"
                }`}>
                  {line || " "}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "python" && (
          <div className="space-y-1 select-text">
            {PYTHON_TELEMETRY_CODE.map((line, idx) => (
              <div key={idx} className="flex gap-4">
                <span className="text-white/20 select-none w-6 text-right">{idx + 1}</span>
                <span className={`whitespace-pre ${
                  line.startsWith("#") ? "text-white/40 italic" :
                  line.startsWith("import") || line.startsWith("class") || line.startsWith("def") ? "text-[#C084FC] font-bold" :
                  line.includes("return") || line.includes("while") || line.includes("try") ? "text-amber-400" :
                  line.includes("'") || line.includes("\"") ? "text-emerald-300" : "text-white/85"
                }`}>
                  {line || " "}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Terminal;
