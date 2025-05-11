import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import Features from "@/components/features";
import Animation from "@/components/animation";
export default async function Home() {
  return (
    <>
      <Animation>
        <Navbar />
        <HeroSection />
        <Features />
      </Animation>
    </>
  );
}
