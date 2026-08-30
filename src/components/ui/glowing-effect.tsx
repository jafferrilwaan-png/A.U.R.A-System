"use client";

import React, { useEffect, useRef } from "react";

export interface GlowingEffectProps {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  variant?: "default" | "white";
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  autoAnimate?: boolean;
  speed?: number;
  borderWidth?: number;
}

const pointOnRoundRect = (t: number, w: number, h: number, r: number) => {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const sx = Math.max(0, w - 2 * rr);
  const sy = Math.max(0, h - 2 * rr);
  const arc = (Math.PI / 2) * rr;
  const total = 2 * sx + 2 * sy + 4 * arc;
  if (total <= 0) return { x: w / 2, y: h / 2 };

  let d = (((t % 1) + 1) % 1) * total;

  if (d < sx) return { x: rr + d, y: 0 };
  d -= sx;
  if (d < arc) {
    const a = d / rr;
    return { x: w - rr + rr * Math.sin(a), y: rr - rr * Math.cos(a) };
  }
  d -= arc;
  if (d < sy) return { x: w, y: rr + d };
  d -= sy;
  if (d < arc) {
    const a = d / rr;
    return { x: w - rr + rr * Math.cos(a), y: h - rr + rr * Math.sin(a) };
  }
  d -= arc;
  if (d < sx) return { x: w - rr - d, y: h };
  d -= sx;
  if (d < arc) {
    const a = d / rr;
    return { x: rr - rr * Math.sin(a), y: h - rr + rr * Math.cos(a) };
  }
  d -= arc;
  if (d < sy) return { x: 0, y: h - rr - d };
  d -= sy;
  const a = d / rr;
  return { x: rr - rr * Math.cos(a), y: rr - rr * Math.sin(a) };
};

export const GlowingEffect: React.FC<GlowingEffectProps> = ({
  blur = 0,
  proximity = 64,
  spread = 60,
  variant = "default",
  glow = true,
  className = "",
  disabled = false,
  autoAnimate = true,
  speed = 0.25,
  borderWidth = 1.5,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);
  const isMouseNearRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    let raf = 0;
    let alive = true;

    const onMouseMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const isInside =
        mouseX >= -proximity &&
        mouseX <= rect.width + proximity &&
        mouseY >= -proximity &&
        mouseY <= rect.height + proximity;

      isMouseNearRef.current = isInside;
      if (isInside) {
        mousePosRef.current = { x: mouseX, y: mouseY };
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          isVisibleRef.current = e.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const loop = () => {
      if (!alive) return;

      if (isVisibleRef.current && container) {
        const rect = container.getBoundingClientRect();
        const w = rect.width || 300;
        const h = rect.height || 200;

        let posX = 0;
        let posY = 0;

        if (isMouseNearRef.current) {
          posX = mousePosRef.current.x;
          posY = mousePosRef.current.y;
        } else if (autoAnimate) {
          const now = performance.now() / 1000;
          const t = (now * speed) % 1;
          const p = pointOnRoundRect(t, w, h, 24);
          posX = p.x;
          posY = p.y;
        }

        container.style.setProperty("--active", "1");
        container.style.setProperty("--x", `${posX}px`);
        container.style.setProperty("--y", `${posY}px`);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [disabled, autoAnimate, proximity, speed]);

  return (
    <div
      ref={containerRef}
      style={
        {
          "--blur": `${blur}px`,
          "--spread": `${spread}px`,
          "--border-width": `${borderWidth}px`,
        } as React.CSSProperties
      }
      className={`pointer-events-none absolute -inset-px rounded-2xl md:rounded-3xl transition-opacity duration-300 opacity-[var(--active,1)] ${className}`}
    >
      <div
        className="absolute inset-0 rounded-2xl md:rounded-3xl"
        style={{
          background:
            variant === "white"
              ? `radial-gradient(var(--spread) circle at var(--x, 0px) var(--y, 0px), rgba(255,255,255,0.9), transparent 70%)`
              : `radial-gradient(var(--spread) circle at var(--x, 0px) var(--y, 0px), #E9D5FF 0%, #C084FC 40%, #9333EA 70%, transparent 100%)`,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: `${borderWidth}px`,
        }}
      />
      {glow && (
        <div
          className="absolute inset-0 rounded-2xl md:rounded-3xl blur-[8px] opacity-80"
          style={{
            background:
              variant === "white"
                ? `radial-gradient(var(--spread) circle at var(--x, 0px) var(--y, 0px), rgba(255,255,255,0.7), transparent 70%)`
                : `radial-gradient(var(--spread) circle at var(--x, 0px) var(--y, 0px), #C084FC 0%, #9333EA 60%, transparent 100%)`,
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: `${borderWidth + 1}px`,
          }}
        />
      )}
    </div>
  );
};

export default GlowingEffect;
