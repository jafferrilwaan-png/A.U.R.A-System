import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ArchCorridor from "./ArchCorridor"

function DottedButton({ onClick }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const tx = hovered && !pressed ? -12 : 0
  const ty = hovered && !pressed ? -12 : 0

  return (
    <div style={{ display: "inline-block", padding: "12px 12px 0 0" }}>
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
            padding: "20px 52px",
            border: "2px dashed #C084FC",
            borderRadius: 28,
            background: "#000",
            color: "#C084FC",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            transition: "transform 0.18s cubic-bezier(.4,1.6,.6,1), box-shadow 0.18s cubic-bezier(.4,1.6,.6,1), border-color 0.15s",
            transform: `translate(${tx}px, ${ty}px)`,
            boxShadow: hovered && !pressed ? "14px 14px 0px #00FF99" : "0px 0px 0px #00FF99",
            borderColor: hovered ? "#00FF99" : "#C084FC",
          }}
        >
          ▶ ACCESS AURA AI CORE
        </span>
      </button>
    </div>
  )
}

export default function PortalRedirectButton() {
  const [isWarping, setIsWarping] = useState(false)

  const handleLaunch = () => {
    setIsWarping(true)
    setTimeout(() => {
      window.location.href = "/ai-dashboard.html"
    }, 2200)
  }

  return (
    <div className="w-full py-16 flex flex-col items-center justify-center text-center relative">
      <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C084FC]/30 bg-[#C084FC]/10 text-[#C084FC] text-xs font-mono font-bold uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-[#C084FC] animate-ping" />
        Sub-Surface Node Intelligence Bridge
      </div>
      <h3 className="text-2xl sm:text-4xl font-black text-white uppercase font-display tracking-tight mb-3">
        Ready to Query <span className="text-[#C084FC]">Live Node AI?</span>
      </h3>
      <p className="text-xs sm:text-sm text-white/60 max-w-md mx-auto mb-8 font-mono">
        Launch the quantum portal to connect directly to the ESP32 hardware dashboard and voice terminal.
      </p>

      {/* The Dotted Offset Button */}
      <DottedButton onClick={handleLaunch} />

      {/* FULL-PAGE IMMERSIVE ARCH CORRIDOR WARP MODAL */}
      <AnimatePresence>
        {isWarping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              background: "#000",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* 3D Arch Corridor Animation */}
            <ArchCorridor speed={14} glow={28} near="#C084FC" far="#38BDF8" twist={24} arches={18} cornerRadius={40} />

            {/* Glowing HUD Center Overlay */}
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              background: "radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)",
            }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center font-mono"
              >
                <div className="text-xl sm:text-3xl font-black text-white tracking-widest uppercase drop-shadow-[0_0_20px_rgba(192,132,252,0.8)]">
                  QUANTUM LINK ESTABLISHED
                </div>
                <div className="text-xs sm:text-sm text-[#38BDF8] mt-3 tracking-widest animate-pulse">
                  CONNECTING TO AURA-NODE-0x1A3F (192.168.4.1)...
                </div>
                <div className="text-[11px] text-white/50 mt-2 tracking-wider">
                  REDIRECTING TO HARDWARE DASHBOARD...
                </div>

                <div className="flex gap-2 justify-center mt-6">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.6, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                      className="w-2.5 h-2.5 rounded-full bg-[#C084FC]"
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
