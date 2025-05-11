"use client";
import { motion, MotionProps } from "framer-motion";
import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
} & MotionProps &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export function AnimatedButton({ children, className, ...props }: Props) {
  return (
    <motion.button
      {...props}
      className={cn(
        "px-12 py-3 rounded-md relative bg-black border border-neutral-100 cursor-pointer",
        className
      )}
      whileHover={{
        "--x": "100%",
        scale: 0.97,
      }}
      initial={{
        "--x": "-100%",
        scale: 1,
      }}
      transition={{
        duration: 1,
        type: "spring",
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 1,
        damping: 15,
        mass: 2,
      }}
    >
      <span className="absolute block inset-0 bg-gradient-to-r from-primary to-sky-400 rounded-md" />
      <span className="tracking-wide h-full w-full block relative linear-mask">
        {children}
      </span>
    </motion.button>
  );
}
