import type { Metadata } from "next";
import Link from "next/link";

import {
  DigitalServicesSubnav,
  RelatedDigitalServices,
  ServicePropositionCard,
} from "@/components/digital";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata: Metadata = {
  title: "Managed Website Hosting and Domains | Blackburn Studio",
  description:
    "Managed domain and hosting services including DNS, SSL, migrations and ongoing technical coordination with one point of contact.",
};

export default function HostingDomainsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-312 flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section aria-labelledby="hosting-heading" className="max-w-[76ch]">
          <SectionEyebrow>Digital services</SectionEyebrow>
          <h1
            id="hosting-heading"
            className="mt-4 max-w-[24ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
          >
            Managed domains and hosting without the runaround
          </h1>
          <p className="mt-7 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Blackburn Studio can register, transfer, configure and manage the
            services behind a website, giving clients one point of contact for
            domains, hosting, DNS, SSL and migrations.
          </p>
        </section>

        <DigitalServicesSubnav
          currentPath="/digital/hosting-domains"
          className="mt-12 max-w-[74ch] md:mt-14"
        />

        <section className="mt-16 grid gap-5 md:mt-20 md:grid-cols-2 md:gap-6">
          <h2 className="sr-only">Core hosting and domain services</h2>
          <ServicePropositionCard
            title="Domain services"
            intro="Domain registration, transfers, renewals and DNS setup for websites and business email."
            capabilities={[
              "Domain registration",
              "Domain transfers",
              "Renewal management",
              "DNS configuration",
              "Registrant and ownership assistance",
              "Domain portfolio management",
            ]}
            footerLabel="Outcome"
            footerText="Domain administration is handled in one place."
            className="h-full"
          />

          <ServicePropositionCard
            title="Hosting services"
            intro="Managed hosting and technical coordination for websites that need a reliable home."
            capabilities={[
              "Australian-hosted web services",
              "Hosting setup and migration",
              "WordPress hosting",
              "SSL setup and renewal",
              "Domain email routing and DNS configuration",
              "Backup and recovery planning",
              "Hosting troubleshooting",
              "Performance and security reviews",
            ]}
            footerLabel="Outcome"
            footerText="Hosting, SSL and recovery planning stay aligned with the website."
            className="h-full"
          />
        </section>

        <section
          className="mt-12 max-w-[74ch] md:mt-14"
          aria-labelledby="business-email-heading"
        >
          <h2
            id="business-email-heading"
            className="text-2xl font-medium tracking-tight text-studio-text md:text-3xl"
          >
            Email connected to your domain
          </h2>
          <p className="mt-5 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Blackburn Studio can configure straightforward hosted email or{" "}
            <Link
              href="/digital/microsoft-365"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              Microsoft 365
            </Link>
            , depending on the number of users, collaboration needs, security
            requirements and preferred way of working.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 md:gap-6">
            <ServicePropositionCard
              title="Hosted domain email"
              intro="Straightforward mailboxes for individuals and small teams, with aliases, forwarding, DNS and mail-client setup."
              capabilities={[
                "Individual and small-team mailboxes",
                "Forwarding and aliases",
                "Webmail and standard mail-client setup",
                "Domain and email DNS configuration",
                "Basic migration and troubleshooting",
              ]}
              footerText={
                <Link
                  href="/contact"
                  className="inline-flex min-h-10 items-center text-sm text-studio-muted transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
                >
                  Discuss hosted email →
                </Link>
              }
              compact
              className="h-full"
            />

            <ServicePropositionCard
              title="Microsoft 365"
              intro="Business email with shared mailboxes, managed users, collaboration tools and stronger administration options."
              capabilities={[
                "Business email and shared mailboxes",
                "Users and licence administration",
                "Teams and SharePoint",
                "Security and access management",
                "Workflow and business-system integration",
              ]}
              footerText={
                <Link
                  href="/digital/microsoft-365"
                  className="inline-flex min-h-10 items-center text-sm text-studio-muted transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
                >
                  Explore Microsoft 365 →
                </Link>
              }
              compact
              className="h-full"
            />
          </div>
        </section>

        <section
          className="mt-16 rounded-2xl border border-studio-border bg-studio-surface px-6 py-6 md:mt-20 md:px-7 md:py-7"
          aria-labelledby="managed-any-heading"
        >
          <h2
            id="managed-any-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Managed hosting for new and existing websites
          </h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            <p className="font-medium text-studio-text">
              Already have a website - or planning to build your own?
            </p>
            <p>
              Blackburn Studio can provide and manage the domain, hosting, SSL,
              DNS and migration while you or your chosen developer looks after
              the website itself.
            </p>
            <p>
              Suitability depends on the website platform, technical
              requirements, expected traffic, security needs and third-party
              dependencies. Blackburn Studio will review the existing or
              proposed setup before recommending a hosting arrangement.
            </p>
          </div>
        </section>

        <section
          className="mt-16 md:mt-20"
          aria-labelledby="responsibilities-heading"
        >
          <h2
            id="responsibilities-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            A clear managed-service arrangement
          </h2>
          <p className="mt-5 max-w-[74ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Blackburn Studio manages the agreed domain, hosting and technical
            services, with{" "}
            <Link
              href="/digital/support"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              ongoing support
            </Link>{" "}
            where required, while keeping ownership, access and responsibilities
            clear.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 md:gap-6">
            <ServicePropositionCard
              title="Blackburn Studio manages"
              intro="Setup, migration and the technical pieces that sit between the website, DNS, SSL and hosting."
              capabilities={[
                "Setup and migration",
                "DNS and SSL",
                "Hosting administration",
                "Renewals and technical coordination",
                "Agreed ongoing support",
              ]}
              footerLabel="Outcome"
              footerText="Technical administration stays centralised."
              className="h-full"
              compact
            />

            <ServicePropositionCard
              title="You retain"
              intro="Ownership, access and business control remain with you, while the technical service is managed on your behalf."
              capabilities={[
                "Ownership of the domain and business accounts",
                "Access where appropriate",
                "Control of business information",
                "Responsibility for third-party website work outside the agreed service",
              ]}
              footerLabel="Outcome"
              footerText="The arrangement stays clear about ownership and responsibility."
              className="h-full"
              compact
            />
          </div>

          <p className="mt-6 max-w-[74ch] text-sm leading-relaxed text-studio-dim md:text-base">
            Hosting backups assist with recovery but do not replace an
            independent backup strategy appropriate to the website and business.
          </p>
        </section>

        <section
          className="mt-16 md:mt-20"
          aria-labelledby="managed-hosting-levels-heading"
        >
          <SectionEyebrow>MANAGED HOSTING</SectionEyebrow>
          <h2
            id="managed-hosting-levels-heading"
            className="mt-3 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Choose the level of support your website needs
          </h2>
          <p className="mt-5 max-w-[74ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Hosting plans are based on the website, expected usage and level of{" "}
            <Link
              href="/digital/support"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              ongoing management
            </Link>{" "}
            required. Blackburn Studio will recommend the most appropriate
            option after reviewing the setup.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
            <ServicePropositionCard
              title="Essential"
              intro="Core hosting and service administration for websites that need a reliable managed foundation."
              capabilities={[
                "Managed web hosting",
                "SSL",
                "Routine hosting backups",
                "Domain and DNS coordination",
                "Basic service monitoring",
                "Renewal administration",
              ]}
              className="h-full"
            />

            <ServicePropositionCard
              title="Managed Care"
              intro="Proactive maintenance and monitoring for websites that need regular technical care."
              capabilities={[
                "Platform and dependency maintenance where applicable",
                "Security and performance reviews",
                "Uptime monitoring",
                "Minor technical support",
                "Scheduled service checks",
              ]}
              className="h-full"
            />

            <ServicePropositionCard
              title="Supported"
              intro="Ongoing technical support for organisations wanting one point of contact across the wider digital setup."
              capabilities={[
                "Agreed support allocation",
                "Content or configuration changes",
                "Priority handling during agreed business hours",
                "Domain, hosting and email coordination",
                "Scheduled improvement planning",
              ]}
              className="h-full"
            />
          </div>

          <p className="mt-6 max-w-[74ch] text-sm leading-relaxed text-studio-dim md:text-base">
            Pricing is confirmed after reviewing the website, migration
            requirements and desired support level.
          </p>
          <div className="mt-8">
            <StudioButton href="/contact" variant="primary">
              Discuss managed hosting
            </StudioButton>
          </div>
        </section>

        <RelatedDigitalServices
          currentPath="/digital/hosting-domains"
          relatedHrefs={[
            "/digital/websites",
            "/digital/microsoft-365",
            "/digital/support",
          ]}
          className="mt-16 md:mt-20"
        />

        <section className="mt-20 rounded-3xl border border-studio-border bg-studio-surface px-7 py-11 md:mt-24 md:px-10 md:py-12">
          <h2 className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Need help with hosting or a domain?
          </h2>
          <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            If your domain, DNS, SSL or hosting setup is unclear, I can help you
            sort out what you have, what you need, and who should manage each
            part.
          </p>
          <div className="mt-8">
            <StudioButton href="/contact" variant="primary">
              Discuss hosting or a domain
            </StudioButton>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
