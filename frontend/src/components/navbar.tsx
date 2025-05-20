"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

const navItems = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const isScrollingDown = latest > lastScrollY;
    const isScrollingUp = latest < lastScrollY;
    if (isScrollingDown && isVisible && latest > 50) {
      setIsVisible(false);
    } else if (isScrollingUp && !isVisible) {
      setIsVisible(true);
    }

    setLastScrollY(latest);
  });

  const navVariants = {
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    hidden: {
      y: -100,
      opacity: 0,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  };

  return (
    <motion.div
      className="flex border flex-row w-[85vw] sm:w-[75vw] justify-between items-center bg-white fixed top-3 left-0 right-0 mx-auto px-10 py-2 rounded-3xl z-50 shadow-xl"
      initial="visible"
      animate={isVisible ? "visible" : "hidden"}
      variants={navVariants}
    >
      <h1 className="text-2xl font-bold text-gray-800 tracking-tighter">
        Kerek
      </h1>
      <div className="flex-row gap-6 font-medium font-mono items-center hidden sm:flex">
        {navItems.map((item) => (
          <Link
            href={item.href}
            key={item.label}
            className="hover:text-blue-600 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
