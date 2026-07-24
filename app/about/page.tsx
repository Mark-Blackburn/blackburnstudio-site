import type { Metadata } from "next";
import Image from "next/image";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata: Metadata = {
  title: "About — Blackburn Studio",
  description:
    "Blackburn Studio is run by Mark Blackburn and combines photography with websites, managed digital services, Microsoft 365 and practical business-system support.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-312 flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <div className="mx-auto w-full max-w-260">
          <section aria-labelledby="about-heading">
            <SectionEyebrow className="text-sm tracking-[0.24em]">
              About
            </SectionEyebrow>
            <h1
              id="about-heading"
              className="mt-4 text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
            >
              Blackburn Studio
            </h1>
            <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] md:items-start md:gap-12 lg:max-w-192 lg:grid-cols-[max-content_auto] lg:items-stretch lg:justify-start lg:gap-12">
              <div className="space-y-5 text-base leading-relaxed text-studio-muted md:max-w-[40ch] md:text-[1.08rem] lg:max-w-[33ch] lg:leading-[1.78]">
                <p>
                  Blackburn Studio is run by Mark Blackburn. The work ranges
                  from portraits and family photography through to websites,
                  online stores, managed domains and hosting, Microsoft 365,
                  workflows, business systems and ongoing digital support. The
                  common thread is simple: understand what is needed, keep
                  things clear and make something useful.
                </p>
                <p>
                  Some clients need a focused project. Others need steady
                  technical support across the systems they already rely on.
                  Blackburn Studio is set up to help with both.
                </p>
              </div>

              <figure className="w-full max-w-96 justify-self-start overflow-hidden rounded-2xl border border-studio-border/70 bg-studio-surface/65 md:justify-self-end lg:w-auto lg:max-w-none lg:self-stretch">
                <div className="relative aspect-4/5 lg:h-full">
                  <Image
                    src="/images/about/mark-blackburn-about-portrait.jpg"
                    alt="Mark Blackburn in his workspace"
                    fill
                    sizes="(min-width: 1440px) 20rem, (min-width: 1024px) 19rem, (min-width: 768px) 18rem, 100vw"
                    className="object-cover"
                    style={{ objectPosition: "50% 35%" }}
                  />
                </div>
              </figure>
            </div>
          </section>

          <section className="mt-14 md:mt-18" aria-labelledby="offer-heading">
            <div className="grid gap-10 md:grid-cols-2 md:items-start md:gap-12 lg:gap-14">
              <div>
                <h2
                  id="offer-heading"
                  className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
                >
                  What I work on
                </h2>
                <ul className="mt-7 space-y-5">
                  <li>
                    <p className="text-base font-medium text-studio-text">
                      Photography
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Portraits, families, business photography and original
                      project imagery.
                    </p>
                  </li>
                  <li>
                    <p className="text-base font-medium text-studio-text">
                      Websites
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      New websites, rebuilds, online stores and practical web
                      platforms.
                    </p>
                  </li>
                  <li>
                    <p className="text-base font-medium text-studio-text">
                      Managed digital services
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Domains, hosting, DNS, SSL, Microsoft 365 and ongoing
                      administration.
                    </p>
                  </li>
                  <li>
                    <p className="text-base font-medium text-studio-text">
                      Workflow and business systems
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Forms, information management, SharePoint, automation and
                      custom digital tools.
                    </p>
                  </li>
                </ul>
              </div>

              <div className="md:pl-0">
                <h2 className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
                  How I work
                </h2>
                <ul className="mt-7 space-y-5">
                  <li>
                    <p className="text-base font-medium text-studio-text">
                      Start with the need
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Understand the problem before choosing the tool.
                    </p>
                  </li>
                  <li>
                    <p className="text-base font-medium text-studio-text">
                      Keep it simple
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Avoid adding technology where a simpler fix will do.
                    </p>
                  </li>
                  <li>
                    <p className="text-base font-medium text-studio-text">
                      Match the scope
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Choose the right level of design, build and support.
                    </p>
                  </li>
                  <li>
                    <p className="text-base font-medium text-studio-text">
                      Build in stages
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Deliver clear, maintainable work without overcomplicating
                      it.
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section
            className="mt-14 md:mt-18"
            aria-labelledby="background-heading"
          >
            <h2
              id="background-heading"
              className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Mark’s background
            </h2>
            <div className="mt-6 space-y-5 text-base leading-relaxed text-studio-muted md:max-w-[44ch] md:text-[1.08rem] lg:max-w-[46ch]">
              <p>
                Mark brings senior engineering and technical leadership
                experience into hands-on website, managed-service, workflow and
                platform work.
              </p>
              <p>
                He works with small businesses, trades, sporting organisations,
                and volunteer community organisations that need clearer delivery
                across content, systems and ongoing support without extra
                complexity.
              </p>
              <p>
                The studio also brings clear images that help explain the work,
                services and decisions.
              </p>
              <p>Based in Gisborne, working with clients across Victoria.</p>
            </div>
          </section>

          <section
            className="mt-14 rounded-3xl border border-studio-border bg-studio-surface px-7 py-10 md:mt-18 md:px-10 md:py-12"
            aria-labelledby="about-cta-heading"
          >
            <h2
              id="about-cta-heading"
              className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Start a conversation
            </h2>
            <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              Tell me what you are working on. If it sounds like a good fit, we
              can work out the right next step.
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
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
