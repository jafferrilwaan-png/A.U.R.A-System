import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ArchCorridor from "./ArchCorridor"

// ─── DOTTED OFFSET BUTTON ────────────────────────────────────────────────────
function DottedOffsetButton({ label = "ENTER PORTAL", onClick }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const tx = hovered && !pressed ? -14 : 0
  const ty = hovered && !pressed ? -14 : 0

  return (
    <div style={{ display: "inline-block", padding: "14px 14px 0 0" }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false) }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", display: "inline-flex" }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "18px 48px",
            border: "2px dashed #C084FC",
            borderRadius: 24,
            background: "#000",
            color: "#C084FC",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            transition: "transform 0.18s cubic-bezier(.4,1.6,.6,1), box-shadow 0.18s cubic-bezier(.4,1.6,.6,1), background 0.12s",
            transform: `translate(${tx}px, ${ty}px)`,
            boxShadow: hovered && !pressed ? "14px 14px 0px #00FF99" : "0px 0px 0px #00FF99",
            borderRadius: hovered ? 32 : 24,
          }}
        >
          {label}
        </span>
      </button>
    </div>
  )
}

// ─── REAL-FEEL TELEMETRY DASHBOARD ───────────────────────────────────────────
// Simulates realistic ESP32/AURA node data — uses browser geolocation
// and realistic sensor drift to feel like a real embedded system connection.

function useTelemetry() {
  const [data, setData] = useState({
    distance: "--",
    piezoState: "STANDBY",
    piezoActive: false,
    lat: "13.08271",
    lon: "80.27073",
    altitude: "12.4",
    gpsAccuracy: "3.2",
    rssi: "-68",
    battery: "94",
    uptime: 0,
    packetCount: 0,
    nodeId: "AURA-NODE-0x1A3F",
    firmwareVer: "v2.4.1-release",
    temp: "32.4",
    humidity: "67",
    voidDepthHistory: [],
    connected: false,
    connecting: true,
    lastPing: Date.now(),
  })

  const uptimeRef = useRef(0)
  const packetRef = useRef(0)
  const timeRef = useRef(0)

  // Simulate connecting handshake
  useEffect(() => {
    const timer = setTimeout(() => {
      setData(d => ({ ...d, connecting: false, connected: true }))
    }, 2200)
    return () => clearTimeout(timer)
  }, [])

  // Live sensor tick — runs every 1.2s like a real embedded loop
  useEffect(() => {
    const interval = setInterval(() => {
      timeRef.current += 1.2
      uptimeRef.current += 1.2
      packetRef.current += 1

      // Ultrasonic: realistic drift with occasional void detection event
      const t = timeRef.current
      const baseWave = 18 + Math.sin(t * 0.3) * 6 + Math.sin(t * 0.07) * 3
      const noise = (Math.random() - 0.5) * 1.2
      const distance = Math.max(4, Math.min(45, baseWave + noise)).toFixed(1)
      const piezoActive = parseFloat(distance) < 13

      // GPS: slow drift around Sriperumbudur / Chennai area, like a real GPS fix
      const latBase = 12.9969 + Math.sin(t * 0.004) * 0.00008 + (Math.random() - 0.5) * 0.00003
      const lonBase = 79.9538 + Math.cos(t * 0.003) * 0.00006 + (Math.random() - 0.5) * 0.00003
      const accuracy = (2.8 + Math.sin(t * 0.1) * 0.4 + Math.random() * 0.3).toFixed(1)

      // RSSI: realistic Wi-Fi signal fluctuation
      const rssi = Math.round(-62 + Math.sin(t * 0.15) * 5 + (Math.random() - 0.5) * 4)

      // Battery: slow drain
      const battery = Math.max(0, 94 - uptimeRef.current * 0.0012).toFixed(1)

      // Temp: slow ambient rise
      const temp = (32.4 + Math.sin(t * 0.02) * 0.8 + uptimeRef.current * 0.001).toFixed(1)

      // Humidity
      const humidity = (67 + Math.sin(t * 0.04) * 3).toFixed(0)

      setData(d => ({
        ...d,
        distance,
        piezoState: piezoActive ? "VIBRATING — SOS DETECTED" : "STANDBY",
        piezoActive,
        lat: latBase.toFixed(5),
        lon: lonBase.toFixed(5),
        gpsAccuracy: accuracy,
        altitude: (12.4 + Math.sin(t * 0.008) * 0.3).toFixed(1),
        rssi: rssi.toString(),
        battery,
        uptime: Math.floor(uptimeRef.current),
        packetCount: packetRef.current,
        temp,
        humidity,
        lastPing: Date.now(),
        voidDepthHistory: [...d.voidDepthHistory.slice(-19), parseFloat(distance)],
      }))
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  return data
}

function Sparkline({ values, width = 120, height = 32, color = "#C084FC" }) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(" ")
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
    </svg>
  )
}

function formatUptime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`
}

function AuraDashboard() {
  const d = useTelemetry()
  const [log, setLog] = useState([])
  const logRef = useRef(null)

  useEffect(() => {
    if (d.connecting) {
      setLog([
        { t: "00:00:00.000", msg: "Initializing AURA node firmware...", c: "#38BDF8" },
        { t: "00:00:00.312", msg: "Mounting FreeRTOS scheduler...", c: "#38BDF8" },
        { t: "00:00:00.721", msg: "Ultrasonic transceiver: ONLINE (40kHz)", c: "#4ADE80" },
        { t: "00:00:00.889", msg: "Geophone piezo array: CALIBRATING...", c: "#FBBF24" },
        { t: "00:00:01.103", msg: "GPS module NEO-6M: Acquiring satellites...", c: "#FBBF24" },
        { t: "00:00:01.547", msg: "Wi-Fi beacon: Broadcasting on CH6 (192.168.4.1)", c: "#4ADE80" },
        { t: "00:00:01.890", msg: "Captive portal: ACTIVE", c: "#4ADE80" },
        { t: "00:00:02.104", msg: "Host connected: AURA-DASHBOARD v2.4.1", c: "#C084FC" },
      ])
    }
  }, [d.connecting])

  useEffect(() => {
    if (!d.connected) return
    const msgs = []
    if (d.piezoActive) msgs.push({ msg: "⚠ SEISMIC VIBRATION DETECTED — Possible survivor signal", c: "#F87171" })
    else if (d.packetCount % 5 === 0) msgs.push({ msg: `Acoustic ToF pulse: ${d.distance} cm clearance`, c: "#C084FC" })
    if (d.packetCount % 8 === 0) msgs.push({ msg: `GPS fix: ${d.lat}, ${d.lon} ±${d.gpsAccuracy}m`, c: "#38BDF8" })
    if (d.packetCount % 12 === 0) msgs.push({ msg: `Node battery: ${d.battery}% | Temp: ${d.temp}°C | Hum: ${d.humidity}%`, c: "#4ADE80" })
    if (d.packetCount % 20 === 0) msgs.push({ msg: `Uplink RSSI: ${d.rssi} dBm — signal nominal`, c: "#FBBF24" })

    if (msgs.length === 0) return
    const now = new Date()
    const ts = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}.${String(now.getMilliseconds()).padStart(3,"0")}`
    setLog(prev => [...prev.slice(-40), ...msgs.map(m => ({ t: ts, ...m }))])
  }, [d.packetCount])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const statusColor = d.connecting ? "#FBBF24" : d.connected ? "#4ADE80" : "#F87171"
  const statusLabel = d.connecting ? "CONNECTING..." : d.connected ? "● LINK ESTABLISHED" : "● OFFLINE"

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "#050810",
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      color: "#C9D1D9", padding: "28px 20px", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1E2940", paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: "#38BDF8", letterSpacing: "0.2em", fontWeight: 700 }}>A.U.R.A. FIELD TELEMETRY</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 2 }}>📡 {d.nodeId}</div>
          <div style={{ fontSize: 10, color: "#556075", marginTop: 2 }}>Firmware: {d.firmwareVer} &nbsp;|&nbsp; Session Packets: {d.packetCount}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: statusColor, animation: d.connected ? "pulse 2s infinite" : "none" }}>{statusLabel}</div>
          <div style={{ fontSize: 10, color: "#556075", marginTop: 4 }}>Uptime: {formatUptime(d.uptime)}</div>
          <div style={{ fontSize: 10, color: "#556075" }}>RSSI: {d.rssi} dBm</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>

        {/* Ultrasonic Void Depth */}
        <div style={{ background: "#0A0F1E", border: `1px solid ${d.piezoActive ? "#F87171" : "#1E2940"}`, borderRadius: 12, padding: 20, transition: "border-color 0.3s" }}>
          <div style={{ fontSize: 10, color: "#C084FC", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 8 }}>ACOUSTIC ToF — VOID DEPTH</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: d.piezoActive ? "#F87171" : "#fff", lineHeight: 1 }}>{d.distance} <span style={{ fontSize: 16, color: "#556075", fontWeight: 400 }}>cm</span></div>
          <div style={{ marginTop: 12 }}>
            <Sparkline values={d.voidDepthHistory} width={180} height={36} color={d.piezoActive ? "#F87171" : "#C084FC"} />
          </div>
          <div style={{ fontSize: 10, color: "#556075", marginTop: 8 }}>Range: 0.02m – 4.5m &nbsp;|&nbsp; Freq: 40 kHz &nbsp;|&nbsp; Pulse interval: 1.2s</div>
        </div>

        {/* Piezo / Seismic */}
        <div style={{ background: "#0A0F1E", border: `1px solid ${d.piezoActive ? "#F87171" : "#1E2940"}`, borderRadius: 12, padding: 20, transition: "all 0.3s" }}>
          <div style={{ fontSize: 10, color: "#38BDF8", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 8 }}>SEISMIC GEOPHONE — PIEZO STATE</div>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: d.piezoActive ? "#F87171" : "#4ADE80",
            padding: "10px 16px", borderRadius: 8,
            background: d.piezoActive ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.06)",
            border: `1px solid ${d.piezoActive ? "#F87171" : "#4ADE80"}`,
            animation: d.piezoActive ? "blink 0.6s infinite" : "none"
          }}>
            {d.piezoActive ? "⚠ " : "✓ "}{d.piezoState}
          </div>
          <div style={{ fontSize: 10, color: "#556075", marginTop: 12 }}>Bandpass filter: 5Hz – 500Hz &nbsp;|&nbsp; Threshold: &lt;13cm void proximity</div>
          <div style={{ fontSize: 10, color: "#556075", marginTop: 4 }}>Geophone: SM-24 &nbsp;|&nbsp; Sensitivity: 28.8 V/m/s</div>
        </div>

        {/* GPS */}
        <div style={{ background: "#0A0F1E", border: "1px solid #1E2940", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#4ADE80", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 8 }}>GPS NEO-6M — GEOLOCATION FIX</div>
          <div style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>
            <span style={{ color: "#556075" }}>LAT</span> {d.lat}
          </div>
          <div style={{ fontSize: 15, color: "#fff", fontWeight: 700, marginTop: 4 }}>
            <span style={{ color: "#556075" }}>LON</span> {d.lon}
          </div>
          <div style={{ fontSize: 12, color: "#556075", marginTop: 8 }}>
            Accuracy: ±{d.gpsAccuracy}m &nbsp;|&nbsp; Alt: {d.altitude}m MSL
          </div>
          <div style={{ marginTop: 10 }}>
            <a
              href={`https://maps.google.com/?q=${d.lat},${d.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 10, color: "#38BDF8", textDecoration: "none", border: "1px solid #1E2940", padding: "4px 10px", borderRadius: 6, display: "inline-block" }}
            >
              ↗ OPEN IN MAPS
            </a>
          </div>
        </div>

        {/* System Health */}
        <div style={{ background: "#0A0F1E", border: "1px solid #1E2940", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#FBBF24", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 12 }}>NODE HEALTH METRICS</div>
          {[
            { label: "Battery", value: `${d.battery}%`, bar: parseFloat(d.battery) / 100, color: parseFloat(d.battery) > 20 ? "#4ADE80" : "#F87171" },
            { label: "Temp (°C)", value: d.temp, bar: parseFloat(d.temp) / 85, color: "#FBBF24" },
            { label: "Humidity", value: `${d.humidity}%`, bar: parseFloat(d.humidity) / 100, color: "#38BDF8" },
          ].map(({ label, value, bar, color }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: "#556075" }}>{label}</span>
                <span style={{ color, fontWeight: 700 }}>{value}</span>
              </div>
              <div style={{ height: 4, background: "#1E2940", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, bar * 100)}%`, height: "100%", background: color, borderRadius: 4, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
          <div style={{ fontSize: 10, color: "#556075", marginTop: 8 }}>MCU: ESP32-WROOM-32 &nbsp;|&nbsp; 240 MHz dual-core</div>
        </div>
      </div>

      {/* Terminal Log */}
      <div style={{ background: "#020408", border: "1px solid #1E2940", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 10, color: "#556075", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 10 }}>
          ▸ SERIAL MONITOR — /dev/ttyUSB0 @ 115200 baud
        </div>
        <div
          ref={logRef}
          style={{ height: 200, overflowY: "auto", fontSize: 11, lineHeight: 1.7 }}
        >
          {log.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <span style={{ color: "#2A3555", flexShrink: 0 }}>[{line.t}]</span>
              <span style={{ color: line.c || "#C9D1D9" }}>{line.msg}</span>
            </div>
          ))}
          {d.connecting && (
            <div style={{ color: "#FBBF24", animation: "blink 1s infinite" }}>Establishing link...</div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>
    </div>
  )
}

// ─── PORTAL TRANSITION + EXPORT ──────────────────────────────────────────────
export default function AuraPortalDashboard() {
  const [phase, setPhase] = useState("idle") // idle | portal | dashboard

  const handleEnter = () => setPhase("portal")

  useEffect(() => {
    if (phase === "portal") {
      const t = setTimeout(() => setPhase("dashboard"), 2800)
      return () => clearTimeout(t)
    }
  }, [phase])

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Idle: show the button */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div
            key="btn"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 220, gap: 24 }}
          >
            <div style={{ fontFamily: "JetBrains Mono, monospace", color: "#556075", fontSize: 12, letterSpacing: "0.2em", textAlign: "center" }}>
              AURA NODE — READY FOR TELEMETRY LINK
            </div>
            <DottedOffsetButton label="▶ CONNECT TO NODE" onClick={handleEnter} />
            <div style={{ fontFamily: "JetBrains Mono, monospace", color: "#2A3555", fontSize: 10, letterSpacing: "0.15em" }}>
              ESP32 · 192.168.4.1 · CH6 · AURA-NODE-0x1A3F
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portal animation */}
      <AnimatePresence>
        {phase === "portal" && (
          <motion.div
            key="portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: "relative", width: "100%", height: 480 }}
          >
            <ArchCorridor speed={10} glow={24} near="#C084FC" far="#38BDF8" twist={20} arches={16} cornerRadius={40} />
            {/* Center status text */}
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 10
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                style={{ fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}
              >
                <div style={{ fontSize: 13, color: "#C084FC", letterSpacing: "0.3em", fontWeight: 700 }}>ESTABLISHING LINK</div>
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  style={{ fontSize: 11, color: "#38BDF8", marginTop: 8, letterSpacing: "0.2em" }}
                >
                  AURA-NODE-0x1A3F · 192.168.4.1
                </motion.div>
                <div style={{ marginTop: 16, display: "flex", gap: 6, justifyContent: "center" }}>
                  {[0,1,2,3,4].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                      style={{ width: 6, height: 6, borderRadius: "50%", background: "#C084FC" }}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard */}
      <AnimatePresence>
        {phase === "dashboard" && (
          <motion.div
            key="dash"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <AuraDashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
