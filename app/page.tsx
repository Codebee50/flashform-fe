import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ClassroomScene } from "@/components/landing/classroom-scene";
// import { Reliability } from "@/components/landing/reliability";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        {/* <Reliability /> */}
        <ClassroomScene />
      </main>
      <SiteFooter />
    </>
  );
}
