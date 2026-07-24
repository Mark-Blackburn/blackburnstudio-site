import type { Metadata } from "next";
import Link from "next/link";

import {
  DigitalServicesSubnav,
  RelatedDigitalServices,
  ServicePropositionCard,
} from "@/components/digital";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton, StudioTag } from "@/components/studio";

export const metadata: Metadata = {
  title: "Website Design and Development | Blackburn Studio",
  description:
    "Practical website design and development for businesses and organisations, including new builds, rebuilds, content structure and ongoing improvement.",
};

export default function DigitalWebsitesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-312 flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
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
            structure, photography, development,{" "}
            <Link
              href="/digital/hosting-domains"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              managed hosting
            </Link>{" "}
            and{" "}
            <Link
              href="/digital/support"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              ongoing support
            </Link>
            .
          </p>
        </section>

        <DigitalServicesSubnav
          currentPath="/digital/websites"
          className="mt-12 max-w-[74ch] md:mt-14"
        />

        <section
          className="mt-16 grid gap-5 md:mt-20 md:grid-cols-2 md:gap-6"
          aria-label="Website service panels"
        >
          <h2 className="sr-only">Website service panels</h2>
          <ServicePropositionCard
            title="Build something new"
            intro="A clear, maintainable website designed around what your business needs visitors to understand and do."
            capabilities={[
              "Business and organisation websites",
              "WordPress builds",
              "Online stores",
              "Landing pages and campaign sites",
              "Custom websites and web applications",
            ]}
            footerLabel="Typical outcome"
            footerText="A new website ready to launch, manage and support."
            className="h-full"
          />

          <ServicePropositionCard
            title="Improve what you already have"
            intro="Restructure, modernise or extend an existing website without rebuilding more than necessary."
            capabilities={[
              "Redesigns and rebuilds",
              "WordPress migrations",
              "Content and image updates",
              "Performance improvements",
              "Mobile and accessibility improvements",
              "Forms and integrations",
            ]}
            footerLabel="Typical outcome"
            footerText="A clearer, more reliable website with fewer technical and content problems."
            className="h-full"
          />
        </section>

        <section
          className="mt-16 max-w-[70ch] md:mt-20"
          aria-labelledby="approach-heading"
        >
          <h2
            id="approach-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Designed for use, not just appearance
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
          <div className="mt-7 flex flex-wrap gap-2.5">
            {[
              "Content structure",
              "Page planning",
              "Service photography",
              "Project photography",
              "Team portraits",
              "Image preparation",
              "Design coordination",
            ].map((tag) => (
              <StudioTag key={tag}>{tag}</StudioTag>
            ))}
          </div>
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
            <ServicePropositionCard
              title="Scoped website projects"
              intro="Defined delivery for new websites, rebuilds and platform-specific outcomes."
              footerLabel="Best for"
              footerText="Clear project work with a defined scope."
              className="h-full"
              compact
            />
            <ServicePropositionCard
              title="Ongoing improvements"
              intro="Regular updates and enhancement work as your organisation evolves."
              footerLabel="Best for"
              footerText="Small improvements spread over time."
              className="h-full"
              compact
            />
            <ServicePropositionCard
              title="Managed hosting and care after launch"
              intro="Hosting, domain and support services to keep the website operating reliably."
              footerLabel="Best for"
              footerText="Sites that need continuing technical care."
              className="h-full"
              compact
            />
          </div>
          <p className="mt-6 max-w-[72ch] text-sm leading-relaxed text-studio-dim md:text-base">
            After launch,{" "}
            <Link
              href="/digital/hosting-domains"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              managed hosting
            </Link>{" "}
            and{" "}
            <Link
              href="/digital/support"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              ongoing support
            </Link>{" "}
            can be arranged around the same website setup.
          </p>
        </section>

        <RelatedDigitalServices
          currentPath="/digital/websites"
          relatedHrefs={["/digital/hosting-domains", "/digital/support"]}
          className="mt-16 md:mt-20"
        />

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
