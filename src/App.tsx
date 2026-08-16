import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";

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
  const [scrollFraction, setScrollFraction] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Shared scroll fraction ref for canvas animation loop to avoid dependency cycles
  const scrollFractionRef = useRef(0);

  // Loading Screen Timer
  useEffect(() => {
    const loaderTimer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setEntranceComplete(true), 150);
    }, 1800);
    return () => clearTimeout(loaderTimer);
  }, []);

  // SCROLLYTELLING CANVAS ENGINE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    const frameCount = 311;
    const currentFrame = (index: number) => `high_res_frames/frame-${index.toString().padStart(3, '0')}.jpg`;
    const images: HTMLImageElement[] = new Array(frameCount);

    // Render Frame 1 Immediately on Mount
    const firstImg = new Image();
    firstImg.src = currentFrame(1);
    images[0] = firstImg;
    firstImg.onload = () => drawFrame(1);

    // Stream remaining frames asynchronously
    let preloadIndex = 2;
    const preloadChunk = () => {
      const isMobile = window.innerWidth < 640;
      const step = isMobile ? 2 : 1;
      for (let i = 0; i < 15 && preloadIndex <= frameCount; i += step, preloadIndex += step) {
        if (!images[preloadIndex - 1]) {
          const img = new Image();
          img.src = currentFrame(preloadIndex);
          images[preloadIndex - 1] = img;
        }
      }
      if (preloadIndex <= frameCount) {
        setTimeout(preloadChunk, isMobile ? 100 : 40);
      }
    };
    setTimeout(preloadChunk, 150);

    const drawFrame = (index: number) => {
      if (index > frameCount || index <= 0) return;
      let img = images[index - 1];
      if (!img || !img.complete) {
        for (let offset = 1; offset < 10; offset++) {
          const prev = images[Math.max(0, index - 1 - offset)];
          if (prev && prev.complete) { img = prev; break; }
        }
      }
      if (!img || !img.complete) img = images[0];
      if (!img || !img.complete) return;

      context.clearRect(0, 0, canvas.width, canvas.height);

      // --- WATERMARK ASSASSINATION ---
      const sx = 0;
      const sy = 0;
      const sWidth = img.width * 0.90;  
      const sHeight = img.height * 0.88; 

      // Calculate perfect cover fit ratios based on the NEW cleanly cropped dimensions
      const hRatio = canvas.width / sWidth;
      const vRatio = canvas.height / sHeight;
      const ratio = Math.max(hRatio, vRatio);

      const dWidth = sWidth * ratio;
      const dHeight = sHeight * ratio;
      
      const dy = (canvas.height - dHeight) / 2;
      
      // On mobile, pan from left to center as user scrolls
      const isMobile = window.innerWidth < 640;
      let dx = 0;
      if (isMobile) {
        const centerDx = (canvas.width - dWidth) / 2;
        // scrollFraction goes from 0 to ~1
        const progress = Math.min(1, Math.max(0, scrollFractionRef.current));
        dx = progress * centerDx;
      } else {
        dx = (canvas.width - dWidth) / 2;
      }

      context.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    };

    const resizeAndDraw = () => {
      const isMobile = window.innerWidth < 640;
      const dpr = isMobile ? 1.5 : Math.min(window.devicePixelRatio || 1, 2);
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
    let lastRenderTime = 0;

    const handleScroll = () => {
      const html = document.documentElement;
      const fraction = html.scrollTop / (html.scrollHeight - html.clientHeight);
      setScrollFraction(fraction);
      scrollFractionRef.current = fraction;
      targetFrameIndex = Math.max(1, Math.min(frameCount, fraction * frameCount));
    };

    let animationFrameId: number;
    const renderLoop = (timestamp: number) => {
      const isMobile = window.innerWidth < 640;
      const frameInterval = isMobile ? 25 : 16; 

      if (timestamp - lastRenderTime >= frameInterval) {
        currentFrameIndex += (targetFrameIndex - currentFrameIndex) * 0.12;
        if (Math.abs(targetFrameIndex - currentFrameIndex) < 0.01) {
          currentFrameIndex = targetFrameIndex;
        }
        const roundedIndex = Math.round(currentFrameIndex);
        
        // Redraw if index changed OR if we are on mobile and scrolling (dx depends on scroll)
        if (roundedIndex !== lastRenderedIndex || (isMobile && targetFrameIndex !== currentFrameIndex)) {
          drawFrame(roundedIndex);
          lastRenderedIndex = roundedIndex;
        }
        lastRenderTime = timestamp;
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', resizeAndDraw);
    
    resizeAndDraw();
    renderLoop(0);

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

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    setMobileMenuOpen(false);
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-[#080B10] text-white selection:bg-[#C084FC] selection:text-black overflow-x-hidden min-h-screen relative font-sans tracking-normal leading-relaxed">
      
      {/* --- SCROLLYTELLING CANVAS --- */}
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 w-screen h-screen pointer-events-none transition-opacity duration-1000"
        style={{ 
          filter: "contrast(1.08) saturate(1.1)",
          zIndex: 0,
          opacity: scrollFraction > 0.94 ? 0 : 1,
          willChange: "transform"
        }}
      />

      {/* --- GALAXY VIDEO BACKGROUND --- */}
      <video
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_080203_fd7f4f85-3a86-4837-8192-85e7bfe68e75.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-1000"
        style={{ 
          zIndex: 0,
          opacity: scrollFraction > 0.94 ? 0.85 : 0
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

      {/* --- CLEAN MOBILE & DESKTOP NAVBAR --- */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={entranceComplete ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="fixed top-4 left-4 right-4 sm:top-5 sm:left-6 sm:right-6 z-50 h-14 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between bg-[#05070a]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl"
      >
        {/* Left: Logo & Brand */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer flex items-center gap-2.5"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <AuraLogo className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-full border border-[#C084FC]/70 shadow-[0_0_15px_rgba(147,51,234,0.4)]" />
            <span className="text-base font-extrabold tracking-widest text-flowing-purple font-display">A.U.R.A.</span>
          </motion.div>
        </div>

        {/* Center: Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-[11px] uppercase font-bold tracking-widest text-white/90 font-display">
          <button onClick={() => scrollToSection(heroRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Hero" /></button>
          <button onClick={() => scrollToSection(problemRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Problem" /></button>
          <button onClick={() => scrollToSection(missionRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Mission" /></button>
          <button onClick={() => scrollToSection(techRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Tech" /></button>
          <button onClick={() => scrollToSection(teamRef)} className="hover:text-[#C084FC] transition-colors"><ScrambleText text="Team" /></button>
        </div>

        {/* Right: GitHub Button (Desktop) & Hamburger Toggle (Mobile) */}
        <div className="flex items-center gap-3">
          <motion.a
            href="https://github.com/jafferrilwaan-png/A.U.R.A-System"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.05, backgroundColor: "#C084FC", color: "#000" }}
            whileTap={{ scale: 0.95 }}
            className="hidden sm:flex h-9 px-4 sm:px-5 bg-white/10 backdrop-blur-md rounded-full items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white border border-white/10 transition-all font-display shadow-md"
          >
            <i className="bi bi-github text-sm" />
            <ScrambleText text="Repository" />
          </motion.a>

          {/* Mobile Hamburger Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-xl border border-white/10 active:scale-95 transition-all"
            aria-label="Toggle Navigation Menu"
          >
            <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`} />
          </button>
        </div>
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

          <motion.div 
            style={heroScroll}
            className="max-w-4xl flex flex-col gap-5 sm:gap-6 text-left bg-transparent"
          >
            <h1 className="font-black leading-[1.02] sm:leading-[0.98] tracking-tight text-[clamp(32px,8vw,76px)] uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              Sub-Surface Cavity & <br />
              Life Detection System
            </h1>

            <p className="max-w-2xl text-base sm:text-lg text-white font-normal leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
              A.U.R.A. maps active void spaces, acoustic signatures, and structural collapse zones into a single real-time tactical intelligence layer.
            </p>
          </motion.div>
        </section>

        {/* --- SECTION 2: PROBLEM / CRISIS SECTION --- */}
        <section ref={problemRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 py-16 sm:py-24 bg-transparent">
          <motion.div style={problemScroll} className="max-w-5xl mx-auto w-full bg-transparent">
            <div className="mb-10 sm:mb-12 border-b border-white/20 pb-4 sm:pb-6">
              <span className="text-[#C084FC] text-xs font-extrabold tracking-widest uppercase block mb-2 font-display drop-shadow-md">CRITICAL VECTOR</span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">Subterranean Blindspots</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-10 text-left">
              <div className="p-5 sm:p-6 rounded-2xl bg-[#0a0d14]/70 backdrop-blur-md border border-white/10 shadow-lg">
                <span className="text-[#C084FC] text-xs font-extrabold block mb-2 tracking-wider font-display drop-shadow-sm">CRITICAL WINDOW</span>
                <h4 className="text-xl sm:text-2xl font-bold text-flowing-purple mb-2 sm:mb-3 font-display">The Golden 72-Hour Window</h4>
                <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                  First responders face massive structural hazards in the initial 72 hours after collapse. Structural layout shifts make traditional tracking systems obsolete within minutes.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#0a0d14]/70 backdrop-blur-md border border-white/10 shadow-lg">
                <span className="text-[#C084FC] text-xs font-extrabold block mb-2 tracking-wider font-display drop-shadow-sm">TECHNOLOGY FAILURE</span>
                <h4 className="text-xl sm:text-2xl font-bold text-flowing-purple mb-2 sm:mb-3 font-display">Structural Blindspots</h4>
                <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                  Traditional aerial scanners and thermal drones completely fail to scan beneath collapsed steel and dense concrete layers, leaving first responders entirely blind to hollow air pockets.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* --- SECTION 2.5: MISSION & HUMAN COST TRAGEDY --- */}
        <section ref={missionRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 py-16 sm:py-24 bg-transparent">
          <motion.div style={missionScroll} className="max-w-5xl mx-auto w-full bg-transparent">
            <div className="mb-10 sm:mb-12 border-b border-white/20 pb-4 sm:pb-6">
              <span className="text-[#C084FC] text-xs font-extrabold tracking-widest uppercase block mb-2 font-display drop-shadow-md">THE HUMAN COST & OUR MISSION</span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">Buried in Silence</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 sm:gap-8 items-center text-left">
              <div className="border-l-4 border-[#9333EA] pl-4 sm:pl-6 py-3 bg-[#0a0d14]/60 backdrop-blur-sm rounded-r-xl shadow-lg">
                <span className="text-4xl sm:text-5xl font-extrabold text-flowing-purple block mb-1 font-display">80,000+</span>
                <p className="text-xs text-white uppercase tracking-widest font-extrabold font-display drop-shadow-sm">Lives Lost Annually</p>
                <p className="text-xs sm:text-sm text-white/90 mt-2 font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">Lost under building collapses globally, where lack of real-time cavity search mappings delays responders.</p>
              </div>

              <div className="border-l-4 border-[#9333EA] pl-4 sm:pl-6 py-3 bg-[#0a0d14]/60 backdrop-blur-sm rounded-r-xl shadow-lg">
                <span className="text-4xl sm:text-5xl font-extrabold text-flowing-purple block mb-1 font-display">80%</span>
                <p className="text-xs text-white uppercase tracking-widest font-extrabold font-display drop-shadow-sm">Preventable Deaths</p>
                <p className="text-xs sm:text-sm text-white/90 mt-2 font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">Of deaths post-collapse are due to suffocation or dynamic shifting, occurring because victims cannot be located within the crucial 72-hour window.</p>
              </div>

              <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-white/20 md:pl-8 pt-4 md:pt-0">
                <span className="text-[#C084FC] text-xs font-bold uppercase tracking-widest block mb-2 font-display drop-shadow-sm">MISSION STATEMENT</span>
                <p className="text-sm sm:text-base text-white/90 leading-relaxed font-light italic drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                  "Our mission is absolute: Zero unmapped survivors. By translating seismic acoustics into immediate locational coordinates, A.U.R.A. ensures that no life remains buried in silence."
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* --- SECTION 3: TECH ARCHITECTURE --- */}
        <section ref={techRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 py-16 sm:py-24 bg-transparent">
          <motion.div style={techScroll} className="max-w-7xl mx-auto w-full bg-transparent">
            <div className="text-center mb-10 sm:mb-16 border-b border-white/20 pb-6 sm:pb-8">
              <span className="text-[#C084FC] text-xs font-extrabold tracking-widest uppercase block mb-2 font-display drop-shadow-md">SYSTEM FLOW</span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">Tech Architecture</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { title: "Ultrasonic Profiling", desc: "Scans depth anomalies to map hollow air pockets and detect layout shifts." },
                { title: "Seismic Listening", desc: "Piezoelectric geophone sensors filter ambient noise to detect rescue tap patterns." },
                { title: "Edge Logic", desc: "Local microcontrollers parse telemetry feeds with zero network latency." },
                { title: "Telemetry Alerts", desc: "Instantly broadcasts live GPS coordinates and signals to responder dashboards." },
              ].map((item, idx) => (
                <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-[#0a0d14]/70 backdrop-blur-md border border-white/10 flex flex-col justify-between min-h-[160px] text-left shadow-lg">
                  <div>
                    <span className="text-[#C084FC] text-xs font-extrabold block mb-2 sm:mb-4 font-display drop-shadow-sm">MODULE_0{idx + 1}</span>
                    <h4 className="text-base sm:text-lg font-bold text-flowing-purple mb-2 uppercase tracking-tight font-display"><ScrambleText text={item.title} /></h4>
                  </div>
                  <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* --- SECTION 4: TELEMETRY & MODELS --- */}
        <section ref={telemetryRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 py-16 sm:py-24 bg-transparent overflow-hidden">
          <motion.div style={telemetryScroll} className="max-w-7xl mx-auto w-full bg-transparent">
            <div className="text-center mb-10 sm:mb-16 border-b border-white/20 pb-6">
              <span className="text-[#C084FC] text-xs font-extrabold tracking-widest uppercase block mb-2 font-display drop-shadow-md">LIVE TELEMETRY</span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase text-flowing-purple font-display drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">Telemetry & Models</h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 sm:gap-12 items-start">
              {/* Left Column: Browser Mockup */}
              <div className="lg:col-span-2 rounded-xl overflow-hidden border border-white/20 bg-black/85 shadow-2xl">
                <div className="h-10 bg-white/10 border-b border-white/10 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                    <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                    <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
                  </div>
                  <span className="text-xs text-white/80 font-mono select-none">telemetry_feed.py</span>
                  <div className="w-12" />
                </div>
                
                {/* Scroll-animated Python code */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.04,
                        delayChildren: 0.1
                      }
                    }
                  }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, amount: 0.1 }}
                  className="p-4 sm:p-8 overflow-x-auto text-[11px] sm:text-xs md:text-sm text-white font-mono leading-relaxed select-text font-medium text-left"
                >
                  {[
                    "import time",
                    "import numpy as np",
                    "",
                    "class AuraTelemetry:",
                    "    def __init__(self, sensor_frequency=18.4):",
                    "        self.freq = sensor_frequency",
                    "        self.active_voids = []",
                    "",
                    "    def scan_depth_anomalies(self):",
                    "        # Scan subsurface telemetry mapping",
                    "        anomalies = np.random.normal(3.42, 0.12, 10)",
                    "        self.active_voids = [d for d in anomalies if d > 3.0]",
                    "        return self.active_voids",
                    "",
                    "# Initiating realtime cavity parsing...",
                    "aura = AuraTelemetry()",
                    "while True:",
                    "    voids = aura.scan_depth_anomalies()",
                    "    print(f\"Sub-surface scan complete: {len(voids)} active cavities found.\")",
                    "    time.sleep(1.0)"
                  ].map((line, idx) => (
                    <motion.div
                      key={idx}
                      variants={{
                        hidden: { opacity: 0, x: -15, y: 5 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          y: 0,
                          transition: {
                            type: "spring",
                            damping: 20,
                            stiffness: 150
                          }
                        }
                      }}
                      className="min-h-[1.5rem] whitespace-pre"
                    >
                      {line}
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Right Column: Model Images */}
              <div className="flex flex-col gap-6 sm:gap-8">
                {/* Model 1 */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 0.1
                      }
                    }
                  }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, amount: 0.2 }}
                  className="overflow-hidden border border-white/15 rounded-xl p-3 sm:p-4 bg-black/40 backdrop-blur-md group"
                >
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, scale: 0.95 },
                      visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
                    }}
                  >
                    <img 
                      src="high_res_frames/frame-100.jpg" 
                      alt="Subsurface model scan phase 1" 
                      className="w-full h-[160px] sm:h-[180px] object-cover rounded-lg group-hover:scale-[1.02] transition-all duration-300 shadow-2xl"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800";
                      }}
                    />
                  </motion.div>
                  <div className="pt-3 text-left">
                    <motion.span 
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      className="text-[#C084FC] text-xs font-extrabold block mb-1 font-display drop-shadow-sm"
                    >
                      MODEL PROFILE 01
                    </motion.span>
                    <motion.h4 
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      className="text-base sm:text-lg font-bold text-flowing-purple mb-1 font-display"
                    >
                      Tunnel Cavity Scan
                    </motion.h4>
                    <motion.p 
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 0.9, y: 0 }
                      }}
                      className="text-xs text-white leading-relaxed font-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
                    >
                      Maps structural cavities and returns safety margins.
                    </motion.p>
                  </div>
                </motion.div>

                {/* Model 2 */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 0.1
                      }
                    }
                  }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, amount: 0.2 }}
                  className="overflow-hidden border border-white/15 rounded-xl p-3 sm:p-4 bg-black/40 backdrop-blur-md group"
                >
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, scale: 0.95 },
                      visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
                    }}
                  >
                    <img 
                      src="aura_hardware_architecture.jpg" 
                      alt="Subsurface model scan phase 2" 
                      className="w-full h-[160px] sm:h-[180px] object-cover rounded-lg group-hover:scale-[1.02] transition-all duration-300 shadow-2xl"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800";
                      }}
                    />
                  </motion.div>
                  <div className="pt-3 text-left">
                    <motion.span 
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      className="text-[#C084FC] text-xs font-extrabold block mb-1 font-display drop-shadow-sm"
                    >
                      MODEL PROFILE 02
                    </motion.span>
                    <motion.h4 
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      className="text-base sm:text-lg font-bold text-flowing-purple mb-1 font-display"
                    >
                      Void Isolation Map
                    </motion.h4>
                    <motion.p 
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 0.9, y: 0 }
                      }}
                      className="text-xs text-white leading-relaxed font-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
                    >
                      Highlights internal structures to locate survivors.
                    </motion.p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* --- SECTION 5: TEAM GRID --- */}
        <section ref={teamRef} className="min-h-screen w-full flex flex-col justify-center px-5 sm:px-12 py-16 sm:py-24 bg-transparent">
          <motion.div style={teamScroll} className="max-w-7xl mx-auto w-full bg-transparent">
            <div className="text-center mb-12 sm:mb-16">
              <span className="text-[#C084FC] text-xs font-extrabold tracking-widest uppercase mb-2 block font-display drop-shadow-md">COLLABORATIVE ARCHITECTURE</span>
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
                  name: "Gurudev Kumaravel",
                  role: "Telemetry & Cloud Engineer",
                  img: "/gurudev_kumaravel.jpg",
                  bio: "Managing secure telemetry routing, alert dispatching, and cloud infrastructure.",
                  linkedin: "https://www.linkedin.com/in/gurudev-kumaravel-955998355/"
                },
                {
                  name: "Aravind Kumar",
                  role: "Firmware Engineer",
                  img: "high_res_frames/frame-120.jpg",
                  bio: "Writing zero-latency microcontroller logic and seismic acoustic filters.",
                  linkedin: "#"
                },
                {
                  name: "Priyanka Mohan",
                  role: "UI/UX Developer",
                  img: "high_res_frames/frame-300.jpg",
                  bio: "Designing tactical command dashboards for first responders in disaster zones.",
                  linkedin: "#"
                }
              ].map((member, idx) => (
                <a 
                  key={idx} 
                  href={member.linkedin !== "#" ? member.linkedin : undefined}
                  target={member.linkedin !== "#" ? "_blank" : undefined}
                  rel="noreferrer"
                  className="flex flex-col items-start text-left p-3 rounded-2xl bg-[#0a0d14]/80 backdrop-blur-md border border-white/10 group cursor-pointer hover:border-[#C084FC]/50 hover:-translate-y-2 hover:shadow-[0_0_25px_rgba(192,132,252,0.15)] transition-all duration-300 relative"
                >
                  <div className="w-full h-[180px] sm:h-[220px] rounded-lg overflow-hidden border border-white/10 group-hover:border-[#C084FC]/40 transition-all mb-3 relative shadow-xl bg-gradient-to-b from-[#141a29] to-[#080b10] flex items-center justify-center">
                    {member.img ? (
                      <img 
                        src={member.img} 
                        alt={`Portrait of ${member.name}, ${member.role}`} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.name)}`;
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#9333EA]/20 border border-[#C084FC]/40 flex items-center justify-center text-white text-xl font-bold font-display shadow-inner">
                          <i className="bi bi-person-fill text-2xl text-[#C084FC]" />
                        </div>
                        <span className="text-[10px] text-white/60 font-mono uppercase tracking-wider">LinkedIn Profile</span>
                      </div>
                    )}
                    
                    {/* Dark frosted-glass overlay for Bio reveal on hover */}
                    <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 backdrop-blur-[2px]">
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
                </a>
              ))}
            </div>
          </motion.div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="relative bg-[#05070a]/45 backdrop-blur-md border-t border-white/10 flex flex-col items-center justify-between pt-12 pb-10 sm:pt-16 sm:pb-12 px-5 sm:px-12 mt-12 z-20">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 mb-12 border-b border-white/10 pb-12">
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
                   <button onClick={() => scrollToSection(techRef)} className="hover:text-white hover:translate-x-1 transition-all text-left">Architecture</button>
                   <button onClick={() => scrollToSection(telemetryRef)} className="hover:text-white hover:translate-x-1 transition-all text-left">Telemetry & Models</button>
                   <button onClick={() => scrollToSection(teamRef)} className="hover:text-white hover:translate-x-1 transition-all text-left">Core Team</button>
                </div>
             </div>

             <div className="flex flex-col items-start gap-4">
                <h4 className="text-[#C084FC] text-[10px] sm:text-xs font-bold uppercase tracking-widest">Contact & Resources</h4>
                <div className="flex flex-col gap-3 text-xs sm:text-sm text-white/70 font-medium">
                   <a href="mailto:tactical@aurasystem.dev" className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-2">
                     <i className="bi bi-envelope text-base" /> tactical@aurasystem.dev
                   </a>
                   <a href="https://github.com/jafferrilwaan-png/A.U.R.A-System" target="_blank" rel="noreferrer" className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-2">
                     <i className="bi bi-file-earmark-text text-base" /> Documentation
                   </a>
                   <a href="https://github.com/jafferrilwaan-png/A.U.R.A-System" target="_blank" rel="noreferrer" className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-2">
                     <i className="bi bi-github text-base" /> GitHub Repository
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
          {scrollFraction > 0.1 && (
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
