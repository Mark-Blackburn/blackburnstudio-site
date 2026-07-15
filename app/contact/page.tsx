import type { Metadata } from "next";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata: Metadata = {
  title: "Contact — Blackburn Studio",
  description:
    "Photography, website and workflow enquiries are welcome.",
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
            Tell me what you are working on. Photography, website and workflow enquiries are
            welcome. Send through a few details and I&apos;ll come back to you.
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
