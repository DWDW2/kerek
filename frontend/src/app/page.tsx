import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import Features from "@/components/features";

import RevealOnScroll from "@/components/animations/reveal-on-scroll";
export default async function Home() {
  return (
    <>
      <Navbar />
      <RevealOnScroll>
        <HeroSection />
      </RevealOnScroll>
      <RevealOnScroll>
        <Features />
      </RevealOnScroll>
    </>
  );
}
