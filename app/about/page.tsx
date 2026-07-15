import type { Metadata } from "next";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata: Metadata = {
  title: "About — Blackburn Studio",
  description:
    "Blackburn Studio is a photography and digital practice led by Mark Blackburn, focused on clear, practical delivery for businesses and organisations.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[78rem] flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section className="max-w-[76ch]" aria-labelledby="about-heading">
          <SectionEyebrow className="text-sm tracking-[0.24em]">About</SectionEyebrow>
          <h1 id="about-heading" className="mt-4 text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl">
            Blackburn Studio
          </h1>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            <p>
              Blackburn Studio combines photography and practical digital delivery for organisations
              that need clearer websites, better workflows, and systems that are maintainable over
              time.
            </p>
            <p>
              Mark Blackburn combines senior engineering and technical leadership experience with
              direct implementation. Work is delivered personally rather than through a large agency
              structure.
            </p>
          </div>
        </section>

        <section className="mt-16 grid gap-8 md:mt-20 md:grid-cols-2" aria-labelledby="offer-heading">
          <div>
            <h2 id="offer-heading" className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
              What Blackburn Studio does
            </h2>
            <ul className="mt-6 space-y-3 text-base leading-relaxed text-studio-muted">
              <li>Photography and visual communication</li>
              <li>Websites and digital presentation</li>
              <li>Workflow and process improvement</li>
              <li>Platforms and operational systems</li>
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">How Mark works</h2>
            <ul className="mt-6 space-y-3 text-base leading-relaxed text-studio-muted">
              <li>Understand the need and context first</li>
              <li>Simplify where possible before adding technology</li>
              <li>Choose the right approach for the scope</li>
              <li>Deliver clear, maintainable work in practical stages</li>
            </ul>
          </div>
        </section>

        <section className="mt-16 max-w-[76ch] md:mt-20" aria-labelledby="background-heading">
          <h2 id="background-heading" className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Background and credibility
          </h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            <p>
              Mark brings senior engineering and technical leadership experience into practical,
              studio-led implementation across websites, workflows and platforms.
            </p>
            <p>
              He works with small businesses, trades, sporting organisations, and volunteer
              community organisations that need clearer delivery without unnecessary complexity.
            </p>
            <p>
              The studio also brings photography and visual communication capability where it helps
              make services, processes and decisions easier to understand.
            </p>
            <p>Based in Gisborne and working with businesses and organisations across Victoria and beyond.</p>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-studio-border bg-studio-surface px-7 py-10 md:mt-20 md:px-10 md:py-12" aria-labelledby="about-cta-heading">
          <h2 id="about-cta-heading" className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Start a conversation
          </h2>
          <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            If you want your website, process or platform to better support where your organisation
            needs to get to, let&apos;s discuss the right next step.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <StudioButton href="/contact" variant="primary">
              Start a conversation
            </StudioButton>
            <StudioButton href="/work" variant="secondary">
              Photography
            </StudioButton>
            <StudioButton href="/digital" variant="secondary">
              Digital
            </StudioButton>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
