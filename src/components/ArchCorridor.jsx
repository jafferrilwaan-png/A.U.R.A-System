import * as React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"

const SPAN = 22
const ARC_STEPS = 10
const EDGE_STEPS = 5

const DEFAULTS = {
  background: "#000000",
  near: "#C084FC",
  far: "#38BDF8",
  arches: 14,
  twist: 20,
  gauge: 4,
  cornerRadius: 34,
  opening: 100,
  glow: 20,
  animate: true,
  speed: 6,
  direction: "forward",
  sizePercent: 100,
}

function clamp(v, lo, hi, fallback) {
  const n = typeof v === "number" && isFinite(v) ? v : fallback
  return Math.max(lo, Math.min(hi, n))
}

function settingsFor(cfg) {
  const arches = clamp(cfg.arches, 1, 20, DEFAULTS.arches)
  const count = Math.round(6 + arches * arches * 0.55)
  return {
    count,
    spacing: SPAN / count,
    opening: clamp(cfg.opening, 30, 100, DEFAULTS.opening) * 0.01,
    corner: 0.02 + clamp(cfg.cornerRadius, 0, 100, DEFAULTS.cornerRadius) * 0.0096,
    twist: clamp(cfg.twist, 0, 20, DEFAULTS.twist) * 0.022,
    width: 0.008 + clamp(cfg.gauge, 1, 20, DEFAULTS.gauge) * 0.0085,
    glow: 0.25 + clamp(cfg.glow, 1, 20, DEFAULTS.glow) * 0.13,
    speed: clamp(cfg.speed, 0, 20, DEFAULTS.speed) * 0.38,
    heading: cfg.direction === "reverse" ? -1 : 1,
    zoom: 100 / clamp(cfg.sizePercent, 40, 200, DEFAULTS.sizePercent),
  }
}

function traceOutline(corner) {
  const c = Math.min(Math.max(corner, 0.02), 0.98)
  const k = 1 - c
  const centres = [[k, -k],[k, k],[-k, k],[-k, -k]]
  const pts = []
  for (let q = 0; q < 4; q++) {
    const [cx, cy] = centres[q]
    const a0 = (q * Math.PI) / 2 - Math.PI / 2
    for (let j = 0; j <= ARC_STEPS; j++) {
      const a = a0 + (j / ARC_STEPS) * (Math.PI / 2)
      pts.push(new THREE.Vector2(cx + Math.cos(a) * c, cy + Math.sin(a) * c))
    }
    const from = pts[pts.length - 1]
    const nq = (q + 1) % 4
    const b0 = (nq * Math.PI) / 2 - Math.PI / 2
    const to = new THREE.Vector2(centres[nq][0] + Math.cos(b0) * c, centres[nq][1] + Math.sin(b0) * c)
    if (from.distanceTo(to) > 1e-4) {
      for (let j = 1; j < EDGE_STEPS; j++) {
        const t = j / EDGE_STEPS
        pts.push(new THREE.Vector2(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t))
      }
    }
  }
  return pts
}

function buildOutline(corner) {
  const pts = traceOutline(corner)
  const n = pts.length
  const cols = n + 1
  const pos = new Float32Array(cols * 2 * 3)
  const nrm = new Float32Array(cols * 2 * 2)
  const side = new Float32Array(cols * 2)
  const dir = new THREE.Vector2()
  const prev = new THREE.Vector2()
  const next = new THREE.Vector2()
  for (let i = 0; i < cols; i++) {
    const idx = i % n
    const p = pts[idx]
    prev.subVectors(p, pts[(idx - 1 + n) % n])
    next.subVectors(pts[(idx + 1) % n], p)
    if (prev.lengthSq() > 1e-12) prev.normalize()
    if (next.lengthSq() > 1e-12) next.normalize()
    dir.addVectors(prev, next)
    if (dir.lengthSq() < 1e-12) dir.copy(next)
    dir.normalize()
    const nx = dir.y; const ny = -dir.x
    for (let s = 0; s < 2; s++) {
      const v = i * 2 + s
      pos[v * 3 + 0] = p.x; pos[v * 3 + 1] = p.y; pos[v * 3 + 2] = 0
      nrm[v * 2 + 0] = nx; nrm[v * 2 + 1] = ny
      side[v] = s === 0 ? -1 : 1
    }
  }
  const index = []
  for (let i = 0; i < cols - 1; i++) {
    const a = i * 2
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  geo.setAttribute("aNormal", new THREE.BufferAttribute(nrm, 2))
  geo.setAttribute("aSide", new THREE.BufferAttribute(side, 1))
  geo.setIndex(index)
  return geo
}

const ARCH_VERTEX = `
attribute vec2 aNormal;
attribute float aSide;
attribute float aSlot;
uniform float uTime;
uniform float uSpacing;
uniform float uSpan;
uniform float uTwist;
uniform float uOpening;
uniform float uWidth;
varying float vSide;
varying float vDepth;
void main() {
  float z = mod(aSlot * uSpacing + uTime, uSpan);
  float w = uWidth * (0.5 + z * 0.35);
  vec2 p = position.xy * uOpening + aNormal * aSide * w * 0.5;
  float a = z * uTwist;
  float ca = cos(a); float sa = sin(a);
  p = mat2(ca, sa, -sa, ca) * p;
  vSide = aSide; vDepth = z / uSpan;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, -z, 1.0);
}`

const ARCH_FRAGMENT = `
precision highp float;
uniform vec3 uNear;
uniform vec3 uFar;
uniform float uGlow;
varying float vSide;
varying float vDepth;
void main() {
  float across = 1.0 - abs(vSide);
  float shape = pow(across, 5.0) + pow(across, 1.6) * 0.35;
  vec3 col = mix(uNear, uFar, vDepth);
  float fog = (1.0 - smoothstep(0.35, 0.95, vDepth)) * smoothstep(0.0, 0.06, vDepth);
  float amount = shape * fog * uGlow;
  gl_FragColor = vec4(col * amount, amount);
}`

class ArchCorridorScene {
  constructor(container, cfg) {
    this.container = container
    this.cfg = cfg
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, SPAN + 6)
    this.geometry = null
    this.mesh = null
    this.width = 1; this.height = 1; this.time = 0; this.lastT = 0; this.frameId = 0; this.disposed = false
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    const canvas = this.renderer.domElement
    canvas.style.position = "absolute"; canvas.style.inset = "0"; canvas.style.width = "100%"; canvas.style.height = "100%"
    container.appendChild(canvas)
    const S = settingsFor(cfg)
    this.uniforms = {
      uTime: { value: 0 }, uSpacing: { value: S.spacing }, uSpan: { value: SPAN },
      uTwist: { value: S.twist }, uOpening: { value: S.opening }, uWidth: { value: S.width },
      uNear: { value: new THREE.Color(cfg.near) }, uFar: { value: new THREE.Color(cfg.far) }, uGlow: { value: S.glow },
    }
    this.material = new THREE.ShaderMaterial({
      vertexShader: ARCH_VERTEX, fragmentShader: ARCH_FRAGMENT, uniforms: this.uniforms,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    })
    this.rebuild()
    this.camera.position.set(0, 0, 0); this.camera.lookAt(0, 0, -1)
  }
  rebuild() {
    const S = settingsFor(this.cfg)
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.dispose(); this.mesh = null }
    if (this.geometry) this.geometry.dispose()
    const geo = buildOutline(S.corner); this.geometry = geo
    const mesh = new THREE.InstancedMesh(geo, this.material, S.count)
    const identity = new THREE.Matrix4(); const slot = new Float32Array(S.count)
    for (let i = 0; i < S.count; i++) { mesh.setMatrixAt(i, identity); slot[i] = i }
    mesh.instanceMatrix.needsUpdate = true
    geo.setAttribute("aSlot", new THREE.InstancedBufferAttribute(slot, 1))
    mesh.frustumCulled = false; this.scene.add(mesh); this.mesh = mesh; this.uniforms.uSpacing.value = S.spacing
  }
  start() {
    this.lastT = performance.now()
    const loop = () => { this.frameId = requestAnimationFrame(loop); this.step() }
    this.frameId = requestAnimationFrame(loop)
  }
  setSize(width, height) {
    if (this.disposed) return
    this.width = Math.max(1, width); this.height = Math.max(1, height)
    this.renderer.setSize(this.width, this.height, false); this.updateCamera()
  }
  updateCamera() {
    const aspect = this.width / this.height; const S = settingsFor(this.cfg)
    const span = S.opening * 2.1 * S.zoom; const visibleHeight = aspect < 1 ? span / aspect : span
    this.camera.aspect = aspect; this.camera.fov = 2 * Math.atan(visibleHeight / 2 / 1.0) * (180 / Math.PI)
    this.camera.updateProjectionMatrix()
  }
  step() {
    if (this.disposed) return
    const now = performance.now(); let dt = (now - this.lastT) / 1000; this.lastT = now
    if (!isFinite(dt) || dt < 0) dt = 0; if (dt > 0.05) dt = 0.05
    const S = settingsFor(this.cfg)
    if (this.cfg.animate) this.time += dt * S.speed * S.heading
    this.uniforms.uTime.value = this.time; this.renderer.render(this.scene, this.camera)
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frameId)
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.dispose() }
    if (this.geometry) this.geometry.dispose()
    this.material.dispose(); this.renderer.dispose()
    const canvas = this.renderer.domElement
    if (canvas.parentNode === this.container) this.container.removeChild(canvas)
  }
}

export default function ArchCorridor({ background="#000000", near="#C084FC", far="#38BDF8", arches=14, twist=20, gauge=4, cornerRadius=34, opening=100, glow=20, animate=true, speed=6, direction="forward", sizePercent=100, style }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cfgRef = useRef({ background, near, far, arches, twist, gauge, cornerRadius, opening, glow, animate, speed, direction, sizePercent })

  useEffect(() => {
    cfgRef.current = { background, near, far, arches, twist, gauge, cornerRadius, opening, glow, animate, speed, direction, sizePercent }
  }, [background, near, far, arches, twist, gauge, cornerRadius, opening, glow, animate, speed, direction, sizePercent])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let scene
    try { scene = new ArchCorridorScene(container, cfgRef.current) } catch { return }
    sceneRef.current = scene
    scene.setSize(container.clientWidth, container.clientHeight)
    scene.start()
    const ro = new ResizeObserver(() => scene.setSize(container.clientWidth, container.clientHeight))
    ro.observe(container)
    return () => { ro.disconnect(); scene.dispose(); sceneRef.current = null }
  }, [])

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.cfg = cfgRef.current
  }, [background, near, far, arches, twist, gauge, cornerRadius, opening, glow, animate, speed, direction, sizePercent])

  return React.createElement("div", {
    ref: containerRef,
    style: { position: "relative", width: "100%", height: "100%", minWidth: 120, minHeight: 120, overflow: "hidden", backgroundColor: background, ...style }
  })
}
