import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";

// --- CUSTOM A.U.R.A. LOGO IMAGE ---
function AuraLogo({ className = "w-9 h-9 object-cover rounded-full" }: { className?: string }) {
  return (
    <img 
      src="https://mir-s3-cdn-cf.behance.net/projects/808/e8dc3f244509229.Y3JvcCwyMDE3LDE1NzcsMzg5LDE0OQ.jpg" 
      alt="A.U.R.A. Logo" 
      className={className} 
    />
  );
}

// --- SCRAMBLE HOVER COMPONENT ---
function ScrambleText({ text, className = "" }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";

  const handleMouseEnter = () => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((char, idx) => {
            if (char === " ") return " ";
            if (idx < iteration) return text[idx];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      if (iteration >= text.length) clearInterval(interval);
      iteration += 1;
    }, 30);
  };

  const handleMouseLeave = () => setDisplay(text);

  return (
    <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className={className}>
      {display}
    </span>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [loading, setLoading] = useState(true);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const [scrollFraction, setScrollFraction] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Loading Screen Timer
  useEffect(() => {
    const loaderTimer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setEntranceComplete(true), 200);
    }, 2800);
    return () => clearTimeout(loaderTimer);
  }, []);

  // SCROLLYTELLING CANVAS ENGINE (8K Frame-Scrub Background)
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const frameCount = 311;
    const currentFrame = (index: number) => `high_res_frames/frame-${index.toString().padStart(3, '0')}.jpg`;
    const images: HTMLImageElement[] = [];

    // Preload
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.src = currentFrame(i);
      images.push(img);
    }

    const ZOOM_FACTOR = 1.35; 

    const drawFrame = (index: number) => {
      if (index > frameCount || index <= 0) return;
      const img = images[index - 1];
      if (!img || !img.complete) return;

      context.clearRect(0, 0, canvas.width, canvas.height);
      const ratio = Math.max(canvas.width / img.width, canvas.height / img.height) * ZOOM_FACTOR;
      const width = img.width * ratio;
      const height = img.height * ratio;
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;

      context.drawImage(img, x, y, width, height);
    };

    const resizeAndDraw = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      drawFrame(Math.round(currentFrameIndex));
    };

    let targetFrameIndex = 1;
    let currentFrameIndex = 1;
    let lastRenderedIndex = -1;

    const handleScroll = () => {
      const html = document.documentElement;
      const fraction = html.scrollTop / (html.scrollHeight - html.clientHeight);
      setScrollFraction(fraction);
      targetFrameIndex = Math.max(1, Math.min(frameCount, fraction * frameCount));
    };

    let animationFrameId: number;
    const renderLoop = () => {
      currentFrameIndex += (targetFrameIndex - currentFrameIndex) * 0.08;
      if (Math.abs(targetFrameIndex - currentFrameIndex) < 0.01) {
        currentFrameIndex = targetFrameIndex;
      }
      const roundedIndex = Math.round(currentFrameIndex);
      if (roundedIndex !== lastRenderedIndex) {
        drawFrame(roundedIndex);
        lastRenderedIndex = roundedIndex;
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', resizeAndDraw);
    
    if (images[0]) {
      images[0].onload = () => resizeAndDraw();
    }
    resizeAndDraw();
    renderLoop();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', resizeAndDraw);
      cancelAnimationFrame(animationFrameId);
    };
  }, [loading]);

  // Section Refs for Scroll Animations
  const heroRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const missionRef = useRef<HTMLDivElement>(null);
  const techRef = useRef<HTMLDivElement>(null);
  const telemetryRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  const useSectionScroll = (ref: React.RefObject<HTMLDivElement | null>) => {
    const { scrollYProgress } = useScroll({
      target: ref,
      offset: ["start end", "end start"]
    });
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [30, 0, 0, -30]);
    return { opacity, y };
  };

  const heroScroll = useSectionScroll(heroRef);
  const problemScroll = useSectionScroll(problemRef);
  const missionScroll = useSectionScroll(missionRef);
  const techScroll = useSectionScroll(techRef);
  const telemetryScroll = useSectionScroll(telemetryRef);
  const teamScroll = useSectionScroll(teamRef);

  return (
    <div className="bg-[#080B10] text-white selection:bg-[#C084FC] selection:text-black overflow-x-hidden min-h-screen relative font-sans tracking-normal leading-relaxed">
      
      {/* --- SCROLLYTELLING CANVAS (BACKGROUND) --- */}
      {!loading && (
        <canvas 
          ref={canvasRef} 
          className="fixed top-0 left-0 w-screen h-screen pointer-events-none transition-opacity duration-1000"
          style={{ 
            filter: "contrast(1.08) saturate(1.1)",
            zIndex: 0,
            opacity: scrollFraction > 0.94 ? 0 : 1
          }}
        />
      )}

      {/* --- GALAXY VIDEO BACKGROUND (AT VERY END) --- */}
      {!loading && (
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_080203_fd7f4f85-3a86-4837-8192-85e7bfe68e75.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="fixed inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-1000"
          style={{ 
            zIndex: 0,
            opacity: scrollFraction > 0.94 ? 0.75 : 0
          }}
        />
      )}

      {/* --- MULTI-FONT ENTRANCE LOADER --- */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-[#05070a] flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="absolute w-[500px] h-[500px] rounded-full bg-[#9333EA]/10 blur-[120px] pointer-events-none" />

            <div className="flex flex-col gap-6 items-center text-center">
              <motion.div
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 0, opacity: 0.8 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="text-3xl tracking-[0.4em] font-light text-white uppercase font-display"
              >
                AURA SYSTEM INITIALIZATION
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                className="text-8xl font-bold tracking-tight text-flowing-purple font-display"
              >
                AURA
              </motion.div>

              <motion.div
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 0.8 }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
                className="text-4xl italic tracking-wider text-white animate-pulse font-display"
              >
                A   U   R   A
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.7 }}
                className="text-xl font-bold tracking-[0.4em] text-flowing-purple border border-[#9333EA]/50 px-6 py-2 rounded-lg font-display bg-black/40 backdrop-blur-md"
              >
                SYSTEM ONLINE
              </motion.div>
            </div>

            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-[1.5px] bg-white/20 overflow-hidden">
              <motion.div
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 bottom-0 w-24 bg-[#C084FC]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FIXED FLOATING CAPSULE NAVBAR WITH DIRECT REPO LINK --- */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={entranceComplete ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="fixed top-5 left-6 right-6 z-50 h-14 max-w-7xl mx-auto px-4 flex items-center justify-between backdrop-blur-xl bg-black/60 border border-white/20 rounded-full shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer flex items-center"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <AuraLogo className="w-8 h-8 object-cover rounded-full border border-[#C084FC]/60 shadow-[0_0_12px_rgba(147,51,234,0.5)]" />
          </motion.div>

          <div className="hidden md:flex items-center gap-6 px-5 py-1 border-l border-white/20 text-[11px] uppercase font-semibold tracking-widest text-white font-display">
            <button onClick={() => heroRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Hero" /></button>
            <button onClick={() => problemRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Problem" /></button>
            <button onClick={() => missionRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Mission" /></button>
            <button onClick={() => techRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Tech" /></button>
            <button onClick={() => teamRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Team" /></button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <motion.a
            href="https://github.com/jafferrilwaan-png/A.U.R.A-System"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.05, backgroundColor: "#C084FC", color: "#000" }}
            whileTap={{ scale: 0.95 }}
            className="h-9 px-5 bg-white/15 backdrop-blur-md rounded-full flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider border border-white/30 text-white transition-all font-display shadow-md"
          >
            <i className="bi bi-github text-sm" />
            <ScrambleText text="Repository" />
          </motion.a>
        </div>
      </motion.nav>

      {/* --- OVERLAYS WITH HIGH-CONTRAST FROSTED CARDS --- */}
      <div className="relative z-10 w-full bg-transparent">
        
        {/* --- SECTION 1: HERO --- */}
        <section ref={heroRef} className="h-screen w-full flex flex-col justify-center px-6 sm:px-12 pt-20 bg-transparent">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 opacity-[0.03]">
            <span className="text-[clamp(100px,25vw,450px)] uppercase tracking-tighter font-black text-white font-display">
              AURA
            </span>
          </div>

          <motion.div 
            style={heroScroll}
            className="max-w-4xl flex flex-col gap-6 text-left p-8 sm:p-10 rounded-3xl bg-black/45 backdrop-blur-md border border-white/15 shadow-2xl"
          >
            <h1 className="font-bold leading-[0.98] tracking-tight text-[clamp(34px,5.8vw,72px)] uppercase text-flowing-purple font-display">
              Sub-Surface Cavity & <br />
              Life Detection System
            </h1>

            <p className="max-w-2xl text-base sm:text-lg text-white font-normal leading-relaxed drop-shadow-md">
              A.U.R.A. maps active void spaces, acoustic signatures, and structural collapse zones into a single real-time tactical intelligence layer.
            </p>
          </motion.div>
        </section>

        {/* --- SECTION 2: PROBLEM / CRISIS SECTION --- */}
        <section ref={problemRef} className="min-h-screen w-full flex flex-col justify-center px-6 sm:px-12 py-24 bg-transparent">
          <motion.div style={problemScroll} className="max-w-5xl mx-auto w-full p-8 sm:p-12 rounded-3xl bg-black/50 backdrop-blur-md border border-white/15 shadow-2xl">
            <div className="mb-12 border-b border-white/20 pb-6">
              <span className="text-[#C084FC] text-xs font-extrabold tracking-widest uppercase block mb-2 font-display">CRITICAL VECTOR</span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight uppercase text-flowing-purple font-display">Subterranean Blindspots</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-10 text-left">
              <div className="p-6 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[#C084FC] text-xs font-bold block mb-2 tracking-wider font-display">CRITICAL WINDOW</span>
                <h4 className="text-2xl font-bold text-flowing-purple mb-3 font-display">The Golden 72-Hour Window</h4>
                <p className="text-base text-white/95 leading-relaxed font-normal">
                  First responders face massive structural hazards in the initial 72 hours after collapse. Structural layout shifts make traditional tracking systems obsolete within minutes.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[#C084FC] text-xs font-bold block mb-2 tracking-wider font-display">TECHNOLOGY FAILURE</span>
                <h4 className="text-2xl font-bold text-flowing-purple mb-3 font-display">Structural Blindspots</h4>
                <p className="text-base text-white/95 leading-relaxed font-normal">
                  Traditional aerial scanners and thermal drones completely fail to scan beneath collapsed steel and dense concrete layers, leaving first responders entirely blind to hollow air pockets.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* --- SECTION 2.5: MISSION & HUMAN COST TRAGEDY --- */}
        <section ref={missionRef} className="min-h-screen w-full flex flex-col justify-center px-6 sm:px-12 py-24 bg-transparent">
          <motion.div style={missionScroll} className="max-w-5xl mx-auto w-full p-8 sm:p-12 rounded-3xl bg-black/50 backdrop-blur-md border border-white/15 shadow-2xl">
            <div className="mb-12 border-b border-white/20 pb-6">
              <span className="text-[#C084FC] text-xs font-extrabold tracking-widest uppercase block mb-2 font-display">THE HUMAN COST & OUR MISSION</span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight uppercase text-flowing-purple font-display">Buried in Silence</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-center text-left">
              <div className="border-l-4 border-[#9333EA] pl-6 py-2 bg-black/30 rounded-r-xl">
                <span className="text-5xl font-bold text-flowing-purple block mb-2 font-display">80,000+</span>
                <p className="text-xs text-white/80 uppercase tracking-widest font-extrabold font-display">Lives Lost Annually</p>
                <p className="text-sm text-white mt-2 font-normal">Lost under building collapses globally, where lack of real-time cavity search mappings delays responders.</p>
              </div>

              <div className="border-l-4 border-[#9333EA] pl-6 py-2 bg-black/30 rounded-r-xl">
                <span className="text-5xl font-bold text-flowing-purple block mb-2 font-display">80%</span>
                <p className="text-xs text-white/80 uppercase tracking-widest font-extrabold font-display">Preventable Deaths</p>
                <p className="text-sm text-white mt-2 font-normal">Of deaths post-collapse are due to suffocation or dynamic shifting, occurring because victims cannot be located within the crucial 72-hour window.</p>
              </div>

              <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-white/20 md:pl-8 pt-6 md:pt-0">
                <span className="text-[#C084FC] text-xs font-bold uppercase tracking-widest block mb-2 font-display">MISSION STATEMENT</span>
                <p className="text-base text-white leading-relaxed font-light italic drop-shadow-sm">
                  "Our mission is absolute: Zero unmapped survivors. By translating seismic acoustics into immediate locational coordinates, A.U.R.A. ensures that no life remains buried in silence."
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* --- SECTION 3: TECH ARCHITECTURE --- */}
        <section ref={techRef} className="min-h-screen w-full flex flex-col justify-center px-6 sm:px-12 py-24 bg-transparent">
          <motion.div style={techScroll} className="max-w-7xl mx-auto w-full p-8 sm:p-12 rounded-3xl bg-black/50 backdrop-blur-md border border-white/15 shadow-2xl">
            <div className="text-center mb-16 border-b border-white/20 pb-8">
              <span className="text-[#C084FC] text-xs font-extrabold tracking-widest uppercase block mb-2 font-display">SYSTEM FLOW</span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight uppercase text-flowing-purple font-display">Tech Architecture</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Ultrasonic Profiling", desc: "Scans depth anomalies to map hollow air pockets and detect layout shifts." },
                { title: "Seismic Listening", desc: "Piezoelectric geophone sensors filter ambient noise to detect rescue tap patterns." },
                { title: "Edge Logic", desc: "Local microcontrollers parse telemetry telemetry feeds with zero network latency." },
                { title: "Telemetry Alerts", desc: "Instantly broadcasts live GPS coordinates and signals to responder dashboards." },
              ].map((item, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between min-h-[200px] text-left">
                  <div>
                    <span className="text-[#C084FC] text-xs font-extrabold block mb-4 font-display">MODULE_0{idx + 1}</span>
                    <h4 className="text-lg font-bold text-flowing-purple mb-2 uppercase tracking-tight font-display"><ScrambleText text={item.title} /></h4>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed font-normal">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* --- SECTION 4: TELEMETRY & MODELS SECTION --- */}
        <section ref={telemetryRef} className="min-h-screen w-full flex flex-col justify-center px-6 sm:px-12 py-24 bg-transparent">
          <motion.div style={telemetryScroll} className="max-w-7xl mx-auto w-full p-8 sm:p-12 rounded-3xl bg-black/50 backdrop-blur-md border border-white/15 shadow-2xl">
            <div className="text-center mb-16 border-b border-white/20 pb-6">
              <span className="text-[#C084FC] text-xs font-extrabold tracking-widest uppercase block mb-2 font-display">VISUAL DATA</span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight uppercase text-flowing-purple font-display">Telemetry & Models</h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-12 items-start">
              {/* Left Column: Browser Mockup with CRISP HIGH-CONTRAST CODE */}
              <div className="lg:col-span-2 rounded-xl overflow-hidden border border-white/20 bg-[#05070A]/95 shadow-2xl">
                <div className="h-10 bg-white/10 border-b border-white/10 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                    <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                    <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
                  </div>
                  <span className="text-xs text-white/70 font-mono select-none">telemetry_feed.py</span>
                  <div className="w-12" />
                </div>
                <pre className="p-6 md:p-8 overflow-x-auto text-[12px] md:text-sm text-white font-mono leading-relaxed select-text font-medium">
{`import time
import numpy as np

class AuraTelemetry:
    def __init__(self, sensor_frequency=18.4):
        self.freq = sensor_frequency
        self.active_voids = []

    def scan_depth_anomalies(self):
        # Scan subsurface telemetry mapping
        anomalies = np.random.normal(3.42, 0.12, 10)
        self.active_voids = [d for d in anomalies if d > 3.0]
        return self.active_voids

# Initiating realtime cavity parsing...
aura = AuraTelemetry()
while True:
    voids = aura.scan_depth_anomalies()
    print(f"Sub-surface scan complete: {len(voids)} active cavities found.")
    time.sleep(1.0)`}
                </pre>
              </div>

              {/* Right Column: Model Images */}
              <div className="flex flex-col gap-8">
                <div className="overflow-hidden border border-white/15 rounded-xl p-4 bg-black/40 group">
                  <img 
                    src="high_res_frames/frame-100.jpg" 
                    alt="Subsurface model scan phase 1" 
                    className="w-full h-[180px] object-cover rounded-lg group-hover:scale-[1.02] transition-all duration-300"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800";
                    }}
                  />
                  <div className="pt-4 text-left">
                    <span className="text-[#C084FC] text-xs font-extrabold block mb-1 font-display">MODEL PROFILE 01</span>
                    <h4 className="text-lg font-bold text-flowing-purple mb-1 font-display">Tunnel Cavity Scan</h4>
                    <p className="text-xs text-white/90 leading-relaxed font-normal">Maps structural cavities and returns safety margins.</p>
                  </div>
                </div>

                <div className="overflow-hidden border border-white/15 rounded-xl p-4 bg-black/40 group">
                  <img 
                    src="high_res_frames/frame-260.jpg" 
                    alt="Subsurface model scan phase 2" 
                    className="w-full h-[180px] object-cover rounded-lg group-hover:scale-[1.02] transition-all duration-300"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800";
                    }}
                  />
                  <div className="pt-4 text-left">
                    <span className="text-[#C084FC] text-xs font-extrabold block mb-1 font-display">MODEL PROFILE 02</span>
                    <h4 className="text-lg font-bold text-flowing-purple mb-1 font-display">Void Isolation Map</h4>
                    <p className="text-xs text-white/90 leading-relaxed font-normal">Highlights internal structures to locate survivors.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* --- SECTION 5: TEAM GRID --- */}
        <section ref={teamRef} className="min-h-screen w-full flex flex-col justify-center px-6 sm:px-12 py-24 bg-transparent">
          <motion.div style={teamScroll} className="max-w-7xl mx-auto w-full p-8 sm:p-12 rounded-3xl bg-black/50 backdrop-blur-md border border-white/15 shadow-2xl">
            <div className="text-center mb-16">
              <span className="text-[#C084FC] text-xs font-extrabold tracking-widest uppercase mb-3 block font-display">COLLABORATIVE ARCHITECTURE</span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight uppercase text-flowing-purple font-display">Core Architecture Team</h2>
              <p className="text-white/80 text-sm mt-3 max-w-md mx-auto leading-relaxed font-normal">
                The core minds behind the A.U.R.A. sub-surface cavity & life detection system architecture.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                {
                  name: "Jaffer Rilwaan V",
                  role: "Lead Systems Architect",
                  img: "high_res_frames/frame-050.jpg"
                },
                {
                  name: "Aravind Kumar",
                  role: "Sensor Integration Lead",
                  img: "high_res_frames/frame-120.jpg"
                },
                {
                  name: "Divya S.",
                  role: "Firmware Engineer",
                  img: "high_res_frames/frame-180.jpg"
                },
                {
                  name: "Karthik Raja",
                  role: "Cloud Infrastructure",
                  img: "high_res_frames/frame-220.jpg"
                },
                {
                  name: "Priyanka Mohan",
                  role: "UI/UX Developer",
                  img: "high_res_frames/frame-300.jpg"
                }
              ].map((member, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col items-start text-left p-4 rounded-2xl bg-black/40 border border-white/10 group cursor-pointer hover:border-[#C084FC] transition-all"
                >
                  <div className="w-full h-[220px] rounded-lg overflow-hidden border border-white/15 group-hover:border-[#C084FC] transition-all mb-4 relative shadow-lg">
                    <img 
                      src={member.img} 
                      alt={member.name} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${member.name}`;
                      }}
                    />
                    <div className="absolute inset-0 bg-[#C084FC]/15 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  
                  <h3 className="text-base font-bold text-flowing-purple mb-1 tracking-tight uppercase font-display"><ScrambleText text={member.name} /></h3>
                  <div className="text-xs text-white/70 tracking-wider uppercase font-semibold">{member.role}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="relative bg-transparent border-t border-white/10 flex flex-col items-center justify-between min-h-[450px] py-16 px-6 sm:px-12">
          <div className="flex flex-col items-center justify-center text-center my-12 p-8 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10 max-w-2xl mx-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1 }}
              className="flex items-center gap-6 cursor-pointer group"
            >
              <AuraLogo className="w-24 h-24 object-cover rounded-full border-2 border-[#C084FC]/60 group-hover:border-[#C084FC] transition-colors shadow-[0_0_30px_rgba(147,51,234,0.5)]" />
              
              <span className="text-7xl font-bold tracking-tighter text-flowing-purple font-display">
                AURA
              </span>
            </motion.div>
            <p className="text-white text-sm leading-relaxed max-w-md mt-6 font-normal drop-shadow-sm">
              Bridging the gap between first responders and life trapped beneath disaster rubble. Zero unmapped survivors.
            </p>
          </div>
          
          <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-center items-center border-t border-white/10 pt-8">
            <div className="text-[11px] text-white/60 tracking-widest font-semibold">
              © 2026 A.U.R.A. ALL RIGHTS RESERVED.
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}
