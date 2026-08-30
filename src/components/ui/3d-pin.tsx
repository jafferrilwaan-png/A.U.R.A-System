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
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isActive = isHovered || isInView;

  return (
    <div
      ref={cardRef}
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
            : isInView
            ? {
                rotateX: [0, 5, 0, -4, 0],
                rotateY: [0, -4, 0, 4, 0],
                scale: 1.01,
                y: -3,
              }
            : {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                y: 0,
              }
        }
        transition={
          isHovered
            ? { duration: 0.3, ease: "easeOut" }
            : isInView
            ? {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : { duration: 0.4 }
        }
        className={`relative w-full rounded-2xl bg-[#0a0d14]/90 backdrop-blur-xl border border-white/10 group-hover/pin:border-[#C084FC]/60 transition-colors shadow-2xl overflow-hidden p-3.5 sm:p-4 ${className}`}
      >
        {/* Glowing laser top accent when in view / active */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C084FC] to-transparent transition-opacity duration-500 ${
            isActive ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Floating Pin Badge */}
        {title && (
          <div
            className={`absolute top-3 right-3 z-30 transition-all duration-500 ${
              isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
            }`}
          >
            <a
              href={href || "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/90 border border-[#C084FC]/60 text-[#C084FC] text-[10px] font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(192,132,252,0.4)] hover:scale-105 transition-transform"
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
