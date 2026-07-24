import type { Metadata } from "next";

import { DigitalInfoPanel } from "@/components/digital";
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

      <main className="mx-auto w-full max-w-[78rem] flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
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

        <section className="mt-16 grid gap-5 md:mt-20 md:grid-cols-2 md:gap-6">
          <DigitalInfoPanel title="Domain services" className="h-full">
            <ul className="space-y-2">
              <li>Domain registration</li>
              <li>Domain transfers</li>
              <li>Renewal management</li>
              <li>DNS configuration</li>
              <li>Registrant and ownership assistance</li>
              <li>Domain portfolio management</li>
            </ul>
          </DigitalInfoPanel>

          <DigitalInfoPanel title="Hosting services" className="h-full">
            <ul className="space-y-2">
              <li>Australian-hosted web services</li>
              <li>Hosting setup and migration</li>
              <li>WordPress hosting</li>
              <li>SSL setup and renewal</li>
              <li>Domain email routing and DNS configuration</li>
              <li>Backup and recovery planning</li>
              <li>Hosting troubleshooting</li>
              <li>Performance and security reviews</li>
            </ul>
          </DigitalInfoPanel>
        </section>

        <section
          className="mt-12 max-w-[74ch] md:mt-14"
          aria-labelledby="business-email-heading"
        >
          <h2
            id="business-email-heading"
            className="text-2xl font-medium tracking-tight text-studio-text md:text-3xl"
          >
            Business email options
          </h2>
          <p className="mt-5 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Blackburn Studio can provide straightforward domain email or
            configure Microsoft 365, depending on the number of users,
            collaboration needs, security requirements and preferred way of
            working.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 md:gap-6">
            <DigitalInfoPanel title="Basic domain email" className="h-full">
              <ul className="list-disc space-y-2 pl-5 marker:text-studio-dim">
                <li>Individual and small-team mailboxes</li>
                <li>Forwarding and aliases</li>
                <li>Webmail and standard mail-client setup</li>
                <li>Domain and email DNS configuration</li>
                <li>Basic migration and troubleshooting</li>
              </ul>
            </DigitalInfoPanel>

            <DigitalInfoPanel title="Microsoft 365" className="h-full">
              <ul className="list-disc space-y-2 pl-5 marker:text-studio-dim">
                <li>Business email and shared mailboxes</li>
                <li>Users and licence administration</li>
                <li>Teams and SharePoint</li>
                <li>Security and access management</li>
                <li>Workflow and business-system integration</li>
              </ul>
            </DigitalInfoPanel>
          </div>

          <a
            href="/digital/microsoft-365"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-studio-muted transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
          >
            Explore Microsoft 365
            <span aria-hidden="true">→</span>
          </a>
        </section>

        <section
          className="mt-16 rounded-2xl border border-studio-border bg-studio-surface px-6 py-6 md:mt-20 md:px-7 md:py-7"
          aria-labelledby="managed-any-heading"
        >
          <h2
            id="managed-any-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Managed hosting for any suitable website
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
            services while keeping ownership, access and responsibilities clear.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 md:gap-6">
            <DigitalInfoPanel
              title="Blackburn Studio manages"
              className="h-full"
            >
              <ul className="list-disc space-y-2 pl-5 marker:text-studio-dim">
                <li>Setup and migration</li>
                <li>DNS and SSL</li>
                <li>Hosting administration</li>
                <li>Renewals and technical coordination</li>
                <li>Agreed ongoing support</li>
              </ul>
            </DigitalInfoPanel>

            <DigitalInfoPanel title="You retain" className="h-full">
              <ul className="list-disc space-y-2 pl-5 marker:text-studio-dim">
                <li>Ownership of the domain and business accounts</li>
                <li>Access where appropriate</li>
                <li>Control of business information</li>
                <li>
                  Responsibility for third-party website work outside the agreed
                  service
                </li>
              </ul>
            </DigitalInfoPanel>
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
            Hosting plans are based on the website, expected usage and level of
            ongoing management required. Blackburn Studio will recommend the
            most appropriate option after reviewing the setup.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
            <DigitalInfoPanel title="Essential" className="h-full">
              <p className="text-studio-dim">
                For simple brochure and small-business websites.
              </p>
              <p className="font-medium text-studio-text">Includes:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-studio-dim">
                <li>Managed web hosting</li>
                <li>SSL</li>
                <li>Routine hosting backups</li>
                <li>Domain and DNS coordination</li>
                <li>Basic service monitoring</li>
                <li>Renewal administration</li>
              </ul>
            </DigitalInfoPanel>

            <DigitalInfoPanel title="Business" className="h-full">
              <p className="text-studio-dim">
                For active WordPress and business websites.
              </p>
              <p className="font-medium text-studio-text">
                Includes everything in Essential, plus:
              </p>
              <ul className="list-disc space-y-2 pl-5 marker:text-studio-dim">
                <li>WordPress and plugin maintenance</li>
                <li>Security and performance reviews</li>
                <li>Uptime monitoring</li>
                <li>Minor technical support</li>
                <li>Scheduled service checks</li>
              </ul>
            </DigitalInfoPanel>

            <DigitalInfoPanel title="Supported" className="h-full">
              <p className="text-studio-dim">
                For organisations wanting one ongoing technical contact.
              </p>
              <p className="font-medium text-studio-text">
                Includes everything in Business, plus:
              </p>
              <ul className="list-disc space-y-2 pl-5 marker:text-studio-dim">
                <li>Agreed support allocation</li>
                <li>Content or configuration changes</li>
                <li>Priority handling during agreed business hours</li>
                <li>Domain, hosting and email coordination</li>
                <li>Scheduled improvement planning</li>
              </ul>
            </DigitalInfoPanel>
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
