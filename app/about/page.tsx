import Image from "next/image";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";
import { createPageMetadata } from "@/lib/siteConfig";

export const metadata = createPageMetadata({
  title: "About",
  description:
    "Blackburn Studio is run by Mark Blackburn and combines photography with websites, managed digital services, Microsoft 365 and practical business-system support.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="editorial-light-theme w-full flex-1 bg-studio-base text-studio-muted">
        <div className="mx-auto w-full max-w-260 px-6 pt-16 pb-18 md:px-8 md:pt-24 md:pb-24">
          <section aria-labelledby="about-heading" className="max-w-3xl">
            <SectionEyebrow className="text-sm tracking-[0.24em] text-[#765d34]">
              About
            </SectionEyebrow>
            <h1
              id="about-heading"
              className="mt-4 text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
            >
              Blackburn Studio
            </h1>
            <div className="mt-9 max-w-[66ch] space-y-5 text-base leading-relaxed text-studio-muted md:mt-10 md:text-[1.08rem] md:leading-[1.78]">
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
          </section>
        </div>

        <section
          aria-label="Mark Blackburn profile"
          className="editorial-dark-section bg-studio-base text-studio-muted"
        >
          <div className="mx-auto grid w-full max-w-260 gap-10 px-6 py-16 md:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] md:items-center md:gap-14 md:px-8 md:py-20">
            <figure className="overflow-hidden rounded-2xl border border-studio-border/70 bg-studio-surface/65">
              <div className="relative aspect-4/5 md:aspect-[5/4]">
                <Image
                  src="/images/about/mark-blackburn-about-portrait.jpg"
                  alt="Mark Blackburn in his workspace"
                  fill
                  sizes="(min-width: 1440px) 38rem, (min-width: 768px) 55vw, 100vw"
                  className="object-cover"
                  style={{ objectPosition: "50% 35%" }}
                />
              </div>
            </figure>

            <aside className="space-y-8 md:border-l md:border-studio-border md:pl-8">
              <div>
                <SectionEyebrow className="text-[#b9955a]">Based in Gisborne</SectionEyebrow>
                <p className="mt-4 text-base leading-relaxed text-studio-muted">
                  Working with businesses, trades, sporting organisations and
                  community groups across Victoria.
                </p>
              </div>
              <div className="border-t border-studio-border pt-8">
                <SectionEyebrow className="text-[#b9955a]">Experience</SectionEyebrow>
                <p className="mt-4 text-base leading-relaxed text-studio-muted">
                  Senior engineering leadership, website delivery, workflow
                  design and practical managed support.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <div className="mx-auto w-full max-w-260 px-6 py-20 md:px-8 md:py-28">
          <section aria-labelledby="offer-heading">
            <div className="grid gap-14 md:grid-cols-2 md:items-start md:gap-12 lg:gap-18">
              <div>
                <h2
                  id="offer-heading"
                  className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
                >
                  What I work on
                </h2>
                <ul className="mt-7 divide-y divide-studio-border">
                  <li className="pb-5">
                    <p className="text-base font-medium text-studio-text">Photography</p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Portraits, families, business photography and original
                      project imagery.
                    </p>
                  </li>
                  <li className="py-5">
                    <p className="text-base font-medium text-studio-text">Websites</p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      New websites, rebuilds, online stores and practical web
                      platforms.
                    </p>
                  </li>
                  <li className="py-5">
                    <p className="text-base font-medium text-studio-text">Managed digital services</p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Domains, hosting, DNS, SSL, Microsoft 365 and ongoing
                      administration.
                    </p>
                  </li>
                  <li className="pt-5">
                    <p className="text-base font-medium text-studio-text">Workflow and business systems</p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Forms, information management, SharePoint, automation and
                      custom digital tools.
                    </p>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
                  How I work
                </h2>
                <ul className="mt-7 divide-y divide-studio-border">
                  <li className="pb-5">
                    <p className="text-base font-medium text-studio-text">Start with the need</p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Understand the problem before choosing the tool.
                    </p>
                  </li>
                  <li className="py-5">
                    <p className="text-base font-medium text-studio-text">Keep it simple</p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Avoid adding technology where a simpler fix will do.
                    </p>
                  </li>
                  <li className="py-5">
                    <p className="text-base font-medium text-studio-text">Match the scope</p>
                    <p className="mt-1 text-sm leading-relaxed text-studio-dim md:text-base">
                      Choose the right level of design, build and support.
                    </p>
                  </li>
                  <li className="pt-5">
                    <p className="text-base font-medium text-studio-text">Build in stages</p>
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
            className="mt-20 max-w-[74ch] border-t border-studio-border pt-14 md:mt-24 md:pt-18"
            aria-labelledby="background-heading"
          >
            <h2
              id="background-heading"
              className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Mark’s background
            </h2>
            <div className="mt-6 space-y-5 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              <p>
                Mark brings senior engineering and technical leadership
                experience into hands-on website, managed-service, workflow
                and platform work.
              </p>
              <p>
                He works with small businesses, trades, sporting
                organisations, and volunteer community organisations that
                need clearer delivery across content, systems and ongoing
                support without extra complexity.
              </p>
              <p>
                The studio also brings clear images that help explain the
                work, services and decisions.
              </p>
            </div>
          </section>

          <section
            className="editorial-dark-section mt-20 rounded-3xl border border-studio-border bg-studio-base px-7 py-10 text-studio-muted md:mt-24 md:px-10 md:py-12"
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
