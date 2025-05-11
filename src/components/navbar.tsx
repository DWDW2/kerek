"use client";
import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  const [isHidden, setIsHidden] = useState(false);
  return (
    <motion.div className="flex border flex-row w-[75vw] justify-between items-center bg-white fixed top-3 left-0 right-0 mx-auto px-10 py-2 rounded-3xl z-50">
      <h1 className="text-2xl font-bold text-gray-800 tracking-tighter">
        Kerek
      </h1>
      <div className="flex flex-row gap-2 font-medium font-mono items-center">
        {navItems.map((item) => (
          <Link href={item.href} key={item.label}>
            {item.label}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
