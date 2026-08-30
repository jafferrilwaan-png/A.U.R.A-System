"use client";

import React from "react";
import { motion } from "framer-motion";

export const BackgroundGradient = ({
  children,
  className,
  containerClassName,
  animate = true,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}) => {
  const variants = {
    initial: {
      backgroundPosition: "0 50%",
    },
    animate: {
      backgroundPosition: ["0, 50%", "100% 50%", "0 50%"],
    },
  };

  return (
    <div className={`relative p-[4px] group ${containerClassName || ""}`}>
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        transition={
          animate
            ? {
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : undefined
        }
        style={{
          backgroundSize: animate ? "400% 400%" : undefined,
        }}
        className="absolute inset-0 rounded-3xl z-[1] opacity-60 group-hover:opacity-100 blur-xl transition duration-500 will-change-transform bg-[radial-gradient(circle_farthest-side_at_0_100%,#9333ea,transparent),radial-gradient(circle_farthest-side_at_100%_0,#c084fc,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#3b82f6,transparent),radial-gradient(circle_farthest-side_at_0_0,#a855f7,#14b8a6)]"
      />
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        transition={
          animate
            ? {
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : undefined
        }
        style={{
          backgroundSize: animate ? "400% 400%" : undefined,
        }}
        className="absolute inset-0 rounded-3xl z-[1] will-change-transform bg-[radial-gradient(circle_farthest-side_at_0_100%,#9333ea,transparent),radial-gradient(circle_farthest-side_at_100%_0,#c084fc,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#3b82f6,transparent),radial-gradient(circle_farthest-side_at_0_0,#a855f7,#14b8a6)]"
      />

      <div className={`relative z-10 ${className || ""}`}>{children}</div>
    </div>
  );
};

export default BackgroundGradient;
