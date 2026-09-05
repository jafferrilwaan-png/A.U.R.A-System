"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export interface TerminalProps {
  title?: string;
  className?: string;
}

const ESP32_FIRMWARE_LINES = [
  "/* A.U.R.A. RESCUE NODE - ESP32 FIRMWARE */",
  "#include <WiFi.h>",
  "#include <WebServer.h>",
  "#include <TinyGPSPlus.h>",
  "",
  "#define TRIG_PIN 5",
  "#define ECHO_PIN 18",
  "#define VOID_THRESHOLD_CM 45.0 // Survivable void threshold",
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

export function Terminal({
  title = "esp32_aura_node.ino — ESP32 DevKit V1",
  className = "",
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [visibleLineCount, setVisibleLineCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Progressive streaming of ESP32 firmware code lines once visible
  useEffect(() => {
    if (inView && visibleLineCount < ESP32_FIRMWARE_LINES.length) {
      const timer = setTimeout(() => {
        setVisibleLineCount((prev) => prev + 1);
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [inView, visibleLineCount]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ESP32_FIRMWARE_LINES.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={terminalRef}
      className={`w-full rounded-2xl overflow-hidden border border-white/15 bg-[#06080e]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(192,132,252,0.1)] font-mono text-left select-text gpu-layer ${className}`}
    >
      {/* macOS Title Bar */}
      <div className="h-11 px-4 bg-gradient-to-r from-[#101420] via-[#0d101a] to-[#101420] border-b border-white/10 flex items-center justify-between select-none">
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 shadow-[0_0_8px_rgba(255,95,86,0.6)] cursor-pointer hover:opacity-80 transition-opacity" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 shadow-[0_0_8px_rgba(255,189,46,0.6)] cursor-pointer hover:opacity-80 transition-opacity" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 shadow-[0_0_8px_rgba(39,201,63,0.6)] cursor-pointer hover:opacity-80 transition-opacity" />
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#C084FC] font-mono">
          <i className="bi bi-cpu text-[12px] text-[#C084FC]" />
          <span className="text-white/90">{title}</span>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-[11px] text-white/70 hover:text-[#C084FC] flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
            title="Copy Firmware Code"
          >
            <i className={`bi ${copied ? "bi-check2 text-green-400" : "bi-clipboard"}`} />
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy Code"}</span>
          </button>
          <span className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse" title="ESP32 Live" />
        </div>
      </div>

      {/* Code Editor Body */}
      <div
        ref={codeContainerRef}
        className="p-4 sm:p-6 max-h-[380px] sm:max-h-[440px] overflow-y-auto overflow-x-auto text-[11px] sm:text-xs leading-relaxed space-y-1 scrollbar-thin scrollbar-thumb-white/10 font-mono"
      >
        {ESP32_FIRMWARE_LINES.slice(0, visibleLineCount).map((line, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className="flex gap-4 hover:bg-white/[0.03] px-1 rounded transition-colors"
          >
            <span className="text-white/25 select-none w-6 text-right flex-shrink-0 font-mono">
              {idx + 1}
            </span>
            <span
              className={`whitespace-pre ${
                line.startsWith("/*") || line.startsWith(" *") || line.startsWith("//")
                  ? "text-white/40 italic"
                  : line.startsWith("#")
                  ? "text-[#C084FC] font-bold"
                  : line.includes("void") || line.includes("float") || line.includes("bool") || line.includes("long") || line.includes("int")
                  ? "text-cyan-300 font-semibold"
                  : line.includes("return") || line.includes("if")
                  ? "text-amber-400 font-semibold"
                  : line.includes("\"")
                  ? "text-emerald-300"
                  : "text-white/90"
              }`}
            >
              {line || " "}
            </span>
          </motion.div>
        ))}

        {visibleLineCount < ESP32_FIRMWARE_LINES.length && (
          <div className="flex gap-4 px-1">
            <span className="text-white/20 select-none w-6 text-right font-mono">
              {visibleLineCount + 1}
            </span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block w-2 h-3.5 bg-[#C084FC] ml-1 align-middle"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Terminal;
