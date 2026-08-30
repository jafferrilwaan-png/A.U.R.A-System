"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { animate } from "framer-motion";

export interface GlowingEffectProps {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  variant?: "default" | "white";
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  movementDuration?: number;
  borderWidth?: number;
}

export const GlowingEffect: React.FC<GlowingEffectProps> = ({
  blur = 0,
  inactiveZone = 0.01,
  proximity = 64,
  spread = 40,
  variant = "default",
  glow = true,
  className = "",
  disabled = false,
  movementDuration = 2,
  borderWidth = 1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPosition = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>(0);

  const handleMove = useCallback(
    (e?: MouseEvent | { x: number; y: number }) => {
      if (!containerRef.current) return;

      if (e) {
        lastPosition.current = { x: e.x, y: e.y };
      }

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const mouseX = lastPosition.current.x - rect.left;
      const mouseY = lastPosition.current.y - rect.top;

      if (disabled) {
        container.style.setProperty("--active", "0");
        return;
      }

      const isInside =
        mouseX >= -proximity &&
        mouseX <= rect.width + proximity &&
        mouseY >= -proximity &&
        mouseY <= rect.height + proximity;

      const isInactive =
        mouseX >= rect.width * inactiveZone &&
        mouseX <= rect.width * (1 - inactiveZone) &&
        mouseY >= rect.height * inactiveZone &&
        mouseY <= rect.height * (1 - inactiveZone);

      if (isInside && (!isInactive || proximity > 0)) {
        container.style.setProperty("--active", "1");
        container.style.setProperty("--x", `${mouseX}px`);
        container.style.setProperty("--y", `${mouseY}px`);
      } else {
        container.style.setProperty("--active", "0");
      }
    },
    [disabled, inactiveZone, proximity]
  );

  useEffect(() => {
    if (disabled) return;

    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(() => handleMove(e));
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [handleMove, disabled]);

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
      className={`pointer-events-none absolute -inset-px rounded-2xl md:rounded-3xl transition-opacity duration-300 opacity-[var(--active,0)] ${className}`}
    >
      <div
        className="absolute inset-0 rounded-2xl md:rounded-3xl"
        style={{
          background:
            variant === "white"
              ? `radial-gradient(var(--spread) circle at var(--x, 0px) var(--y, 0px), rgba(255,255,255,0.8), transparent)`
              : `radial-gradient(var(--spread) circle at var(--x, 0px) var(--y, 0px), #C084FC, #9333EA, #3B82F6, transparent)`,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: `${borderWidth}px`,
        }}
      />
      {glow && (
        <div
          className="absolute inset-0 rounded-2xl md:rounded-3xl blur-md opacity-70"
          style={{
            background:
              variant === "white"
                ? `radial-gradient(var(--spread) circle at var(--x, 0px) var(--y, 0px), rgba(255,255,255,0.6), transparent)`
                : `radial-gradient(var(--spread) circle at var(--x, 0px) var(--y, 0px), #C084FC, #9333EA, transparent)`,
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
