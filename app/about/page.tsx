import type { Metadata } from "next";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata: Metadata = {
  title: "About — Blackburn Studio",
  description:
    "Blackburn Studio is run by Mark Blackburn and combines photography with practical website and workflow delivery.",
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
              Blackburn Studio is run by Mark Blackburn. The work ranges from portraits and family
              photography through to websites, workflow improvements and small business systems. The
              common thread is simple: understand what is needed, keep things clear and make
              something useful.
            </p>
          </div>
        </section>

        <section className="mt-16 grid gap-10 md:mt-20 md:grid-cols-2" aria-labelledby="offer-heading">
          <div className="rounded-2xl border border-studio-border/60 bg-studio-surface/65 p-6 md:p-7">
            <h2 id="offer-heading" className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
              What I work on
            </h2>
            <ul className="mt-7 space-y-3.5">
              <li className="rounded-xl bg-studio-base/35 px-4 py-3.5">
                <p className="text-base font-medium text-studio-text">Photography</p>
                <p className="mt-1 text-sm leading-relaxed text-studio-dim">
                  Portraits, families, business photography and project images.
                </p>
              </li>
              <li className="rounded-xl bg-studio-base/35 px-4 py-3.5">
                <p className="text-base font-medium text-studio-text">Websites</p>
                <p className="mt-1 text-sm leading-relaxed text-studio-dim">
                  Clear sites that explain the work and make it easy to enquire.
                </p>
              </li>
              <li className="rounded-xl bg-studio-base/35 px-4 py-3.5">
                <p className="text-base font-medium text-studio-text">Workflow improvement</p>
                <p className="mt-1 text-sm leading-relaxed text-studio-dim">
                  Tidying up forms, information flow and repeated admin.
                </p>
              </li>
              <li className="rounded-xl bg-studio-base/35 px-4 py-3.5">
                <p className="text-base font-medium text-studio-text">Digital systems</p>
                <p className="mt-1 text-sm leading-relaxed text-studio-dim">
                  Practical tools for clubs, small businesses and community groups.
                </p>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-studio-border/60 bg-studio-surface/65 p-6 md:p-7">
            <h2 className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">How I work</h2>
            <ul className="mt-7 space-y-3.5">
              <li className="rounded-xl bg-studio-base/35 px-4 py-3.5">
                <p className="text-base font-medium text-studio-text">Start with the need</p>
                <p className="mt-1 text-sm leading-relaxed text-studio-dim">
                  Understand the problem before choosing the tool.
                </p>
              </li>
              <li className="rounded-xl bg-studio-base/35 px-4 py-3.5">
                <p className="text-base font-medium text-studio-text">Keep it simple</p>
                <p className="mt-1 text-sm leading-relaxed text-studio-dim">
                  Avoid adding technology where a simpler fix will do.
                </p>
              </li>
              <li className="rounded-xl bg-studio-base/35 px-4 py-3.5">
                <p className="text-base font-medium text-studio-text">Match the scope</p>
                <p className="mt-1 text-sm leading-relaxed text-studio-dim">
                  Choose the right level of design, build and support.
                </p>
              </li>
              <li className="rounded-xl bg-studio-base/35 px-4 py-3.5">
                <p className="text-base font-medium text-studio-text">Build in stages</p>
                <p className="mt-1 text-sm leading-relaxed text-studio-dim">
                  Deliver clear, maintainable work without overcomplicating it.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-16 max-w-[76ch] md:mt-20" aria-labelledby="background-heading">
          <h2 id="background-heading" className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Mark’s background
          </h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            <p>
              Mark brings senior engineering and technical leadership experience into practical,
              studio-led implementation across websites, workflows and platforms.
            </p>
            <p>
              He works with small businesses, trades, sporting organisations, and volunteer
              community organisations that need clearer delivery without extra complexity.
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
            Tell me what you are working on. If it sounds like a good fit, we can work out the
            right next step.
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
