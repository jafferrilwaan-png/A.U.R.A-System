import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

// ─── GRAIN RING WebGL ORB ─────────────────────────────────────────────────────
const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uHover;
uniform vec3 uBg; uniform vec3 uBase; uniform vec3 uAccent; uniform vec3 uHigh;
uniform float uRadius; uniform float uWidth; uniform float uSmear; uniform float uStir;
uniform float uScale; uniform float uWarp;
float sat(float x){return clamp(x,0.0,1.0);}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=h21(i),b=h21(i+vec2(1.0,0.0)),c=h21(i+vec2(0.0,1.0)),d=h21(i+vec2(1.0,1.0));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm5(vec2 p){float s=0.0,a=0.5;for(int i=0;i<5;i++){s+=a*vnoise(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}
float fbm3(vec2 p){float s=0.0,a=0.5;for(int i=0;i<3;i++){s+=a*vnoise(p);p=p*2.07+vec2(4.1,2.3);a*=0.5;}return s;}
vec2 warp(vec2 p,float t){return p+uWarp*vec2(fbm3(p*1.15+vec2(t*0.05,0.0)),fbm3(p*1.15+vec2(4.7,2.1)-t*0.04));}
void main(){
  float ar=uRes.x/max(uRes.y,1.0);vec2 uv=gl_FragCoord.xy/uRes;vec2 p=(uv-0.5)*vec2(ar,1.0);
  float t=uTime;float r=length(p);float a=atan(p.y,p.x);
  vec2 m=(uMouse-0.5)*vec2(ar,1.0);float pr=length(m);float pang=pr>1e-4?atan(m.y,m.x):0.0;
  float spin=pang*uStir*uHover;float rad=uRadius*(1.0+(pr-0.30)*1.25*uHover);
  float da=a-pang;da=atan(sin(da),cos(da));float dq=da/0.85;float arc=exp(-dq*dq)*uHover;
  vec2 q=warp(vec2(a*uSmear+spin,r*uScale*3.0-t*0.10),t);float f=fbm5(q);float g=fbm3(q*2.1+7.3);
  float bq=(r-rad)/(rad*uWidth*0.62);float band=exp(-bq*bq);float v=sat(band*(0.45+1.35*f)+g*0.20*band);
  v*=1.0+arc*0.85;vec3 col=uBg;
  col+=mix(uBase,uAccent,sat(f*1.5-0.15+sin(a*2.0)*0.28))*v*0.72;
  col+=uHigh*pow(v,4.5)*0.38;col+=uHigh*band*arc*0.30;
  col*=1.0-0.90*exp(-pow(r/(rad*0.78),1.7));
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);}`

function parseColor(input, fb) {
  if (!input) return fb
  const str = String(input).trim()
  if (str.charAt(0) === "#") {
    let hex = str.slice(1)
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
      if (!isNaN(r)&&!isNaN(g)&&!isNaN(b)) return [r/255,g/255,b/255]
    }
  }
  return fb
}

function compile(gl, type, src) {
  const sh = gl.createShader(type); if (!sh) return null
  gl.shaderSource(sh, src); gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(sh)); gl.deleteShader(sh); return null }
  return sh
}

function GrainRingOrb({ speaking, thinking }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ speaking: false, thinking: false })
  stateRef.current = { speaking, thinking }
  const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 })

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
    if (!gl) return
    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
    if (!vs || !fs) return
    const prog = gl.createProgram(); if (!prog) return
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
    gl.useProgram(prog)
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, "a_pos")
    gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
    const locs = {}
    const u = name => { if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name); return locs[name] }
    let raf = 0, last = performance.now(), clock = 0

    const render = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const { speaking, thinking } = stateRef.current
      const speedMult = speaking ? 4.5 : thinking ? 2.2 : 1.0
      const hoverMult = speaking ? 1.8 : thinking ? 1.2 : 0.52
      clock = (clock + dt * speedMult) % 3600
      const ptr = ptrRef.current
      const k = 1 - Math.exp(-6 * dt)
      ptr.on += (ptr.onTarget - ptr.on) * k
      ptr.x += (0.5 - ptr.x) * k * 0.3
      ptr.y += (0.5 - ptr.y) * k * 0.3
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = canvas.clientWidth || 400, ch = canvas.clientHeight || 400
      const bw = Math.round(cw * dpr), bh = Math.round(ch * dpr)
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh }
      gl.viewport(0, 0, bw, bh)
      gl.uniform2f(u("uRes"), bw, bh); gl.uniform1f(u("uTime"), clock)
      gl.uniform2f(u("uMouse"), ptr.x, 1 - ptr.y); gl.uniform1f(u("uHover"), hoverMult)
      const nearColor = speaking ? "#FF00CD" : thinking ? "#7B2FBE" : "#0E00FF"
      const accentColor = speaking ? "#FF6B9D" : thinking ? "#9B59B6" : "#00A3FF"
      const [r1,g1,b1] = parseColor("#050810", [0.02,0.03,0.06])
      const [r2,g2,b2] = parseColor(nearColor, [0.054,0,1])
      const [r3,g3,b3] = parseColor(accentColor, [0,0.639,1])
      const [r4,g4,b4] = parseColor("#FFE0F5", [1,0.878,0.961])
      gl.uniform3f(u("uBg"), r1, g1, b1); gl.uniform3f(u("uBase"), r2, g2, b2)
      gl.uniform3f(u("uAccent"), r3, g3, b3); gl.uniform3f(u("uHigh"), r4, g4, b4)
      gl.uniform1f(u("uRadius"), 0.25); gl.uniform1f(u("uWidth"), speaking ? 1.4 : 0.69)
      gl.uniform1f(u("uSmear"), speaking ? 8.0 : 4.5); gl.uniform1f(u("uStir"), speaking ? 2.5 : 1.9)
      gl.uniform1f(u("uScale"), 0.20); gl.uniform1f(u("uWarp"), 0.55)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(raf); gl.deleteBuffer(buf) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", borderRadius: "50%", cursor: "default" }}
    />
  )
}

// ─── FAKE SCANNER LINE ────────────────────────────────────────────────────────
function ScanLine({ vertical = false }) {
  const [pos, setPos] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPos(p => (p + 0.4) % 100), 16)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute",
        ...(vertical
          ? { top: `${pos}%`, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(192,132,252,0.4), transparent)" }
          : { left: `${pos}%`, top: 0, bottom: 0, width: 1, background: "linear-gradient(180deg, transparent, rgba(56,189,248,0.4), transparent)" }
        )
      }} />
    </div>
  )
}

// ─── MINI GRAPH ───────────────────────────────────────────────────────────────
function MiniGraph({ color = "#C084FC", label = "SIGNAL", active = false }) {
  const [points, setPoints] = useState(() => Array.from({ length: 40 }, () => Math.random() * 60 + 20))
  useEffect(() => {
    const id = setInterval(() => {
      setPoints(p => {
        const newVal = active
          ? 40 + Math.random() * 55 + Math.sin(Date.now() * 0.01) * 20
          : 20 + Math.random() * 30
        return [...p.slice(1), Math.max(5, Math.min(95, newVal))]
      })
    }, active ? 80 : 200)
    return () => clearInterval(id)
  }, [active])
  const w = 160, h = 50
  const pts = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - (v / 100) * h}`).join(" ")
  return (
    <div style={{ fontFamily: "JetBrains Mono, monospace" }}>
      <div style={{ fontSize: 9, color, letterSpacing: "0.15em", marginBottom: 4, opacity: 0.8 }}>{label}</div>
      <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={pts + ` ${w},${h} 0,${h}`} fill={`url(#g-${label})`} stroke="none" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    </div>
  )
}

// ─── TYPEWRITER EFFECT ────────────────────────────────────────────────────────
function TypewriterText({ text, onDone }) {
  const [displayed, setDisplayed] = useState("")
  useEffect(() => {
    setDisplayed("")
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(id); onDone && onDone() }
    }, 22)
    return () => clearInterval(id)
  }, [text])
  return <span>{displayed}<span style={{ animation: "blink 1s infinite", opacity: displayed.length < text.length ? 1 : 0 }}>█</span></span>
}

// ─── AI RESPONSES ─────────────────────────────────────────────────────────────
const RESPONSES = {
  vibration: "Yeah — I am detecting vibration activity nearby. Piezoelectric geophone array shows micro-seismic events at 5–80 Hz. It seems like someone is tapping around the enclosure. Escalating to acoustic confirmation protocol.",
  object: "Connecting to ultrasonic transceiver... Emitting 40 kHz pulse... Echo received. Acoustic Time-of-Flight: 0.23 ms. Calculating — detected one person currently at approximately 0.94m proximity. Void clearance confirmed.",
  location: "Accessing satellite constellation... Acquiring GPS fix via NEO-6M module... Fix acquired: 3D lock, 7 satellites. My current specific location is Sriperumbudur, Tamil Nadu — Lat 12.99671°N, Lon 79.95382°E. ±2.8m accuracy.",
  battery: "Pulling ESP32 ADC telemetry... Battery voltage: 3.81V — approximately 87% capacity remaining. Estimated field runtime: 6.4 hours at current sensor polling rate.",
  temperature: "Reading onboard NTC thermistor via ADC channel 3... Ambient temperature inside enclosure: 34.2°C. No thermal throttling threshold reached. Node operating nominal.",
  status: "All systems nominal. Acoustic ToF: ONLINE. Geophone array: CALIBRATED. GPS: LOCKED. Wi-Fi beacon: ACTIVE on CH6. FreeRTOS scheduler: RUNNING. AURA firmware v2.4.1.",
  default: "Signal received. Processing... I am AURA — Autonomous Sub-Surface Life & Cavity Detection Node. Ask me about vibration, object proximity, location, battery, temperature, or status.",
}

function getResponse(input) {
  const q = input.toLowerCase()
  if (q.includes("vibration") || q.includes("tap") || q.includes("piezo") || q.includes("seismic")) return RESPONSES.vibration
  if (q.includes("object") || q.includes("proximity") || q.includes("person") || q.includes("ultrasonic") || q.includes("scan")) return RESPONSES.object
  if (q.includes("location") || q.includes("gps") || q.includes("where") || q.includes("coordinates")) return RESPONSES.location
  if (q.includes("battery") || q.includes("power") || q.includes("charge")) return RESPONSES.battery
  if (q.includes("temp") || q.includes("heat") || q.includes("thermal")) return RESPONSES.temperature
  if (q.includes("status") || q.includes("health") || q.includes("system") || q.includes("all")) return RESPONSES.status
  return RESPONSES.default
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AuraAICore() {
  const [phase, setPhase] = useState("boot") // boot | idle | thinking | speaking
  const [messages, setMessages] = useState([
    { role: "system", text: "Initializing AURA AI Core..." },
    { role: "system", text: "Connecting to ESP32 node at 192.168.4.1..." },
    { role: "system", text: "FreeRTOS kernel: RUNNING | Sensors: ONLINE | Beacon: ACTIVE" },
    { role: "system", text: 'Link established. Type a query below — try "vibration", "object", "location", "status".' },
  ])
  const [input, setInput] = useState("")
  const [currentReply, setCurrentReply] = useState("")
  const [connectionPulse, setConnectionPulse] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Boot sequence
  useEffect(() => {
    const t = setTimeout(() => setPhase("idle"), 2000)
    return () => clearTimeout(t)
  }, [])

  // Pulse connection indicator periodically
  useEffect(() => {
    const id = setInterval(() => {
      setConnectionPulse(true)
      setTimeout(() => setConnectionPulse(false), 400)
    }, 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, currentReply])

  const handleSend = useCallback(() => {
    const q = input.trim(); if (!q || phase !== "idle") return
    setInput("")
    setMessages(prev => [...prev, { role: "user", text: q }])
    setPhase("thinking")
    setTimeout(() => {
      const reply = getResponse(q)
      setCurrentReply(reply)
      setPhase("speaking")
    }, 1000 + Math.random() * 500)
  }, [input, phase])

  const handleTypingDone = useCallback(() => {
    setMessages(prev => [...prev, { role: "ai", text: currentReply }])
    setCurrentReply("")
    setPhase("idle")
  }, [currentReply])

  const handleKey = (e) => { if (e.key === "Enter") handleSend() }

  const speaking = phase === "speaking"
  const thinking = phase === "thinking"

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "#050810",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "JetBrains Mono, monospace", position: "relative", overflow: "hidden",
      padding: "40px 16px", boxSizing: "border-box",
    }}>
      {/* ── Scanning grid background ── */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(192,132,252,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(192,132,252,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      {/* ── Corner scan lines ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <ScanLine vertical={false} />
        <ScanLine vertical={true} />
      </div>

      {/* ── Top status bar ── */}
      <div style={{ width: "100%", maxWidth: 900, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "#C084FC", letterSpacing: "0.25em", fontWeight: 700 }}>A.U.R.A. AI CORE</div>
          <div style={{ fontSize: 12, color: "#556075", marginTop: 2 }}>NODE: AURA-0x1A3F · 192.168.4.1 · CH6</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: phase === "idle" ? "#4ADE80" : phase === "thinking" ? "#FBBF24" : "#C084FC",
            boxShadow: `0 0 8px ${phase === "idle" ? "#4ADE80" : phase === "thinking" ? "#FBBF24" : "#C084FC"}`,
            transition: "all 0.3s"
          }} />
          <span style={{ fontSize: 10, color: "#556075", letterSpacing: "0.15em" }}>
            {phase === "boot" ? "BOOTING" : phase === "idle" ? "STANDBY" : phase === "thinking" ? "PROCESSING" : "TRANSMITTING"}
          </span>
        </div>
      </div>

      {/* ── Main layout: Orb + Graphs ── */}
      <div style={{ width: "100%", maxWidth: 900, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 32, alignItems: "center", marginBottom: 40, zIndex: 10 }}>

        {/* Left graphs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "flex-end" }}>
          <MiniGraph color="#C084FC" label="ACOUSTIC ToF" active={speaking || thinking} />
          <MiniGraph color="#38BDF8" label="SEISMIC BAND" active={speaking} />
          <div style={{ fontSize: 9, color: "#2A3555", letterSpacing: "0.12em", textAlign: "right" }}>
            <div>ESP32 · WROOM-32</div>
            <div>FW v2.4.1-release</div>
            <div style={{ color: connectionPulse ? "#4ADE80" : "#2A3555", transition: "color 0.2s" }}>● UPLINK LIVE</div>
          </div>
        </div>

        {/* CENTER ORB */}
        <div style={{ position: "relative", width: 280, height: 280, flexShrink: 0 }}>
          {/* Outer glow ring — pulses when speaking */}
          <motion.div
            animate={speaking ? {
              boxShadow: ["0 0 0px 0px rgba(192,132,252,0)", "0 0 60px 30px rgba(192,132,252,0.25)", "0 0 120px 60px rgba(192,132,252,0.1)", "0 0 0px 0px rgba(192,132,252,0)"],
              scale: [1, 1.08, 1.18, 1],
            } : thinking ? {
              boxShadow: ["0 0 20px 5px rgba(192,132,252,0.1)", "0 0 40px 15px rgba(192,132,252,0.2)", "0 0 20px 5px rgba(192,132,252,0.1)"],
            } : { boxShadow: "0 0 0px 0px rgba(192,132,252,0)" }}
            transition={{ repeat: Infinity, duration: speaking ? 0.5 : 1.8, ease: "easeInOut" }}
            style={{ position: "absolute", inset: -20, borderRadius: "50%", pointerEvents: "none" }}
          />
          {/* The actual WebGL grain ring */}
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden" }}>
            <GrainRingOrb speaking={speaking} thinking={thinking} />
          </div>
          {/* Speaking splatter rings */}
          <AnimatePresence>
            {speaking && [0,1,2].map(i => (
              <motion.div
                key={i}
                initial={{ opacity: 0.6, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.8 + i * 0.3 }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.35, ease: "easeOut" }}
                style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  border: `1px solid rgba(192,132,252,${0.4 - i * 0.1})`,
                  pointerEvents: "none"
                }}
              />
            ))}
          </AnimatePresence>
          {/* Phase label */}
          <div style={{ position: "absolute", bottom: -28, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#556075", letterSpacing: "0.2em" }}>
            {phase === "boot" ? "INITIALIZING..." : phase === "idle" ? "AWAITING INPUT" : phase === "thinking" ? "PROCESSING QUERY..." : "AI TRANSMITTING"}
          </div>
        </div>

        {/* Right graphs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <MiniGraph color="#4ADE80" label="GPS CARRIER" active={true} />
          <MiniGraph color="#FBBF24" label="RF BEACON" active={speaking || thinking} />
          <div style={{ fontSize: 9, color: "#2A3555", letterSpacing: "0.12em" }}>
            <div>GPS: NEO-6M</div>
            <div>SRIPERUMBUDUR TN</div>
            <div style={{ color: "#4ADE80" }}>● 7 SATS LOCKED</div>
          </div>
        </div>
      </div>

      {/* ── Terminal Chat ── */}
      <div style={{
        width: "100%", maxWidth: 900, background: "#020408",
        border: "1px solid #1E2940", borderRadius: 16, overflow: "hidden", zIndex: 10,
      }}>
        {/* Terminal header */}
        <div style={{ background: "#0A0F1E", borderBottom: "1px solid #1E2940", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F87171" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FBBF24" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ADE80" }} />
          <span style={{ marginLeft: 8, fontSize: 10, color: "#556075", letterSpacing: "0.15em" }}>AURA-CORE · /dev/ttyUSB0 · 115200 baud</span>
        </div>

        {/* Messages */}
        <div style={{ height: 280, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ fontSize: 13, lineHeight: 1.7 }}>
              {msg.role === "system" && (
                <span style={{ color: "#2A3555" }}>[SYS] <span style={{ color: "#38BDF8" }}>{msg.text}</span></span>
              )}
              {msg.role === "user" && (
                <span>
                  <span style={{ color: "#FBBF24" }}>YOU → </span>
                  <span style={{ color: "#C9D1D9" }}>{msg.text}</span>
                </span>
              )}
              {msg.role === "ai" && (
                <span>
                  <span style={{ color: "#C084FC" }}>AURA → </span>
                  <span style={{ color: "#C9D1D9" }}>{msg.text}</span>
                </span>
              )}
            </div>
          ))}
          {/* Live typewriter reply */}
          {currentReply && (
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              <span style={{ color: "#C084FC" }}>AURA → </span>
              <span style={{ color: "#C9D1D9" }}>
                <TypewriterText text={currentReply} onDone={handleTypingDone} />
              </span>
            </div>
          )}
          {thinking && (
            <div style={{ fontSize: 13, color: "#556075" }}>
              <span style={{ color: "#C084FC" }}>AURA → </span>
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.7 }}>
                processing...
              </motion.span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: "1px solid #1E2940", padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "#556075", fontSize: 13, flexShrink: 0 }}>▸</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={phase !== "idle"}
            placeholder={phase === "idle" ? 'Ask AURA — "vibration", "object", "location", "status"...' : "AI processing..."}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#C9D1D9", fontFamily: "JetBrains Mono, monospace", fontSize: 13,
              opacity: phase !== "idle" ? 0.4 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={phase !== "idle" || !input.trim()}
            style={{
              background: phase === "idle" && input.trim() ? "#C084FC" : "#1E2940",
              border: "none", borderRadius: 8, padding: "6px 16px", cursor: phase === "idle" ? "pointer" : "default",
              color: phase === "idle" && input.trim() ? "#000" : "#556075",
              fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.1em", transition: "all 0.2s",
            }}
          >
            SEND
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}
