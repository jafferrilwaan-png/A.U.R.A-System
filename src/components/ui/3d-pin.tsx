"use client";

import React, { useState } from "react";
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
        animate={{
          rotateX: isHovered ? 10 : 0,
          rotateY: isHovered ? -8 : 0,
          scale: isHovered ? 1.02 : 1,
          y: isHovered ? -4 : 0,
        }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`relative w-full rounded-2xl bg-[#0a0d14]/90 backdrop-blur-xl border border-white/10 group-hover/pin:border-[#C084FC]/60 transition-colors shadow-2xl overflow-hidden p-3.5 sm:p-4 ${className}`}
      >
        {/* Glowing laser top accent when active */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C084FC] to-transparent transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Floating Pin Badge */}
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/90 border border-[#C084FC]/60 text-[#C084FC] text-[10px] font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(192,132,252,0.4)]"
            >
              <span>{title}</span>
              <i className="bi bi-arrow-up-right text-[9px]" />
            </a>
          </div>
        )}

        {children}
      </motion.div>
    </div>
  );
};

export default PinContainer;
