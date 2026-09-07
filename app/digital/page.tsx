import Image from "next/image";
import Link from "next/link";

import {
  DigitalInfoPanel,
  DigitalServiceCard,
  DigitalServicesSubnav,
} from "@/components/digital";
import {
  leadDigitalProject,
  secondaryDigitalProjects,
} from "@/components/digital-work/data";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";
import { createPageMetadata } from "@/lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Digital Services | Websites, Hosting and Microsoft 365",
  description:
    "Blackburn Studio delivers managed digital services across websites, hosting, domains, Microsoft 365 and ongoing support for businesses and organisations.",
  path: "/digital",
});

const serviceCards = [
  {
    title: "Websites",
    summary:
      "New websites, rebuilds, online stores and custom digital platforms.",
    href: "/digital/websites",
    tags: ["Website design", "WordPress", "Online stores", "Custom platforms"],
  },
  {
    title: "Domains and managed hosting",
    summary:
      "Managed domains, Australian hosting, DNS, SSL and website migrations.",
    href: "/digital/hosting-domains",
    tags: ["Domains", "Hosting", "DNS", "SSL"],
  },
  {
    title: "Microsoft 365 and business systems",
    summary:
      "Business email, Teams, SharePoint and practical workflow automation.",
    href: "/digital/microsoft-365",
    tags: ["Microsoft 365", "Teams", "SharePoint", "Automation"],
  },
  {
    title: "Ongoing digital support",
    summary: "Maintenance, troubleshooting and continued digital improvement.",
    href: "/digital/support",
    tags: ["Website care", "Technical support", "Security", "Improvements"],
  },
];

const processStages = [
  {
    title: "Understand",
    text: "Learn what the organisation needs, what is already in place and what is getting in the way.",
  },
  {
    title: "Recommend",
    text: "Agree on the most practical approach, priorities and level of support.",
  },
  {
    title: "Build and launch",
    text: "Create, configure or improve the website or system, then test it properly before release.",
  },
  {
    title: "Support and improve",
    text: "Provide agreed support, maintenance and practical improvements over time.",
  },
];

export default function DigitalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="editorial-light-theme w-full flex-1 bg-studio-base text-studio-muted">
        <div className="mx-auto w-full max-w-328 px-6 pt-14 pb-20 md:px-8 md:pt-20 md:pb-28">
          <section aria-labelledby="digital-hero-heading" className="max-w-[76ch]">
            <SectionEyebrow className="text-sm tracking-[0.24em] text-[#765d34]">
              Digital services
            </SectionEyebrow>
            <h1
              id="digital-hero-heading"
              className="mt-5 max-w-[22ch] text-4xl font-medium leading-[1.05] tracking-tight text-studio-text md:text-6xl"
            >
              Websites, hosting and digital systems - built properly and looked
              after.
            </h1>
            <p className="mt-7 max-w-[66ch] text-[1.02rem] leading-relaxed text-studio-muted md:text-[1.1rem]">
              Blackburn Studio helps businesses and organisations create better
              websites, manage the services behind them and improve the systems
              they rely on every day.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <StudioButton href="/contact" variant="primary" tone="light">
                Start a conversation
              </StudioButton>
              <StudioButton href="#services" variant="secondary" tone="light">
                Explore services
              </StudioButton>
            </div>
          </section>

          <DigitalServicesSubnav className="mt-12 max-w-[74ch] md:mt-14" />

          <section
            aria-labelledby="intro-heading"
            className="mt-20 max-w-[74ch] border-t border-studio-border pt-12 md:mt-24 md:pt-16"
          >
            <h2
              id="intro-heading"
              className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              A website rarely operates by itself
            </h2>
            <div className="mt-6 space-y-5 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              <p>
                A website depends on domains, hosting, email, security, software
                and ongoing support.
              </p>
              <p>
                Blackburn Studio brings those pieces together, giving you one
                point of contact who understands the complete setup and can help
                from initial planning through to ongoing management.
              </p>
            </div>
          </section>

          <section
            id="services"
            aria-labelledby="services-heading"
            className="mt-20 scroll-mt-28 md:mt-24 md:scroll-mt-32"
          >
            <SectionEyebrow className="text-[#765d34]">Core services</SectionEyebrow>
            <h2
              id="services-heading"
              className="mt-3 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Practical digital services with clear management
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6">
              {serviceCards.map((service) => (
                <DigitalServiceCard
                  key={service.href}
                  title={service.title}
                  summary={service.summary}
                  href={service.href}
                  tags={service.tags}
                />
              ))}
            </div>
          </section>
        </div>

        <section
          aria-labelledby="evidence-strip-heading"
          className="editorial-dark-section bg-studio-base text-studio-muted"
        >
          <div className="mx-auto w-full max-w-328 px-6 py-20 md:px-8 md:py-28">
            <SectionEyebrow className="text-[#b9955a]">Selected digital work</SectionEyebrow>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <h2
                id="evidence-strip-heading"
                className="max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
              >
                Built around real organisations and real work
              </h2>
              <Link
                href="/work#digital-work"
                className="inline-flex items-center gap-1.5 text-sm text-studio-muted transition-colors hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-studio-base"
              >
                View digital work
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5">
              <article className="relative overflow-hidden rounded-2xl border border-studio-border/70 bg-studio-surface/65 sm:col-span-2">
                <div
                  className="relative"
                  style={{
                    aspectRatio: `${leadDigitalProject.imageWidth} / ${leadDigitalProject.imageHeight}`,
                  }}
                >
                  <Image
                    src={leadDigitalProject.imageSrc}
                    alt={leadDigitalProject.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 72rem, 100vw"
                    className="object-cover"
                  />
                </div>
              </article>

              <article className="relative overflow-hidden rounded-2xl border border-studio-border/70 bg-studio-surface/65">
                <div
                  className="relative"
                  style={{
                    aspectRatio: `${secondaryDigitalProjects.platform.imageWidth} / ${secondaryDigitalProjects.platform.imageHeight}`,
                  }}
                >
                  <Image
                    src={secondaryDigitalProjects.platform.imageSrc}
                    alt={secondaryDigitalProjects.platform.imageAlt}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              </article>

              <article className="relative overflow-hidden rounded-2xl border border-studio-border/70 bg-studio-surface/65">
                <div
                  className="relative"
                  style={{
                    aspectRatio: `${secondaryDigitalProjects.coaching.imageWidth} / ${secondaryDigitalProjects.coaching.imageHeight}`,
                  }}
                >
                  <Image
                    src={secondaryDigitalProjects.coaching.imageSrc}
                    alt={secondaryDigitalProjects.coaching.imageAlt}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              </article>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-328 px-6 py-20 md:px-8 md:py-28">
          <section
            aria-labelledby="managed-heading"
            className="max-w-[74ch]"
          >
            <SectionEyebrow className="text-[#765d34]">Managed services</SectionEyebrow>
            <h2
              id="managed-heading"
              className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              One point of contact for your complete online presence
            </h2>
            <div className="mt-6 space-y-5 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              <p>
                Instead of coordinating separate developers, hosting companies,
                domain registrars and software providers, Blackburn Studio can
                manage the complete digital environment.
              </p>
              <p>
                Clients retain ownership of their domains, accounts and business
                information. Blackburn Studio handles the technical work, explains
                the options and helps keep everything operating reliably.
              </p>
            </div>
            <aside className="mt-10 max-w-[68ch] rounded-2xl border border-studio-border bg-studio-surface px-6 py-6 md:px-7 md:py-7">
              <h3 className="text-2xl font-medium tracking-tight text-studio-text">
                Building your own website?
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-studio-muted md:text-base">
                Blackburn Studio can still manage the domain, hosting, SSL, DNS
                and technical setup while you or your chosen designer or developer
                builds and maintains the website.
              </p>
              <Link
                href="/digital/hosting-domains"
                className="mt-5 inline-flex items-center gap-1.5 text-sm text-studio-muted underline decoration-[#b9955a]/55 underline-offset-4 transition-colors hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
              >
                Learn about managed hosting
                <span aria-hidden="true">→</span>
              </Link>
            </aside>
          </section>

          <section aria-labelledby="ways-heading" className="mt-24 md:mt-28">
            <SectionEyebrow className="text-[#765d34]">Ways to work together</SectionEyebrow>
            <h2
              id="ways-heading"
              className="mt-3 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Choose the engagement model that fits your needs
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3 md:gap-6">
              <DigitalInfoPanel title="Projects">
                <p>
                  Defined work such as a new website, rebuild, online store,
                  Microsoft 365 migration or workflow implementation.
                </p>
              </DigitalInfoPanel>
              <DigitalInfoPanel title="Managed services">
                <p>
                  Ongoing management of hosting, domains, SSL, website
                  maintenance, Microsoft 365 and technical support.
                </p>
              </DigitalInfoPanel>
              <DigitalInfoPanel title="Support and improvements">
                <p>
                  Practical help with troubleshooting, content changes, DNS,
                  email, website improvements and other digital issues.
                </p>
              </DigitalInfoPanel>
            </div>
            <div className="mt-8">
              <Link
                href="/work#digital-work"
                className="inline-flex items-center gap-1.5 text-sm text-studio-muted transition-colors hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
              >
                View all selected digital work
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>

          <section
            aria-labelledby="process-heading"
            className="mt-24 max-w-280 md:mt-28"
          >
            <SectionEyebrow className="text-[#765d34]">Process</SectionEyebrow>
            <h2
              id="process-heading"
              className="mt-3 max-w-[22ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              A practical path from planning to ongoing support
            </h2>
            <ol className="mt-10 grid gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
              {processStages.map((stage, index) => (
                <li key={stage.title} className="border-t border-studio-border pt-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#765d34]">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-3 text-xl font-medium tracking-tight text-studio-text">
                    {stage.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-studio-muted">
                    {stage.text}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section
            aria-labelledby="contact-heading"
            className="editorial-dark-section mt-24 max-w-264 rounded-3xl border border-studio-border bg-studio-base px-7 py-11 text-studio-muted md:mt-28 md:px-11 md:py-13"
          >
            <h2
              id="contact-heading"
              className="max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Not sure which service you need?
            </h2>
            <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              Tell me what you are trying to achieve or what is currently causing
              problems, and I&apos;ll help identify the most practical next step.
            </p>
            <div className="mt-8">
              <StudioButton href="/contact" variant="primary">
                Discuss your digital setup
              </StudioButton>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
