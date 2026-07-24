import type { Metadata } from "next";

import { DigitalInfoPanel } from "@/components/digital";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata: Metadata = {
  title: "Website Design and Development | Blackburn Studio",
  description:
    "Practical website design and development for businesses and organisations, including new builds, rebuilds, content structure and ongoing improvement.",
};

export default function DigitalWebsitesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[78rem] flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section aria-labelledby="websites-heading" className="max-w-[76ch]">
          <SectionEyebrow>Digital services</SectionEyebrow>
          <h1
            id="websites-heading"
            className="mt-4 max-w-[24ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
          >
            Websites designed around how your business actually works
          </h1>
          <p className="mt-7 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Blackburn Studio creates practical, well-structured websites for
            businesses and organisations. The work can include strategy, content
            structure, photography, development, hosting and ongoing support.
          </p>
        </section>

        <section
          className="mt-16 grid gap-5 md:mt-20 md:grid-cols-2 md:gap-6"
          aria-label="Website service panels"
        >
          <DigitalInfoPanel title="Build something new" className="h-full">
            <p>
              A clear, maintainable website designed around what your business
              needs visitors to understand and do.
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-studio-dim">
              <li>Business and organisation websites</li>
              <li>WordPress builds</li>
              <li>Online stores</li>
              <li>Landing pages and campaign sites</li>
              <li>Custom websites and web applications</li>
            </ul>
            <p className="border-t border-studio-border/60 pt-3 text-studio-dim">
              Typical outcome: A new website ready to launch, manage and
              support.
            </p>
          </DigitalInfoPanel>

          <DigitalInfoPanel
            title="Improve what you already have"
            className="h-full"
          >
            <p>
              Restructure, modernise or extend an existing website without
              rebuilding more than necessary.
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-studio-dim">
              <li>Redesigns and rebuilds</li>
              <li>WordPress migrations</li>
              <li>Content and image updates</li>
              <li>Performance improvements</li>
              <li>Mobile and accessibility improvements</li>
              <li>Forms and integrations</li>
            </ul>
            <p className="border-t border-studio-border/60 pt-3 text-studio-dim">
              Typical outcome: A clearer, more reliable website with fewer
              technical and content problems.
            </p>
          </DigitalInfoPanel>
        </section>

        <section
          className="mt-16 max-w-[70ch] md:mt-20"
          aria-labelledby="approach-heading"
        >
          <h2
            id="approach-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Approach
          </h2>
          <p className="mt-6 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            The focus is not only on appearance, but also structure, usability,
            maintainability and how the website supports the organisation.
          </p>
        </section>

        <section
          className="mt-16 md:mt-20"
          aria-labelledby="content-photo-heading"
        >
          <h2
            id="content-photo-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Content and photography
          </h2>
          <div className="mt-6 max-w-[72ch] space-y-5 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            <p>
              A website works better when its structure, words and images
              support the same message. Blackburn Studio can help shape the
              content and create original photography as part of the project.
            </p>
          </div>
          <ul className="mt-7 grid gap-3 text-base leading-relaxed text-studio-muted sm:grid-cols-2 md:text-[1.02rem]">
            <li>Content structure and page planning</li>
            <li>Service and project photography</li>
            <li>Team and business portraits</li>
            <li>Image preparation and optimisation</li>
            <li>Coordination of copy, design and development</li>
          </ul>
        </section>

        <section
          className="mt-16 md:mt-20"
          aria-labelledby="engagement-heading"
        >
          <h2
            id="engagement-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Engagement models
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
            <DigitalInfoPanel title="Scoped website projects">
              <p>
                Defined delivery for new websites, rebuilds and
                platform-specific outcomes.
              </p>
            </DigitalInfoPanel>
            <DigitalInfoPanel title="Ongoing improvements">
              <p>
                Regular updates and enhancement work as your organisation
                evolves.
              </p>
            </DigitalInfoPanel>
            <DigitalInfoPanel title="Managed hosting and care after launch">
              <p>
                Hosting, domain and support services to keep the website
                operating reliably.
              </p>
            </DigitalInfoPanel>
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-studio-border bg-studio-surface px-7 py-11 md:mt-24 md:px-10 md:py-12">
          <h2 className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Need a better website setup?
          </h2>
          <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Tell me what you need your website to do, what is currently getting
            in the way, and what timeline you are working to.
          </p>
          <div className="mt-8">
            <StudioButton href="/contact" variant="primary">
              Discuss your website
            </StudioButton>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
