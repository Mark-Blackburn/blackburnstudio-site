import type { Metadata } from "next";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata: Metadata = {
  title: "Contact — Blackburn Studio",
  description:
    "Start a conversation with Blackburn Studio about website, workflow, platform, or photography work.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[76rem] flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section className="max-w-3xl" aria-labelledby="contact-heading">
          <SectionEyebrow>Contact</SectionEyebrow>
          <h1 id="contact-heading" className="mt-4 text-4xl font-medium leading-[1.1] tracking-tight text-studio-text md:text-5xl">
            Start a conversation
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-studio-dim md:text-base">
            Tell us what is not working, what you are trying to improve, and what you need your
            website or systems to support.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <StudioButton href="mailto:hello@theblackburn.studio" variant="primary">
              hello@theblackburn.studio
            </StudioButton>
            <StudioButton href="/digital" variant="secondary">
              Back to Digital
            </StudioButton>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
