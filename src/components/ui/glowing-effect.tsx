"use client";

import React from "react";

export interface GlowingEffectProps {
  blur?: number;
  spread?: number;
  variant?: "default" | "white";
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  borderWidth?: number;
  proximity?: number;
  inactiveZone?: number;
  speed?: number;
  autoAnimate?: boolean;
}

export const GlowingEffect: React.FC<GlowingEffectProps> = ({
  className = "",
  disabled = false,
  glow = true,
  borderWidth = 1.5,
}) => {
  if (disabled) return null;

  return (
    <div
      className={`pointer-events-none absolute -inset-[1px] rounded-2xl md:rounded-3xl overflow-hidden ${className}`}
      style={{ willChange: "transform" }}
    >
      {/* Hardware-accelerated 0% CPU spinning conic gradient border */}
      <div
        className="absolute -inset-[100%] animate-[spin_8s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, transparent 0deg, #9333EA 60deg, #C084FC 120deg, #38BDF8 180deg, transparent 240deg, transparent 360deg)",
        }}
      />

      {/* Inner Mask to carve out border stroke */}
      <div
        className="absolute inset-[1.5px] rounded-[calc(1rem-1.5px)] md:rounded-[calc(1.5rem-1.5px)] bg-[#080b12]"
        style={{ zIndex: 1 }}
      />

      {/* Subtle outer glow layer */}
      {glow && (
        <div
          className="absolute -inset-[2px] rounded-2xl md:rounded-3xl blur-[6px] opacity-40 animate-[spin_8s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, transparent 0deg, #9333EA 60deg, #C084FC 120deg, #38BDF8 180deg, transparent 240deg, transparent 360deg)",
            zIndex: 0,
          }}
        />
      )}
    </div>
  );
};

export default GlowingEffect;
