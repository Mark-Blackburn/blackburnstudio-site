import type { Metadata } from "next";

import { DigitalInfoPanel } from "@/components/digital";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata: Metadata = {
  title: "Website and Digital Support | Blackburn Studio",
  description:
    "Ongoing website and digital support across maintenance, hosting, domains and Microsoft 365 for businesses and organisations.",
};

export default function DigitalSupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[78rem] flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section aria-labelledby="support-heading" className="max-w-[76ch]">
          <SectionEyebrow>Digital services</SectionEyebrow>
          <h1
            id="support-heading"
            className="mt-4 max-w-[22ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
          >
            Ongoing support for the digital services your business relies on
          </h1>
          <p className="mt-7 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Blackburn Studio provides ongoing technical support, maintenance and improvement work
            across websites, hosting, domains and Microsoft 365.
          </p>
        </section>

        <section className="mt-16 grid gap-5 md:mt-20 md:grid-cols-3 md:gap-6">
          <DigitalInfoPanel title="Website care" className="h-full">
            <ul className="space-y-2">
              <li>WordPress and plugin updates</li>
              <li>Security checks</li>
              <li>Backups</li>
              <li>Uptime monitoring</li>
              <li>Minor content updates</li>
              <li>Technical troubleshooting</li>
            </ul>
          </DigitalInfoPanel>

          <DigitalInfoPanel title="Managed digital services" className="h-full">
            <ul className="space-y-2">
              <li>Domain and hosting management</li>
              <li>SSL renewals</li>
              <li>Microsoft 365 administration</li>
              <li>User onboarding and offboarding</li>
              <li>Website improvements</li>
              <li>Supplier and integration coordination</li>
              <li>Priority support where included in an agreed plan</li>
            </ul>
          </DigitalInfoPanel>

          <DigitalInfoPanel title="Ad hoc support" className="h-full">
            <ul className="space-y-2">
              <li>DNS issues</li>
              <li>Email setup</li>
              <li>Website problems</li>
              <li>Content updates</li>
              <li>Performance issues</li>
              <li>Technical advice</li>
              <li>Support blocks or separately scoped work</li>
            </ul>
          </DigitalInfoPanel>
        </section>

        <section className="mt-16 max-w-[72ch] md:mt-20" aria-labelledby="support-note-heading">
          <h2 id="support-note-heading" className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Support scope
          </h2>
          <p className="mt-6 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Urgent or after-hours support is not automatically included and is handled only when
            specifically agreed.
          </p>
        </section>

        <section className="mt-16 md:mt-20" aria-labelledby="arrangements-heading">
          <h2 id="arrangements-heading" className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Ways support can be arranged
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
            <DigitalInfoPanel title="Ongoing plan">
              <p>Regularly scheduled management and support for an agreed environment.</p>
            </DigitalInfoPanel>
            <DigitalInfoPanel title="Support block">
              <p>A prepaid allocation for smaller changes, troubleshooting and advice.</p>
            </DigitalInfoPanel>
            <DigitalInfoPanel title="Scoped work">
              <p>A separate quote for significant improvements, migrations or redevelopment.</p>
            </DigitalInfoPanel>
          </div>
        </section>

        <section className="mt-16 max-w-[74ch] md:mt-20" aria-labelledby="suitable-env-heading">
          <h2 id="suitable-env-heading" className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Suitable existing environments
          </h2>
          <p className="mt-6 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Ongoing support can be provided for Blackburn Studio projects and suitable existing
            websites, hosting accounts, domains and Microsoft 365 environments.
          </p>
          <p className="mt-4 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Where systems are unfamiliar or managed by third parties, Blackburn Studio will review
            the current setup before agreeing to ongoing responsibility.
          </p>
        </section>

        <section className="mt-16 max-w-[74ch] md:mt-20" aria-labelledby="not-included-heading">
          <h2 id="not-included-heading" className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            What is not automatically included
          </h2>
          <ul className="mt-7 space-y-3 text-base leading-relaxed text-studio-muted md:text-[1.02rem]">
            <li>Emergency or after-hours response</li>
            <li>Major redesign or redevelopment</li>
            <li>Unsupported or abandoned software</li>
            <li>Third-party custom code repair</li>
            <li>Incident recovery outside the agreed service</li>
            <li>Work requiring specialist providers</li>
          </ul>
        </section>

        <section className="mt-16 max-w-[74ch] md:mt-20" aria-labelledby="managed-statement-heading">
          <h2 id="managed-statement-heading" className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            One managed-service relationship
          </h2>
          <p className="mt-6 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Blackburn Studio can coordinate website, hosting, domain and Microsoft 365 support
            through one ongoing relationship, with responsibilities and response expectations
            agreed in advance.
          </p>
        </section>

        <section className="mt-20 rounded-3xl border border-studio-border bg-studio-surface px-7 py-11 md:mt-24 md:px-10 md:py-12">
          <h2 className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">Need ongoing digital support?</h2>
          <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            If you need regular support or occasional technical help, we can define the right level
            of ongoing service for your setup.
          </p>
          <div className="mt-8">
            <StudioButton href="/contact" variant="primary">
              Discuss ongoing support
            </StudioButton>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
