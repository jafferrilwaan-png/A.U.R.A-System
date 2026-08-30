import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import NeonBorder from "./components/NeonBorder";
import AsciiImage from "./components/AsciiImage";
import StarfieldButton from "./components/StarfieldButton";
import Terminal from "./components/Terminal";
import { PinContainer } from "./components/ui/3d-pin";
import { GlowingEffect } from "./components/ui/glowing-effect";

// --- CUSTOM A.U.R.A. LOGO IMAGE ---
function AuraLogo({ className = "w-10 h-10 object-cover rounded-full" }: { className?: string }) {
  return (
    <img 
      src="/aura_logo.jpg" 
      alt="A.U.R.A. Logo" 
      className={className}
      style={{ objectPosition: "center" }}
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Shared scroll fraction ref for canvas animation loop to avoid dependency cycles
  const scrollFractionRef = useRef(0);

  // Fast Cinematic Splash Loader
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setEntranceComplete(true), 200);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  // SCROLLYTELLING CANVAS ENGINE (ULTRA-OPTIMIZED 60 FPS STREAMING)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    const frameCount = 293;
    const currentFrame = (index: number) => `/high_res_frames/frame-${index.toString().padStart(3, '0')}.jpg`;
    const images: HTMLImageElement[] = new Array(frameCount);
    let lastDrawnImage: HTMLImageElement | null = null;
    let currentPlayhead = 1;
    let targetPlayhead = 1;
    let lastRenderedIndex = -1;
    let animationFrameId: number;

    const loadFrame = (index: number) => {
      if (index < 1 || index > frameCount || images[index - 1]) return;
      const img = new Image();
      img.src = currentFrame(index);
      images[index - 1] = img;
      return img;
    };

    // 1. Instantly load Frame 1
    const firstImg = loadFrame(1);
    if (firstImg) {
      firstImg.onload = () => {
        lastDrawnImage = firstImg;
        resizeAndDraw();
      };
    }

    // 2. Fast Keyframe Anchor Pass (every 4th frame: 1, 5, 9, 13...) for instant responsiveness
    let keyframeIndex = 1;
    const loadKeyframes = () => {
      for (let i = 0; i < 8 && keyframeIndex <= frameCount; i++, keyframeIndex += 4) {
        loadFrame(keyframeIndex);
      }
      if (keyframeIndex <= frameCount) {
        setTimeout(loadKeyframes, 15);
      } else {
        // 3. Fill remaining in-between frames smoothly in background
        loadRemainingFrames(2);
      }
    };
    setTimeout(loadKeyframes, 50);

    const loadRemainingFrames = (start: number) => {
      let idx = start;
      const step = () => {
        for (let i = 0; i < 10 && idx <= frameCount; i++, idx++) {
          loadFrame(idx);
        }
        if (idx <= frameCount) {
          setTimeout(step, 25);
        }
      };
      step();
    };

    const drawFrame = (index: number) => {
      if (index > frameCount || index <= 0) return;
      
      // Request immediate surrounding neighborhood for instant scrubbing
      for (let offset = -4; offset <= 4; offset++) {
        loadFrame(index + offset);
      }

      let img = images[index - 1];

      // Bi-directional nearest loaded frame search
      if (!img || !img.complete || img.naturalWidth === 0) {
        for (let offset = 1; offset <= 60; offset++) {
          const prev = images[index - 1 - offset];
          if (prev && prev.complete && prev.naturalWidth > 0) { img = prev; break; }
          const next = images[index - 1 + offset];
          if (next && next.complete && next.naturalWidth > 0) { img = next; break; }
        }
      }
      if (!img || !img.complete || img.naturalWidth === 0) {
        img = lastDrawnImage || images[0];
      }
      if (!img || !img.complete || img.naturalWidth === 0) return;

      lastDrawnImage = img;

      const sx = 0;
      const sy = 0;
      const sWidth = img.naturalWidth * 0.90;  
      const sHeight = img.naturalHeight * 0.88; 

      const hRatio = canvas.width / sWidth;
      const vRatio = canvas.height / sHeight;
      const ratio = Math.max(hRatio, vRatio);

      const dWidth = sWidth * ratio;
      const dHeight = sHeight * ratio;
      const dy = (canvas.height - dHeight) / 2;
      
      const isMobile = window.innerWidth < 640;
      let dx = (canvas.width - dWidth) / 2;
      if (isMobile) {
        const centerDx = (canvas.width - dWidth) / 2;
        const progress = Math.min(1, Math.max(0, scrollFractionRef.current));
        dx = progress * centerDx;
      }

      context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    };

    const resizeAndDraw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'medium';
      drawFrame(Math.round(currentPlayhead));
    };

    const handleScroll = () => {
      const html = document.documentElement;
      const maxScroll = html.scrollHeight - html.clientHeight;
      const fraction = maxScroll > 0 ? html.scrollTop / maxScroll : 0;
      scrollFractionRef.current = fraction;
      targetPlayhead = Math.max(1, Math.min(frameCount, fraction * (frameCount - 1) + 1));
      
      // Proactively preload surrounding frame window
      const center = Math.round(targetPlayhead);
      for (let o = -6; o <= 6; o++) {
        loadFrame(center + o);
      }
    };

    const renderLoop = () => {
      // Natural 60 FPS Cinematic Video Easing Playhead
      const delta = targetPlayhead - currentPlayhead;
      if (Math.abs(delta) > 0.001) {
        currentPlayhead += delta * 0.15;
      } else {
        currentPlayhead = targetPlayhead;
      }

      const frameToDraw = Math.max(1, Math.min(frameCount, Math.round(currentPlayhead)));
      if (frameToDraw !== lastRenderedIndex) {
        drawFrame(frameToDraw);
        lastRenderedIndex = frameToDraw;
      }

      // Manage canvas and video visibility/playback dynamically to preserve 100% GPU
      const isNearFooter = scrollFractionRef.current > 0.94;
      if (canvas) {
        canvas.style.opacity = isNearFooter ? "0" : "1";
      }
      if (videoRef.current) {
        videoRef.current.style.opacity = isNearFooter ? "0.85" : "0";
        if (isNearFooter) {
          if (videoRef.current.paused) videoRef.current.play().catch(() => {});
        } else {
          if (!videoRef.current.paused) videoRef.current.pause();
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', resizeAndDraw);
    
    resizeAndDraw();
    renderLoop();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', resizeAndDraw);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Section Refs for Scroll Animations
  const heroRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const missionRef = useRef<HTMLDivElement>(null);
  const techRef = useRef<HTMLDivElement>(null);
  const telemetryRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  // Active section tracker for right-side HUD (01, 02, 03, 04, 05, 06)
  useEffect(() => {
    const sections = [heroRef, problemRef, missionRef, techRef, telemetryRef, teamRef];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = sections.findIndex((s) => s.current === entry.target);
            if (index !== -1) setActiveSection(index);
          }
        });
      },
      { threshold: 0.35 }
    );

    sections.forEach((s) => {
      if (s.current) observer.observe(s.current);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    setMobileMenuOpen(false);
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-[#080B10] text-white selection:bg-[#C084FC] selection:text-black overflow-x-hidden min-h-screen relative font-sans tracking-normal leading-relaxed">
      
      {/* --- SCROLLYTELLING CANVAS (HARDWARE ACCELERATED DIRECT BLIT) --- */}
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 w-screen h-screen pointer-events-none transition-opacity duration-500"
        style={{ 
          zIndex: 0,
          willChange: "transform, opacity"
        }}
      />

      {/* --- GALAXY VIDEO BACKGROUND --- */}
      <video
        ref={videoRef}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_080203_fd7f4f85-3a86-4837-8192-85e7bfe68e75.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-1000"
        style={{ 
          zIndex: 0,
          opacity: 0,
          willChange: "opacity"
        }}
      />

      {/* --- FAST ENTRANCE LOADER --- */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-[#05070a] flex flex-col items-center justify-center overflow-hidden px-4"
          >
            <div className="absolute w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-[#9333EA]/10 blur-[100px] pointer-events-none" />

            <div className="flex flex-col gap-4 sm:gap-6 items-center text-center">
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 0.9 }}
                transition={{ duration: 0.8 }}
                className="text-xs sm:text-2xl tracking-[0.3em] font-light text-white uppercase font-display"
              >
                AURA SYSTEM INITIALIZATION
              </motion.div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-6xl sm:text-8xl font-black tracking-tight text-flowing-purple font-display"
              >
                AURA
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-sm sm:text-xl font-bold tracking-[0.3em] text-flowing-purple border border-[#9333EA]/50 px-5 py-2 rounded-lg font-display bg-black/40 backdrop-blur-md"
              >
                SYSTEM ONLINE
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CLEAN MOBILE & DESKTOP NAVBAR WITH NEON BORDER --- */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={entranceComplete ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="fixed top-4 left-4 right-4 sm:top-5 sm:left-6 sm:right-6 z-50 max-w-7xl mx-auto"
      >
        <NeonBorder
          color="#C084FC"
          rounded={100}
          thickness={3}
          borderSize={45}
          glow={85}
          speed={14}
          className="w-full"
        >
          <div className="h-14 px-4 sm:px-6 flex items-center justify-between bg-[#05070a]/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl">
            {/* Left: Logo & Brand */}
            <div className="flex items-center gap-3 flex-shrink-0 pl-1">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer flex items-center gap-2 sm:gap-2.5 flex-shrink-0"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <AuraLogo className="w-8 h-8 sm:w-9 sm:h-9 object-cover rounded-full border border-[#C084FC] shadow-[0_0_15px_rgba(192,132,252,0.6)] flex-shrink-0" />
                <span className="text-sm sm:text-base font-black tracking-[0.2em] text-white font-display flex items-center drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]">
                  <span className="text-[#C084FC]">A.</span>
                  <span className="text-white">U.</span>
                  <span className="text-[#C084FC]">R.</span>
                  <span className="text-white">A.</span>
                </span>
              </motion.div>
            </div>

            {/* Center: Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8 text-[11px] uppercase font-bold tracking-widest text-white/90 font-display">
              <button onClick={() => scrollToSection(heroRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Hero" /></button>
              <button onClick={() => scrollToSection(problemRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Problem" /></button>
              <button onClick={() => scrollToSection(missionRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Mission" /></button>
              <button onClick={() => scrollToSection(techRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Tech" /></button>
              <button onClick={() => scrollToSection(telemetryRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Data" /></button>
              <button onClick={() => scrollToSection(teamRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Team" /></button>
            </div>

            {/* Right: Starfield Button (Desktop) & Hamburger Toggle (Mobile) */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <StarfieldButton
                  label="REPOSITORY"
                  link="https://github.com/jafferrilwaan-png/A.U.R.A-System"
                  newTab={true}
                  padding="8px 20px"
                  font={{
                    fontSize: 11,
                    fontFamily: "Plus Jakarta Sans, sans-serif",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                  }}
                  stroke={{
                    color: "#C084FC",
                    count: 2,
                    speed: 45,
                    size: 80,
                    thickness: 2,
                    movement: "continuous",
                    direction: "cw",
                  }}
                  glow={{ color: "#9333EA", size: 14, opacity: 80 }}
                  pixel={{ color: "#C084FC", size: 3, density: 45, brightness: 100 }}
                  colors={{ fill: "rgba(12, 10, 20, 0.7)", textColor: "#FFFFFF" }}
                />
              </div>

              {/* Mobile Hamburger Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-xl border border-white/10 active:scale-95 transition-all"
                aria-label="Toggle Navigation Menu"
              >
                <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`} />
              </button>
            </div>
          </div>
        </NeonBorder>
      </motion.nav>

      {/* --- MOBILE DROPDOWN MENU --- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 left-4 right-4 z-50 p-6 bg-[#05070a]/95 backdrop-blur-2xl border border-white/20 rounded-3xl md:hidden flex flex-col gap-4 text-center shadow-2xl"
          >
            <button onClick={() => scrollToSection(heroRef)} className="py-2 text-base font-bold uppercase tracking-wider text-white hover:text-[#C084FC] border-b border-white/10 font-display">Hero</button>
            <button onClick={() => scrollToSection(problemRef)} className="py-2 text-base font-bold uppercase tracking-wider text-white hover:text-[#C084FC] border-b border-white/10 font-display">Problem</button>
            <button onClick={() => scrollToSection(missionRef)} className="py-2 text-base font-bold uppercase tracking-wider text-white hover:text-[#C084FC] border-b border-white/10 font-display">Mission</button>
            <button onClick={() => scrollToSection(techRef)} className="py-2 text-base font-bold uppercase tracking-wider text-white hover:text-[#C084FC] border-b border-white/10 font-display">Tech</button>
            <button onClick={() => scrollToSection(teamRef)} className="py-2 text-base font-bold uppercase tracking-wider text-white hover:text-[#C084FC] border-b border-white/10 font-display">Team</button>
            <a 
              href="https://github.com/jafferrilwaan-png/A.U.R.A-System" 
              target="_blank" 
              rel="noreferrer" 
              className="mt-2 py-3 bg-[#9333EA] text-white font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 font-display"
            >
              <i className="bi bi-github text-lg" />
              GitHub Repository
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CONTENT OVERLAYS --- */}
      <div className="relative z-10 w-full bg-transparent">
        
        {/* --- SECTION 1: HERO --- */}
        <section ref={heroRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 pt-24 sm:pt-20 pb-12 bg-transparent">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 opacity-[0.03]">
            <span className="text-[clamp(100px,25vw,450px)] uppercase tracking-tighter font-black text-white font-display">
              AURA
            </span>
          </div>

          <div 
            className="max-w-4xl flex flex-col gap-5 sm:gap-6 text-left bg-transparent"
          >
            <h1 className="font-black leading-[1.02] sm:leading-[0.98] tracking-tight text-[clamp(32px,8vw,76px)] uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              Sub-Surface Cavity & <br />
              Life Detection System
            </h1>

            <p className="max-w-2xl text-base sm:text-lg text-white font-normal leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
              A.U.R.A. maps active void spaces, acoustic signatures, and structural collapse zones into a single real-time tactical intelligence layer.
            </p>
          </div>
        </section>

        {/* --- SECTION 2: PROBLEM / CRISIS SECTION --- */}
        <section ref={problemRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 py-16 sm:py-24 bg-transparent">
          <div className="max-w-5xl mx-auto w-full bg-transparent">
            <div className="mb-10 sm:mb-12 border-b border-white/20 pb-4 sm:pb-6">
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#C084FC]/15 border border-[#C084FC]/40 text-[#C084FC] text-[11px] font-extrabold tracking-[0.2em] uppercase mb-3 font-display shadow-[0_0_15px_rgba(192,132,252,0.35)]">
                CRITICAL VECTOR
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">Subterranean Blindspots</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-10 text-left">
              <div className="relative rounded-2xl border border-white/10 p-2 md:rounded-3xl md:p-3 bg-[#080b12]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Ambient Glass AURA Background Watermark */}
                <div className="absolute -top-4 -right-2 text-[64px] sm:text-[80px] font-black font-display tracking-tighter text-[#C084FC]/[0.08] pointer-events-none select-none z-0 leading-none">
                  AURA
                </div>
                <GlowingEffect
                  spread={45}
                  glow={true}
                  disabled={false}
                  proximity={80}
                  inactiveZone={0.01}
                />
                <div className="relative z-10 flex h-full flex-col justify-between overflow-hidden rounded-xl p-6 sm:p-7">
                  <div>
                    <span className="text-[#C084FC] text-xs font-extrabold block mb-2 tracking-wider font-display drop-shadow-sm">CRITICAL WINDOW</span>
                    <h4 className="text-xl sm:text-2xl font-bold text-flowing-purple mb-2 sm:mb-3 font-display">The Golden 72-Hour Window</h4>
                    <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                      First responders face massive structural hazards in the initial 72 hours after collapse. Structural layout shifts make traditional tracking systems obsolete within minutes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative rounded-2xl border border-white/10 p-2 md:rounded-3xl md:p-3 bg-[#080b12]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Ambient Glass AURA Background Watermark */}
                <div className="absolute -top-4 -right-2 text-[64px] sm:text-[80px] font-black font-display tracking-tighter text-[#C084FC]/[0.08] pointer-events-none select-none z-0 leading-none">
                  AURA
                </div>
                <GlowingEffect
                  spread={45}
                  glow={true}
                  disabled={false}
                  proximity={80}
                  inactiveZone={0.01}
                />
                <div className="relative z-10 flex h-full flex-col justify-between overflow-hidden rounded-xl p-6 sm:p-7">
                  <div>
                    <span className="text-[#C084FC] text-xs font-extrabold block mb-2 tracking-wider font-display drop-shadow-sm">TECHNOLOGY FAILURE</span>
                    <h4 className="text-xl sm:text-2xl font-bold text-flowing-purple mb-2 sm:mb-3 font-display">Structural Blindspots</h4>
                    <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                      Traditional aerial scanners and thermal drones completely fail to scan beneath collapsed steel and dense concrete layers, leaving first responders entirely blind to hollow air pockets.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 2.5: MISSION & HUMAN COST TRAGEDY --- */}
        <section ref={missionRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 py-16 sm:py-24 bg-transparent">
          <div className="max-w-5xl mx-auto w-full bg-transparent">
            <div className="mb-10 sm:mb-12 border-b border-white/20 pb-4 sm:pb-6">
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#C084FC]/15 border border-[#C084FC]/40 text-[#C084FC] text-[11px] font-extrabold tracking-[0.2em] uppercase mb-3 font-display shadow-[0_0_15px_rgba(192,132,252,0.35)]">
                THE HUMAN COST & OUR MISSION
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">Buried in Silence</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 sm:gap-8 items-center text-left">
              <div className="relative overflow-hidden border-l-4 border-[#9333EA] pl-4 sm:pl-6 py-3 bg-[#0a0d14]/60 backdrop-blur-sm rounded-r-xl shadow-lg">
                <div className="absolute -top-3 -right-2 text-[56px] sm:text-[72px] font-black font-display tracking-tighter text-[#C084FC]/[0.07] pointer-events-none select-none z-0 leading-none">
                  AURA
                </div>
                <div className="relative z-10">
                  <span className="text-4xl sm:text-5xl font-extrabold text-flowing-purple block mb-1 font-display">80,000+</span>
                  <p className="text-xs text-white uppercase tracking-widest font-extrabold font-display drop-shadow-sm">Lives Lost Annually</p>
                  <p className="text-xs sm:text-sm text-white/90 mt-2 font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">Lost under building collapses globally, where lack of real-time cavity search mappings delays responders.</p>
                </div>
              </div>

              <div className="relative overflow-hidden border-l-4 border-[#9333EA] pl-4 sm:pl-6 py-3 bg-[#0a0d14]/60 backdrop-blur-sm rounded-r-xl shadow-lg">
                <div className="absolute -top-3 -right-2 text-[56px] sm:text-[72px] font-black font-display tracking-tighter text-[#C084FC]/[0.07] pointer-events-none select-none z-0 leading-none">
                  AURA
                </div>
                <div className="relative z-10">
                  <span className="text-4xl sm:text-5xl font-extrabold text-flowing-purple block mb-1 font-display">80%</span>
                  <p className="text-xs text-white uppercase tracking-widest font-extrabold font-display drop-shadow-sm">Preventable Deaths</p>
                  <p className="text-xs sm:text-sm text-white/90 mt-2 font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">Of deaths post-collapse are due to suffocation or dynamic shifting, occurring because victims cannot be located within the crucial 72-hour window.</p>
                </div>
              </div>

              <div className="relative overflow-hidden md:col-span-1 border-t md:border-t-0 md:border-l border-white/20 md:pl-8 pt-4 md:pt-0">
                <div className="absolute -top-3 -right-2 text-[56px] sm:text-[72px] font-black font-display tracking-tighter text-[#C084FC]/[0.07] pointer-events-none select-none z-0 leading-none">
                  AURA
                </div>
                <div className="relative z-10">
                  <span className="text-[#C084FC] text-xs font-bold uppercase tracking-widest block mb-2 font-display drop-shadow-sm">MISSION STATEMENT</span>
                  <p className="text-sm sm:text-base text-white/90 leading-relaxed font-light italic drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                    "Our mission is absolute: Zero unmapped survivors. By translating seismic acoustics into immediate locational coordinates, A.U.R.A. ensures that no life remains buried in silence."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 3: TECH ARCHITECTURE --- */}
        <section ref={techRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 py-16 sm:py-24 bg-transparent relative overflow-hidden">
          {/* Ambient AURA Watermark Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-10">
            <span className="text-[20vw] font-black tracking-[0.15em] text-[#C084FC] font-display">AURA</span>
          </div>

          <div className="max-w-7xl mx-auto w-full bg-transparent relative z-10">
            <div className="text-center mb-10 sm:mb-16 border-b border-white/20 pb-6 sm:pb-8">
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#C084FC]/15 border border-[#C084FC]/40 text-[#C084FC] text-[11px] font-extrabold tracking-[0.2em] uppercase mb-3 font-display shadow-[0_0_15px_rgba(192,132,252,0.35)]">
                SYSTEM FLOW
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">Tech Architecture</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { title: "Ultrasonic Profiling", desc: "Scans depth anomalies to map hollow air pockets and detect layout shifts." },
                { title: "Seismic Listening", desc: "Piezoelectric geophone sensors filter ambient noise to detect rescue tap patterns." },
                { title: "Edge Logic", desc: "Local microcontrollers parse telemetry feeds with zero network latency." },
                { title: "Telemetry Alerts", desc: "Instantly broadcasts live GPS coordinates and signals to responder dashboards." },
              ].map((item, idx) => (
                <div key={idx} className="relative rounded-2xl border border-white/10 p-2 md:rounded-3xl bg-[#0a0d14]/75 backdrop-blur-md flex flex-col justify-between min-h-[160px] text-left shadow-lg group overflow-hidden">
                  {/* Ambient Glass AURA Background Watermark */}
                  <div className="absolute -top-3 -right-2 text-[52px] sm:text-[68px] font-black font-display tracking-tighter text-[#C084FC]/[0.08] pointer-events-none select-none z-0 leading-none">
                    AURA
                  </div>
                  <GlowingEffect
                    spread={35}
                    glow={true}
                    disabled={false}
                    proximity={60}
                    inactiveZone={0.01}
                  />
                  <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-between h-full">
                    <div>
                      <span className="text-[#C084FC] text-xs font-extrabold block mb-2 sm:mb-4 font-display drop-shadow-sm">MODULE_0{idx + 1}</span>
                      <h4 className="text-base sm:text-lg font-bold text-flowing-purple mb-2 uppercase tracking-tight font-display"><ScrambleText text={item.title} /></h4>
                    </div>
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECTION 4: TELEMETRY & MODELS --- */}
        <section ref={telemetryRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 py-16 sm:py-24 bg-transparent overflow-hidden">
          <div className="max-w-7xl mx-auto w-full bg-transparent">
            <div className="text-center mb-10 sm:mb-16 border-b border-white/20 pb-6">
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#C084FC]/15 border border-[#C084FC]/40 text-[#C084FC] text-[11px] font-extrabold tracking-[0.2em] uppercase mb-3 font-display shadow-[0_0_15px_rgba(192,132,252,0.35)]">
                LIVE TELEMETRY
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">Telemetry & Models</h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 sm:gap-10 items-start">
              {/* Left Column: macOS Terminal with Interactive Telemetry */}
              <div className="lg:col-span-2">
                <Terminal title="esp32_aura_node.ino — ESP32 DevKit V1" />
              </div>

              {/* Right Column: Model Images with Scroll-Driven 3D Sideways Animations */}
              <div className="flex flex-col gap-6 w-full">
                {/* Model 1: Glides in sideways from right with 3D tilt on scroll */}
                <motion.div
                  initial={{ opacity: 0, x: 50, rotateY: -12, scale: 0.95 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
                  viewport={{ margin: "-40px", once: true }}
                  transition={{ duration: 0.65, ease: "easeOut" }}
                  className="w-full"
                >
                  <PinContainer
                    title="Tunnel Cavity Scan"
                    href="/high_res_frames/frame-100.jpg"
                  >
                    <div className="relative flex flex-col text-left overflow-hidden">
                      {/* Ambient Glass AURA Background Watermark */}
                      <div className="absolute -top-2 -right-1 text-[48px] sm:text-[60px] font-black font-display tracking-tighter text-[#C084FC]/[0.08] pointer-events-none select-none z-0 leading-none">
                        AURA
                      </div>
                      <div className="relative z-10">
                        <div className="w-full h-[150px] sm:h-[170px] overflow-hidden rounded-lg mb-3 border border-white/10 bg-black/40">
                          <img 
                            src="/high_res_frames/frame-100.jpg" 
                            alt="Subsurface model scan phase 1" 
                            className="w-full h-full object-cover rounded-lg group-hover/pin:scale-105 transition-transform duration-500 shadow-xl"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800";
                            }}
                          />
                        </div>
                        <span className="text-[#C084FC] text-[10px] font-extrabold tracking-widest block mb-0.5 font-display drop-shadow-sm">
                          MODEL PROFILE 01
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-flowing-purple mb-1 font-display">
                          Tunnel Cavity Scan
                        </h4>
                        <p className="text-[11px] text-white/80 leading-snug font-normal">
                          Maps structural cavities and returns subterranean safety margins.
                        </p>
                      </div>
                    </div>
                  </PinContainer>
                </motion.div>

                {/* Model 2: Glides in sequentially on next scroll */}
                <motion.div
                  initial={{ opacity: 0, x: 50, rotateY: -12, scale: 0.95 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
                  viewport={{ margin: "-40px", once: true }}
                  transition={{ duration: 0.65, delay: 0.15, ease: "easeOut" }}
                  className="w-full"
                >
                  <PinContainer
                    title="Void Isolation Map"
                    href="/aura_hardware_architecture.jpg"
                  >
                    <div className="relative flex flex-col text-left overflow-hidden">
                      {/* Ambient Glass AURA Background Watermark */}
                      <div className="absolute -top-2 -right-1 text-[48px] sm:text-[60px] font-black font-display tracking-tighter text-[#C084FC]/[0.08] pointer-events-none select-none z-0 leading-none">
                        AURA
                      </div>
                      <div className="relative z-10">
                        <div className="w-full h-[150px] sm:h-[170px] overflow-hidden rounded-lg mb-3 border border-white/10 bg-black/40">
                          <img 
                            src="/aura_hardware_architecture.jpg" 
                            alt="Subsurface model scan phase 2" 
                            className="w-full h-full object-cover rounded-lg group-hover/pin:scale-105 transition-transform duration-500 shadow-xl"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800";
                            }}
                          />
                        </div>
                        <span className="text-[#C084FC] text-[10px] font-extrabold tracking-widest block mb-0.5 font-display drop-shadow-sm">
                          MODEL PROFILE 02
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-flowing-purple mb-1 font-display">
                          Void Isolation Map
                        </h4>
                        <p className="text-[11px] text-white/80 leading-snug font-normal">
                          Highlights internal structures to locate survivors.
                        </p>
                      </div>
                    </div>
                  </PinContainer>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECTION 5: TEAM GRID --- */}
        <section ref={teamRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 py-16 sm:py-24 bg-transparent">
          <div className="max-w-7xl mx-auto w-full bg-transparent">
            <div className="text-center mb-12 sm:mb-16">
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#C084FC]/15 border border-[#C084FC]/40 text-[#C084FC] text-[11px] font-extrabold tracking-[0.2em] uppercase mb-3 font-display shadow-[0_0_15px_rgba(192,132,252,0.35)]">
                COLLABORATIVE ARCHITECTURE
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">Core Architecture Team</h2>
              <p className="text-xs sm:text-sm text-white/90 mt-2 max-w-md mx-auto leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                The core minds behind the A.U.R.A. sub-surface cavity & life detection system architecture.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {[
                {
                  name: "Jaffer Rilwaan V",
                  role: "Lead Systems Architect",
                  img: "/jaffer_rilwaan.png",
                  bio: "Architecting the core structural algorithms and real-time mapping engine.",
                  linkedin: "https://www.linkedin.com/in/jaffer-rilwaan-b4b803386"
                },
                {
                  name: "Hannah Blessy J",
                  role: "Hardware & Sensor Lead",
                  img: "/hannah_blessy.png",
                  bio: "Specializing in hardware arrays, piezoelectric logic, and real-time sensor processing.",
                  linkedin: "https://www.linkedin.com/in/hannah-blessy-j-b0773636b/"
                },
                {
                  name: "Kathiravan V",
                  role: "Telemetry & Cloud Engineer",
                  img: "/kathiravan.png",
                  bio: "Managing secure telemetry routing, alert dispatching, and cloud infrastructure.",
                  linkedin: "https://www.linkedin.com/in/kathiravan-v-160555395/"
                },
                {
                  name: "Kingston",
                  role: "Firmware & Signal Specialist",
                  img: "/kingston.png",
                  bio: "Writing zero-latency microcontroller logic and seismic acoustic signal filters.",
                  linkedin: "#"
                },
                {
                  name: "Giridhar K",
                  role: "UI/UX & Field Ops Lead",
                  img: "/giridhar.png",
                  bio: "Designing high-contrast tactical HUDs and ruggedized responder dashboards.",
                  linkedin: "https://www.linkedin.com/in/giridhar-k-b4bb40402/"
                }
              ].map((member, idx) => (
                <a 
                  key={idx} 
                  href={member.linkedin !== "#" ? member.linkedin : undefined}
                  target={member.linkedin !== "#" ? "_blank" : undefined}
                  rel="noreferrer"
                  className="flex flex-col items-start text-left p-3 rounded-2xl bg-[#0a0d14]/80 backdrop-blur-md border border-white/10 group cursor-pointer hover:border-[#C084FC]/50 hover:-translate-y-2 hover:shadow-[0_0_25px_rgba(192,132,252,0.15)] transition-all duration-300 relative overflow-hidden"
                >
                  {/* Ambient Glass AURA Background Watermark */}
                  <div className="absolute -top-1 -right-1 text-[36px] sm:text-[48px] font-black font-display tracking-tighter text-[#C084FC]/[0.06] pointer-events-none select-none z-0 leading-none">
                    AURA
                  </div>
                  <div className="relative z-10 w-full">
                    <div className="w-full h-[190px] sm:h-[230px] rounded-lg overflow-hidden border border-white/10 group-hover:border-[#C084FC]/50 transition-all mb-3 relative shadow-xl bg-[#080B10]">
                      <AsciiImage
                        image={member.img}
                        fit="cover"
                        focusY={25}
                        columns={70}
                        colorMode="image"
                        reveal={true}
                        revealOptions={{ size: 65, softness: 12 }}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Dark frosted-glass overlay for Bio reveal on hover */}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 backdrop-blur-[2px] pointer-events-none">
                         <p className="text-[10px] sm:text-xs text-white/95 leading-relaxed font-medium translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                           {member.bio}
                         </p>
                         {member.linkedin !== "#" && (
                           <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C084FC] pt-2 border-t border-white/10">
                             <i className="bi bi-linkedin text-xs" />
                             View LinkedIn <i className="bi bi-arrow-up-right text-[9px]" />
                           </div>
                         )}
                      </div>
                    </div>
                    
                    <div className="w-full flex items-center justify-between gap-1 mb-0.5">
                      <h3 className="text-xs sm:text-base font-bold text-flowing-purple tracking-tight uppercase font-display drop-shadow-md truncate"><ScrambleText text={member.name} /></h3>
                      {member.linkedin !== "#" && (
                        <i className="bi bi-linkedin text-xs text-[#C084FC] opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] sm:text-xs text-white/80 tracking-wider uppercase font-semibold drop-shadow-sm">{member.role}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* --- RIGHT-SIDE PAGE NUMBER HUD (01, 02, 03, 04, 05, 06) --- */}
        <div className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-4 items-end pointer-events-auto select-none">
          {[
            { num: "01", label: "HERO", ref: heroRef },
            { num: "02", label: "CRISIS", ref: problemRef },
            { num: "03", label: "MISSION", ref: missionRef },
            { num: "04", label: "SYSTEM", ref: techRef },
            { num: "05", label: "DATA", ref: telemetryRef },
            { num: "06", label: "CREW", ref: teamRef },
          ].map((sec, idx) => {
            const isActive = activeSection === idx;
            return (
              <button
                key={sec.num}
                onClick={() => scrollToSection(sec.ref)}
                className="group flex items-center gap-2.5 cursor-pointer py-1 text-right focus:outline-none"
                aria-label={`Go to section ${sec.num} ${sec.label}`}
              >
                <span
                  className={`text-[9px] font-mono tracking-widest uppercase transition-all duration-300 opacity-0 group-hover:opacity-100 ${
                    isActive ? "text-[#C084FC] opacity-100 font-bold" : "text-white/60"
                  }`}
                >
                  {sec.label}
                </span>
                <span
                  className={`font-mono text-xs sm:text-sm tracking-widest font-black transition-all duration-300 ${
                    isActive
                      ? "text-[#C084FC] scale-125 drop-shadow-[0_0_12px_rgba(192,132,252,0.9)]"
                      : "text-white/30 group-hover:text-white/80"
                  }`}
                >
                  {sec.num}
                </span>
                <span
                  className={`h-[2px] transition-all duration-300 rounded-full ${
                    isActive
                      ? "w-5 bg-[#C084FC] shadow-[0_0_8px_#C084FC]"
                      : "w-2 bg-white/20 group-hover:w-3.5 group-hover:bg-white/60"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* --- FOOTER --- */}
        <footer className="relative bg-[#05070a]/45 backdrop-blur-md border-t border-white/10 flex flex-col items-center justify-between pt-12 pb-10 sm:pt-16 sm:pb-12 px-5 sm:px-12 mt-12 z-20">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12 border-b border-white/10 pb-12">
             <div className="flex flex-col items-start gap-4">
                <motion.div 
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  <AuraLogo className="w-10 h-10 object-cover rounded-full border border-[#C084FC]/60 group-hover:border-[#C084FC] transition-colors shadow-[0_0_15px_rgba(147,51,234,0.3)]" />
                  <span className="text-2xl font-black tracking-tighter text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">A.U.R.A.</span>
                </motion.div>
                <p className="text-xs text-white/70 leading-relaxed max-w-xs font-normal">
                  Bridging the gap between first responders and life trapped beneath disaster rubble. Zero unmapped survivors.
                </p>
             </div>
             
             <div className="flex flex-col items-start gap-4">
                <h4 className="text-[#C084FC] text-[10px] sm:text-xs font-bold uppercase tracking-widest">Navigation</h4>
                <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-white/70 font-medium">
                   <button onClick={() => scrollToSection(heroRef)} className="hover:text-white hover:translate-x-1 transition-all text-left">Hero Overview</button>
                   <button onClick={() => scrollToSection(problemRef)} className="hover:text-white hover:translate-x-1 transition-all text-left">The Problem</button>
                   <button onClick={() => scrollToSection(missionRef)} className="hover:text-white hover:translate-x-1 transition-all text-left">Mission Statement</button>
                   <button onClick={() => scrollToSection(techRef)} className="hover:text-white hover:translate-x-1 transition-all text-left">Architecture</button>
                   <button onClick={() => scrollToSection(telemetryRef)} className="hover:text-white hover:translate-x-1 transition-all text-left">Telemetry & Models</button>
                   <button onClick={() => scrollToSection(teamRef)} className="hover:text-white hover:translate-x-1 transition-all text-left">Core Team</button>
                </div>
             </div>

             <div className="flex flex-col items-start gap-4">
                <h4 className="text-[#C084FC] text-[10px] sm:text-xs font-bold uppercase tracking-widest">Team Profiles</h4>
                <div className="flex flex-col gap-3 text-xs sm:text-sm text-white/70 font-medium w-full">
                   <div className="flex flex-col">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider">Jaffer Rilwaan V</span>
                      <div className="flex gap-3 mt-1 text-xs">
                         <a href="https://www.linkedin.com/in/jaffer-rilwaan-b4b803386" target="_blank" rel="noreferrer" className="hover:text-[#C084FC] flex items-center gap-1"><i className="bi bi-linkedin" /> LinkedIn</a>
                         <a href="/jaffer_rilwaan.png" target="_blank" rel="noreferrer" className="hover:text-[#C084FC] flex items-center gap-1"><i className="bi bi-image" /> Photo</a>
                      </div>
                   </div>
                   <div className="flex flex-col">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider">Hannah Blessy J</span>
                      <div className="flex gap-3 mt-1 text-xs">
                         <a href="https://www.linkedin.com/in/hannah-blessy-j-b0773636b/" target="_blank" rel="noreferrer" className="hover:text-[#C084FC] flex items-center gap-1"><i className="bi bi-linkedin" /> LinkedIn</a>
                         <a href="/hannah_blessy.png" target="_blank" rel="noreferrer" className="hover:text-[#C084FC] flex items-center gap-1"><i className="bi bi-image" /> Photo</a>
                      </div>
                   </div>
                   <div className="flex flex-col">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider">Kathiravan V</span>
                      <div className="flex gap-3 mt-1 text-xs">
                         <a href="https://www.linkedin.com/in/kathiravan-v-160555395/" target="_blank" rel="noreferrer" className="hover:text-[#C084FC] flex items-center gap-1"><i className="bi bi-linkedin" /> LinkedIn</a>
                         <a href="/kathiravan.png" target="_blank" rel="noreferrer" className="hover:text-[#C084FC] flex items-center gap-1"><i className="bi bi-image" /> Photo</a>
                      </div>
                   </div>
                   <div className="flex flex-col">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider">Kingston</span>
                      <div className="flex gap-3 mt-1 text-xs">
                         <a href="/kingston.png" target="_blank" rel="noreferrer" className="hover:text-[#C084FC] flex items-center gap-1"><i className="bi bi-image" /> Photo</a>
                      </div>
                   </div>
                   <div className="flex flex-col">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider">Giridhar K</span>
                      <div className="flex gap-3 mt-1 text-xs">
                         <a href="https://www.linkedin.com/in/giridhar-k-b4bb40402/" target="_blank" rel="noreferrer" className="hover:text-[#C084FC] flex items-center gap-1"><i className="bi bi-linkedin" /> LinkedIn</a>
                         <a href="/giridhar.png" target="_blank" rel="noreferrer" className="hover:text-[#C084FC] flex items-center gap-1"><i className="bi bi-image" /> Photo</a>
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex flex-col items-start gap-4">
                <h4 className="text-[#C084FC] text-[10px] sm:text-xs font-bold uppercase tracking-widest">Resources & Code</h4>
                <div className="flex flex-col gap-3 text-xs sm:text-sm text-white/70 font-medium">
                   <a href="mailto:tactical@aurasystem.dev" className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-2">
                     <i className="bi bi-envelope text-base" /> tactical@aurasystem.dev
                   </a>
                   <a href="https://github.com/jafferrilwaan-png/A.U.R.A-System" target="_blank" rel="noreferrer" className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-2">
                     <i className="bi bi-github text-base" /> GitHub Repository
                   </a>
                   <a href="https://github.com/jafferrilwaan-png/A.U.R.A-System" target="_blank" rel="noreferrer" className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-2">
                     <i className="bi bi-file-earmark-text text-base" /> Documentation
                   </a>
                </div>
             </div>
          </div>
          
          <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-[10px] sm:text-[11px] text-white/40 tracking-widest font-semibold uppercase">
            <span>© 2026 A.U.R.A. ALL RIGHTS RESERVED.</span>
            <span className="mt-2 md:mt-0 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              SECURE TACTICAL NETWORK ONLINE
            </span>
          </div>
        </footer>

        {/* --- BACK TO TOP ARROW --- */}
        <AnimatePresence>
          {activeSection > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-50 w-12 h-12 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:text-[#C084FC] hover:border-[#C084FC] hover:shadow-[0_0_20px_rgba(192,132,252,0.4)] hover:-translate-y-1 transition-all duration-300"
              aria-label="Back to Top"
            >
              <i className="bi bi-chevron-up text-lg stroke-2" />
            </motion.button>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
