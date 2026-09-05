// Topo Contour — Originkit
// Using component defaults.

"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * Topo Contour — a survey map of a landscape that will not hold still.
 */

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
}

type Config = {
    contour: string
    indexColor: string
    interval: number
    indexEvery: number
    thickness: number
    zoom: number
    detail: number
    ridges: number
    speed: number
}

function clamp(v: number, lo: number, hi: number, fallback: number): number {
    const n = typeof v === "number" && isFinite(v) ? v : fallback
    return Math.max(lo, Math.min(hi, n))
}

/** Panel values are whole numbers; the shader wants the real ones. */
function settingsFor(cfg: Config) {
    return {
        interval: 3.0 + clamp(cfg.interval, 1, 20, DEFAULTS.interval) * 1.6,
        indexEvery: Math.round(clamp(cfg.indexEvery, 0, 10, DEFAULTS.indexEvery)),
        thickness: 0.4 + clamp(cfg.thickness, 1, 20, DEFAULTS.thickness) * 0.09,
        zoom: 0.6 + (21 - clamp(cfg.zoom, 1, 20, DEFAULTS.zoom)) * 0.22,
        detail: 1.0 + clamp(cfg.detail, 1, 20, DEFAULTS.detail) * 0.25,
        ridges: clamp(cfg.ridges, 0, 20, DEFAULTS.ridges) * 0.06,
        speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.035,
    }
}

const QUAD_VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`

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
        return fbm(p + warp * uRidges * 5.0);
    }

    float contourAt(float slices, float width) {
        float distToLine = abs(fract(slices) - 0.5) / max(fwidth(slices), 0.0001);
        return 1.0 - smoothstep(0.0, width, distToLine);
    }

    void main() {
        float aspect = uResolution.x / max(1.0, uResolution.y);
        vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5) * uZoom * 4.0;

        float slices = height(p) * uInterval;
        float line = contourAt(slices, uThickness);

        float indexLine = 0.0;
        if (uIndexEvery > 0.5) {
            indexLine = contourAt(slices / uIndexEvery, uThickness * 1.6);
        }

        vec3 col = mix(uContour, uIndexColor, clamp(indexLine, 0.0, 1.0));
        float alpha = clamp(max(line, indexLine), 0.0, 1.0);

        gl_FragColor = vec4(col * alpha, alpha);
    }
`

class TopoScene {
    private container: HTMLElement
    private cfg: Config

    private renderer: THREE.WebGLRenderer
    private scene = new THREE.Scene()
    private camera = new THREE.Camera()
    private geometry = new THREE.PlaneGeometry(2, 2)
    private material: THREE.ShaderMaterial
    private mesh: THREE.Mesh

    private time = 0
    private frameId = 0
    private lastT = 0
    private disposed = false

    constructor(container: HTMLElement, cfg: Config) {
        this.container = container
        this.cfg = cfg
        const S = settingsFor(cfg)

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        this.renderer.setClearColor(0x000000, 0)
        const el = this.renderer.domElement
        el.style.position = "absolute"
        el.style.inset = "0"
        el.style.width = "100%"
        el.style.height = "100%"
        container.appendChild(el)

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
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)
    }

    start() {
        this.lastT = performance.now()
        const loop = () => {
            this.frameId = requestAnimationFrame(loop)
            this.step()
        }
        loop()
    }

    setSize(width: number, height: number) {
        if (this.disposed || width <= 0 || height <= 0) return
        this.renderer.setSize(width, height, false)
        this.material.uniforms.uResolution.value.set(width, height)
    }

    updateConfig(cfg: Config) {
        if (this.disposed) return
        this.cfg = cfg
        const S = settingsFor(cfg)
        const u = this.material.uniforms
        u.uContour.value.set(cfg.contour || "#ffffff")
        u.uIndexColor.value.set(cfg.indexColor || "#ffffff")
        u.uInterval.value = S.interval
        u.uIndexEvery.value = S.indexEvery
        u.uThickness.value = S.thickness
        u.uZoom.value = S.zoom
        u.uDetail.value = S.detail
        u.uRidges.value = S.ridges
    }

    private step() {
        if (this.disposed) return
        const now = performance.now()
        let dt = (now - this.lastT) / 1000
        this.lastT = now
        if (!isFinite(dt) || dt < 0) dt = 0
        if (dt > 0.05) dt = 0.05

        this.time += dt * settingsFor(this.cfg).speed
        this.material.uniforms.uTime.value = this.time
        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.disposed = true
        cancelAnimationFrame(this.frameId)
        this.geometry.dispose()
        this.material.dispose()
        this.renderer.dispose()
        const el = this.renderer.domElement
        if (el.parentNode === this.container) this.container.removeChild(el)
    }
}

interface TopoContourProps {
    contour?: string
    indexColor?: string
    interval?: number
    indexEvery?: number
    thickness?: number
    zoom?: number
    detail?: number
    ridges?: number
    speed?: number
    style?: React.CSSProperties
    className?: string
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
        style,
        className = ""
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    const sceneRef = useRef<TopoScene | null>(null)

    const cfgRef = useRef<Config>(null as any)
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
    }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let scene: TopoScene
        try {
            scene = new TopoScene(container, cfgRef.current)
        } catch {
            return
        }
        sceneRef.current = scene
        scene.setSize(container.clientWidth, container.clientHeight)
        scene.start()

        const ro = new ResizeObserver(() => {
            scene.setSize(container.clientWidth, container.clientHeight)
        })
        ro.observe(container)
        return () => {
            ro.disconnect()
            scene.dispose()
            sceneRef.current = null
        }
    }, [])

    useEffect(() => {
        sceneRef.current?.updateConfig(cfgRef.current)
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
    ])

    return (
        <div
            ref={containerRef}
            role="img"
            aria-label="Topographic contours"
            className={className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 120,
                minHeight: 120,
                overflow: "hidden",
                ...style,
            }}
        />
    )
}

TopoContour.displayName = "Topo Contour"
