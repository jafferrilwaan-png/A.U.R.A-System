"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export const PinContainer = ({
  children,
  title,
  href,
  className = "",
  containerClassName = "",
}: {
  children: React.ReactNode;
  title?: string;
  href?: string;
  className?: string;
  containerClassName?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative group/pin w-full rounded-2xl ${containerClassName}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        animate={
          isHovered
            ? {
                rotateX: 8,
                rotateY: -6,
                scale: 1.03,
                y: -6,
              }
            : {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                y: 0,
              }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`relative w-full rounded-2xl bg-[#0a0d14]/90 backdrop-blur-xl border border-white/10 group-hover/pin:border-[#C084FC]/60 transition-colors shadow-2xl overflow-hidden p-3.5 sm:p-4 ${className}`}
      >
        {/* Glowing laser top accent when hovered */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C084FC] to-transparent transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Floating Pin Badge on interaction */}
        {title && (
          <div
            className={`absolute top-3 right-3 z-30 transition-all duration-300 ${
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
            }`}
          >
            <a
              href={href || "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 border border-[#C084FC]/60 text-white text-[10px] font-extrabold tracking-wider uppercase font-display shadow-[0_0_15px_rgba(192,132,252,0.4)] backdrop-blur-md hover:bg-[#C084FC]/20 transition-all"
            >
              <span>{title}</span>
              <span className="text-[#C084FC]">↗</span>
            </a>
          </div>
        )}

        <div className="relative z-10">{children}</div>
      </motion.div>
    </div>
  );
};

export default PinContainer;
