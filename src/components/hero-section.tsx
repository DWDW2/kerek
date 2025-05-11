"use client";
import React from "react";
import { AnimatedButton } from "./animated-button";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
export default function HeroSection() {
  const router = useRouter();
  return (
    <div
      className="min-h-[80vh] md:min-h-screen animate-section rounded-lg md:rounded-3xl mb-4 mt-10 md:mb-10 md:mt-16 flex flex-col items-center p-6 md:p-14 md:pt-32 pt-28 gap-3 md:gap-4 bg-cover bg-center"
      style={{
        backgroundImage: "url(/hero-section.png)",
      }}
    >
      <section className="w-full max-w-[90vw] md:max-w-3xl">
        <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white tracking-tight text-center">
          Get ideas, content, and{" "}
          <span className="font-serif italic text-primary">inspiration</span>{" "}
          that you really need
        </h1>
      </section>
      <section className="flex flex-col md:flex-row gap-3 md:gap-4 w-full max-w-[90vw] md:w-fit">
        <AnimatedButton
          onClick={() => router.push("/dashboard")}
          className="text-neutral-100 font-bold font-mono"
        >
          Get Started
        </AnimatedButton>
        <Button variant={"secondary"} className="w-full md:w-auto py-5">
          Learn More
        </Button>
      </section>
    </div>
  );
}
