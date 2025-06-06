"use client";
import React from "react";
import { AnimatedButton } from "./animated-button";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
export default function HeroSection() {
  const router = useRouter();
  return (
    <div
      className="min-h-[80vh] md:min-h-screen animate-section rounded-lg md:rounded-3xl mb-4 mt-20 md:mb-10 flex flex-col items-center p-6 md:p-14 md:pt-32 pt-28 gap-3 md:gap-4 bg-cover bg-center w-[88vw] mx-auto relative overflow-clip" // Added overflow-clip to ensure content outside bounds is hidden
      style={{
        backgroundImage: "url(/hero-section.png)",
      }}
    >
      <section className="w-full max-w-[90vw] md:max-w-3xl">
        <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white tracking-tight text-center">
          Next{" "}
          <span className="font-serif italic text-primary">generation</span>{" "}
          messaging with you
        </h1>
      </section>
      <section className="flex flex-col md:flex-row gap-3 md:gap-4 w-full max-w-[90vw] md:w-fit">
        <AnimatedButton
          onClick={() => router.push("/dashboard")}
          className="text-neutral-100 font-bold font-mono"
        >
          Get Started
        </AnimatedButton>
        <Button
          variant={"secondary"}
          className="w-full md:w-auto px-12 py-6 border border-neutral-100"
        >
          Learn More
        </Button>
      </section>

      {/* <Image
        src={"/hero-image.png"}
        width={1000}
        height={600}
        className="rounded object-cover object-top absolute -bottom-[150px] overflow-clip w-[80%] hidden md:block "
        alt="hero-image"
      /> */}
    </div>
  );
}
