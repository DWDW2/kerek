"use client";
import React from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
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
  const { signIn, signUp } = authClient;
  return (
    <div className="flex flex-row w-[75vw] justify-between items-center bg-white fixed top-3 left-0 right-0 mx-auto px-10 py-2 rounded-3xl z-50">
      <h1 className="text-2xl font-bold text-gray-800 tracking-tighter">
        Kerek
      </h1>
      <div className="flex flex-row gap-2 font-medium font-mono items-center">
        {navItems.map((item) => (
          <Link href={item.href} key={item.label}>
            {item.label}
          </Link>
        ))}
        <Button
          onClick={() =>
            signUp.email({
              email: "test@test.com",
              password: "2323adfasdfafwefawasca323r23r",
              name: "zhansar",
            })
          }
        >
          Sign Up
        </Button>
      </div>
    </div>
  );
}
