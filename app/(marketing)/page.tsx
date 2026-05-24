import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { Mission } from "@/components/marketing/mission";
import { CTABand } from "@/components/marketing/cta-band";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Mission />
      <CTABand />
    </>
  );
}
