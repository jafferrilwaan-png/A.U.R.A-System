// Topo Contour — 3D Interactive Subterranean Topographic Radar
// Enhanced with full 3D interactive orbit/pan/zoom and real-time seismic/acoustic disturbance wave distortion.

"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const DEFAULTS = {
    contour: "#00C2FF",
    indexColor: "#07FF00",
    interval: 11,
    indexEvery: 5,
    thickness: 10,
    zoom: 15,
    detail: 5,
    ridges: 15,
    speed: 20,
};

type Config = {
    contour: string;
    indexColor: string;
    interval: number;
    indexEvery: number;
    thickness: number;
    zoom: number;
    detail: number;
    ridges: number;
    speed: number;
    disturbance?: number; // 0.0 to 1.0 intensity
    disturbanceFreq?: number; // Hz frequency
    interactive?: boolean;
};

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback;
    return Math.max(lo, Math.min(hi, n));
}

function settingsFor(cfg: Config) {
    return {
        interval: 3.0 + clamp(cfg.interval, 1, 20, DEFAULTS.interval) * 1.6,
        indexEvery: Math.round(clamp(cfg.indexEvery, 0, 10, DEFAULTS.indexEvery)),
        thickness: 0.4 + clamp(cfg.thickness, 1, 20, DEFAULTS.thickness) * 0.09,
        zoom: 0.6 + (21 - clamp(cfg.zoom, 1, 20, DEFAULTS.zoom)) * 0.22,
        detail: 1.0 + clamp(cfg.detail, 1, 20, DEFAULTS.detail) * 0.25,
        ridges: clamp(cfg.ridges, 0, 20, DEFAULTS.ridges) * 0.06,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.035,
    };
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

const TOPO_FRAGMENT = /* glsl */ `
    precision highp float;

    uniform vec2 uResolution;
    uniform vec3 uContour;
    uniform vec3 uIndexColor;
    uniform float uTime;
    uniform float uInterval;
    uniform float uIndexEvery;
    uniform float uThickness;
    uniform float uZoom;
    uniform float uDetail;
    uniform float uRidges;
    
    // 3D Interactive Orbit & Pan Uniforms
    uniform vec2 uPan;
    uniform vec2 uRotation;
    uniform float uInteractiveZoom;
    
    // Seismic & Acoustic Disturbance Uniforms
    uniform float uDisturbance;
    uniform vec2 uDisturbanceCenter;
    uniform float uDisturbancePhase;
    uniform float uDisturbanceFreq;

    varying vec2 vUv;

    float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.56);
        return fract(p.x * p.y * 95.43);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
        );
    }

    float fbm(vec2 p) {
        float sum = 0.0;
        float amp = 0.5;
        float norm = 0.0;
        for (int i = 0; i < 5; i++) {
            float w = clamp(uDetail - float(i), 0.0, 1.0);
            sum += noise(p) * amp * w;
            norm += amp * w;
            p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.03;
            amp *= 0.5;
        }
        return sum / max(0.0001, norm);
    }

    float height(vec2 p) {
        vec2 warp = vec2(fbm(p + uTime * 0.1), fbm(p - uTime * 0.08 + 3.7));
        float baseH = fbm(p + warp * uRidges * 5.0);

        // Acoustic & Seismic Disturbance Shockwave Propagation
        if (uDisturbance > 0.001) {
            float d = length(p - uDisturbanceCenter * uZoom * 4.0);
            float freqMult = 10.0 + min(uDisturbanceFreq * 0.05, 15.0);
            
            // Primary propagating shockwave ring
            float primaryWave = sin(d * freqMult - uDisturbancePhase * 16.0) * exp(-d * 0.35);
            // High-frequency secondary seismic tremor ripples
            float tremor = sin(d * 32.0 - uDisturbancePhase * 28.0) * 0.4 * exp(-d * 0.7);
            
            float shock = (primaryWave + tremor) * uDisturbance * 0.95;
            return baseH + shock;
        }

        return baseH;
    }

    float contourAt(float slices, float width) {
        float distToLine = abs(fract(slices) - 0.5) / max(fwidth(slices), 0.0001);
        return 1.0 - smoothstep(0.0, width, distToLine);
    }

    void main() {
        float aspect = uResolution.x / max(1.0, uResolution.y);
        
        // Base normalized coordinate space
        vec2 coord = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);

        // 3D Perspective Foreshortening & Tilt Transformation
        float tilt = clamp(uRotation.y, -1.2, 1.2);
        float yaw = uRotation.x;
        
        mat2 rotYaw = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw));
        
        // Perspective depth foreshortening
        float depthScale = max(0.2, 1.0 + coord.y * sin(tilt) * 1.1);
        vec2 p3d = vec2(coord.x / depthScale, coord.y / depthScale);
        
        // Apply interactive rotation and pan
        vec2 p = (rotYaw * p3d + uPan) * uZoom * uInteractiveZoom * 4.0;

        float slices = height(p) * uInterval;
        float line = contourAt(slices, uThickness);

        float indexLine = 0.0;
        if (uIndexEvery > 0.5) {
            indexLine = contourAt(slices / uIndexEvery, uThickness * 1.6);
        }

        vec3 col = mix(uContour, uIndexColor, clamp(indexLine, 0.0, 1.0));
        
        // If disturbance is active, illuminate terrain shockwave crests with radiant neon amber/red/cyan pulses
        if (uDisturbance > 0.01) {
            float d = length(p - uDisturbanceCenter * uZoom * 4.0);
            float ringHighlight = sin(d * 12.0 - uDisturbancePhase * 16.0);
            vec3 disturbanceColor = mix(vec3(1.0, 0.5, 0.0), vec3(0.9, 0.1, 0.3), clamp(uDisturbance, 0.0, 1.0));
            col += disturbanceColor * smoothstep(0.3, 0.95, ringHighlight) * uDisturbance * 1.8;
        }

        float alpha = clamp(max(line, indexLine), 0.0, 1.0);
        
        // Vignette fade on extreme edges
        float edgeFade = smoothstep(1.2, 0.4, length(coord));
        alpha *= mix(0.7, 1.0, edgeFade);

        gl_FragColor = vec4(col * alpha, alpha);
    }
`;

export class TopoScene {
    private container: HTMLElement;
    private cfg: Config;

    private renderer: THREE.WebGLRenderer;
    private scene = new THREE.Scene();
    private camera = new THREE.Camera();
    private geometry = new THREE.PlaneGeometry(2, 2);
    private material: THREE.ShaderMaterial;
    private mesh: THREE.Mesh;

    private time = 0;
    private frameId = 0;
    private lastT = 0;
    private disposed = false;

    // Interactive State (Current & Target with smooth exponential damping)
    public targetPan = new THREE.Vector2(0, 0);
    public currentPan = new THREE.Vector2(0, 0);
    
    public targetRotation = new THREE.Vector2(0, 0.25); // Slight cinematic 3D tilt default
    public currentRotation = new THREE.Vector2(0, 0.25);
    
    public targetZoom = 1.0;
    public currentZoom = 1.0;

    // Disturbance Wave State
    public disturbanceIntensity = 0.0;
    public targetDisturbance = 0.0;
    public disturbancePhase = 0.0;
    public disturbanceCenter = new THREE.Vector2(0, 0);
    public disturbanceFreq = 40.0;

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container;
        this.cfg = cfg;
        const S = settingsFor(cfg);

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setClearColor(0x000000, 0);
        const el = this.renderer.domElement;
        el.style.position = "absolute";
        el.style.inset = "0";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.cursor = cfg.interactive !== false ? "grab" : "default";
        container.appendChild(el);

        this.material = new THREE.ShaderMaterial({
            vertexShader: QUAD_VERTEX,
            fragmentShader: TOPO_FRAGMENT,
            uniforms: {
                uResolution: { value: new THREE.Vector2(1, 1) },
                uContour: { value: new THREE.Color(cfg.contour) },
                uIndexColor: { value: new THREE.Color(cfg.indexColor) },
                uTime: { value: 0 },
                uInterval: { value: S.interval },
                uIndexEvery: { value: S.indexEvery },
                uThickness: { value: S.thickness },
                uZoom: { value: S.zoom },
                uDetail: { value: S.detail },
                uRidges: { value: S.ridges },
                uPan: { value: new THREE.Vector2(0, 0) },
                uRotation: { value: new THREE.Vector2(0, 0.25) },
                uInteractiveZoom: { value: 1.0 },
                uDisturbance: { value: 0.0 },
                uDisturbanceCenter: { value: new THREE.Vector2(0, 0) },
                uDisturbancePhase: { value: 0.0 },
                uDisturbanceFreq: { value: 40.0 },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);

        if (cfg.disturbance) {
            this.targetDisturbance = cfg.disturbance;
        }
    }

    start() {
        this.lastT = performance.now();
        const loop = () => {
            this.frameId = requestAnimationFrame(loop);
            this.step();
        };
        loop();
    }

    setSize(width: number, height: number) {
        if (this.disposed || width <= 0 || height <= 0) return;
        this.renderer.setSize(width, height, false);
        this.material.uniforms.uResolution.value.set(width, height);
    }

    triggerDisturbance(intensity: number = 1.0, centerX: number = 0, centerY: number = 0, freq: number = 40) {
        this.targetDisturbance = Math.min(1.0, Math.max(this.targetDisturbance, intensity));
        this.disturbanceCenter.set(centerX, centerY);
        this.disturbanceFreq = freq;
        this.disturbancePhase = 0.0;
    }

    resetView() {
        this.targetPan.set(0, 0);
        this.targetRotation.set(0, 0.25);
        this.targetZoom = 1.0;
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return;
        this.cfg = cfg;
        const S = settingsFor(cfg);
        const u = this.material.uniforms;
        u.uContour.value.set(cfg.contour || "#ffffff");
        u.uIndexColor.value.set(cfg.indexColor || "#ffffff");
        u.uInterval.value = S.interval;
        u.uIndexEvery.value = S.indexEvery;
        u.uThickness.value = S.thickness;
        u.uZoom.value = S.zoom;
        u.uDetail.value = S.detail;
        u.uRidges.value = S.ridges;

        if (typeof cfg.disturbance === "number") {
            this.targetDisturbance = cfg.disturbance;
        }
        if (typeof cfg.disturbanceFreq === "number") {
            this.disturbanceFreq = cfg.disturbanceFreq;
        }
    }

    private step() {
        if (this.disposed) return;
        const now = performance.now();
        let dt = (now - this.lastT) / 1000;
        this.lastT = now;
        if (!isFinite(dt) || dt < 0) dt = 0;
        if (dt > 0.05) dt = 0.05;

        // Smooth Interpolation / Damping for 60/120 FPS Interaction
        const lerpFactor = Math.min(1.0, dt * 10.0);
        this.currentPan.lerp(this.targetPan, lerpFactor);
        this.currentRotation.lerp(this.targetRotation, lerpFactor);
        this.currentZoom += (this.targetZoom - this.currentZoom) * lerpFactor;

        // Smooth disturbance decay over time (exponential decay)
        this.disturbanceIntensity += (this.targetDisturbance - this.disturbanceIntensity) * Math.min(1.0, dt * 12.0);
        this.targetDisturbance = Math.max(0.0, this.targetDisturbance - dt * 0.45);
        if (this.disturbanceIntensity > 0.001) {
            this.disturbancePhase += dt * (2.5 + this.disturbanceIntensity * 3.0);
        }

        this.time += dt * settingsFor(this.cfg).speed;
        
        const u = this.material.uniforms;
        u.uTime.value = this.time;
        u.uPan.value.copy(this.currentPan);
        u.uRotation.value.copy(this.currentRotation);
        u.uInteractiveZoom.value = this.currentZoom;
        u.uDisturbance.value = this.disturbanceIntensity;
        u.uDisturbanceCenter.value.copy(this.disturbanceCenter);
        u.uDisturbancePhase.value = this.disturbancePhase;
        u.uDisturbanceFreq.value = this.disturbanceFreq;

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.frameId);
        this.geometry.dispose();
        this.material.dispose();
        this.renderer.dispose();
        const el = this.renderer.domElement;
        if (el.parentNode === this.container) this.container.removeChild(el);
    }
}

interface TopoContourProps {
    contour?: string;
    indexColor?: string;
    interval?: number;
    indexEvery?: number;
    thickness?: number;
    zoom?: number;
    detail?: number;
    ridges?: number;
    speed?: number;
    disturbance?: number; // 0.0 to 1.0 (triggers physical disturbance ripples)
    disturbanceFreq?: number; // Signal frequency in Hz
    interactive?: boolean;
    onResetRequested?: (resetFn: () => void) => void;
    style?: React.CSSProperties;
    className?: string;
}

export default function TopoContour(props: TopoContourProps) {
    const {
        contour = DEFAULTS.contour,
        indexColor = DEFAULTS.indexColor,
        interval = DEFAULTS.interval,
        indexEvery = DEFAULTS.indexEvery,
        thickness = DEFAULTS.thickness,
        zoom = DEFAULTS.zoom,
        detail = DEFAULTS.detail,
        ridges = DEFAULTS.ridges,
        speed = DEFAULTS.speed,
        disturbance = 0,
        disturbanceFreq = 40,
        interactive = true,
        style,
        className = "",
    } = props;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<TopoScene | null>(null);

    // Pointer Interaction State
    const isDraggingRef = useRef(false);
    const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const rotStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0.25 });
    const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isInteracting, setIsInteracting] = useState(false);
    const [hasMoved, setHasMoved] = useState(false);

    // Touch pinch zoom state
    const pinchDistRef = useRef<number | null>(null);

    const cfgRef = useRef<Config>(null as any);
    cfgRef.current = {
        contour,
        indexColor,
        interval,
        indexEvery,
        thickness,
        zoom,
        detail,
        ridges,
        speed,
        disturbance,
        disturbanceFreq,
        interactive,
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        let scene: TopoScene;
        try {
            scene = new TopoScene(container, cfgRef.current);
        } catch {
            return;
        }
        sceneRef.current = scene;
        scene.setSize(container.clientWidth, container.clientHeight);
        scene.start();

        const ro = new ResizeObserver(() => {
            scene.setSize(container.clientWidth, container.clientHeight);
        });
        ro.observe(container);

        // --- POINTER / MOUSE / TOUCH INTERACTION LISTENERS ---
        if (interactive) {
            const handlePointerDown = (e: PointerEvent) => {
                if (!sceneRef.current) return;
                isDraggingRef.current = true;
                setIsInteracting(true);
                setHasMoved(true);
                container.style.cursor = "grabbing";

                pointerStartRef.current = { x: e.clientX, y: e.clientY };
                panStartRef.current = {
                    x: sceneRef.current.targetPan.x,
                    y: sceneRef.current.targetPan.y,
                };

                try {
                    container.setPointerCapture(e.pointerId);
                } catch {}
            };

            const handlePointerMove = (e: PointerEvent) => {
                if (!isDraggingRef.current || !sceneRef.current) return;
                const dx = e.clientX - pointerStartRef.current.x;
                const dy = e.clientY - pointerStartRef.current.y;

                // Move / Pan across subterranean terrain coordinates seamlessly
                const panSpeed = 0.0035 * sceneRef.current.targetZoom;
                sceneRef.current.targetPan.x = panStartRef.current.x - dx * panSpeed;
                sceneRef.current.targetPan.y = panStartRef.current.y + dy * panSpeed;
            };

            const handlePointerUp = (e: PointerEvent) => {
                isDraggingRef.current = false;
                setIsInteracting(false);
                container.style.cursor = "grab";
                try {
                    container.releasePointerCapture(e.pointerId);
                } catch {}
            };

            const handleWheel = (e: WheelEvent) => {
                if (!sceneRef.current) return;
                e.preventDefault();
                const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
                sceneRef.current.targetZoom = clamp(
                    sceneRef.current.targetZoom * zoomFactor,
                    0.4,
                    3.5,
                    1.0
                );
                setHasMoved(true);
            };

            // Touch Pinch Support for mobile devices
            const handleTouchMove = (e: TouchEvent) => {
                if (e.touches.length === 2 && sceneRef.current) {
                    const t1 = e.touches[0];
                    const t2 = e.touches[1];
                    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                    if (pinchDistRef.current !== null) {
                        const ratio = pinchDistRef.current / dist;
                        sceneRef.current.targetZoom = clamp(
                            sceneRef.current.targetZoom * (ratio > 1 ? 1.03 : 0.97),
                            0.4,
                            3.5,
                            1.0
                        );
                        setHasMoved(true);
                    }
                    pinchDistRef.current = dist;
                }
            };

            const handleTouchEnd = () => {
                pinchDistRef.current = null;
            };

            container.addEventListener("pointerdown", handlePointerDown);
            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", handlePointerUp);
            container.addEventListener("wheel", handleWheel, { passive: false });
            container.addEventListener("touchmove", handleTouchMove, { passive: true });
            container.addEventListener("touchend", handleTouchEnd);

            return () => {
                ro.disconnect();
                container.removeEventListener("pointerdown", handlePointerDown);
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerup", handlePointerUp);
                container.removeEventListener("wheel", handleWheel);
                container.removeEventListener("touchmove", handleTouchMove);
                container.removeEventListener("touchend", handleTouchEnd);
                scene.dispose();
                sceneRef.current = null;
            };
        }

        return () => {
            ro.disconnect();
            scene.dispose();
            sceneRef.current = null;
        };
    }, [interactive]);

    useEffect(() => {
        sceneRef.current?.updateConfig(cfgRef.current);
    }, [
        contour,
        indexColor,
        interval,
        indexEvery,
        thickness,
        zoom,
        detail,
        ridges,
        speed,
        disturbance,
        disturbanceFreq,
    ]);

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        sceneRef.current?.resetView();
        setHasMoved(false);
    };

    const handlePulse = (e: React.MouseEvent) => {
        e.stopPropagation();
        sceneRef.current?.triggerDisturbance(1.0, 0, 0, disturbanceFreq);
    };

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="3D Interactive Topographic Radar"
            className={`group select-none touch-none ${className}`}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                ...style,
            }}
        >
            {/* Quick Interactive Floating HUD Controls Overlay */}
            {interactive && (
                <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto opacity-75 group-hover:opacity-100 transition-opacity">
                    {/* Reset View Button */}
                    {hasMoved && (
                        <button
                            onClick={handleReset}
                            className="px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black/95 text-white/80 hover:text-white border border-white/20 hover:border-[#00C2FF] text-[10px] font-mono font-medium transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-1 backdrop-blur-md"
                            title="Re-center Subterranean View"
                        >
                            <span>↻ Re-center</span>
                        </button>
                    )}

                    {/* Moveable Pan Indicator Pill */}
                    <span className="hidden sm:inline-flex px-2 py-1 rounded-lg bg-black/60 text-white/50 border border-white/10 text-[9px] font-mono backdrop-blur-md">
                        {isInteracting ? "Moving Map..." : "Drag: Pan Map • Scroll: Zoom"}
                    </span>
                </div>
            )}
        </div>
    );
}

TopoContour.displayName = "Topo Contour";
