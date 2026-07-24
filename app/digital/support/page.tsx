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
  title: "Website and Digital Support | Blackburn Studio",
  description:
    "Ongoing website and digital support across maintenance, hosting, domains and Microsoft 365 for businesses and organisations.",
};

export default function DigitalSupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-312 flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section aria-labelledby="support-heading" className="max-w-[76ch]">
          <SectionEyebrow>Digital services</SectionEyebrow>
          <h1
            id="support-heading"
            className="mt-4 max-w-[22ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
          >
            Ongoing support for the digital services your business relies on
          </h1>
          <p className="mt-7 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Blackburn Studio provides ongoing technical support, maintenance and
            improvement work across{" "}
            <Link
              href="/digital/websites"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              websites
            </Link>
            ,{" "}
            <Link
              href="/digital/hosting-domains"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              domains and hosting
            </Link>
            , and{" "}
            <Link
              href="/digital/microsoft-365"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              Microsoft 365
            </Link>
            .
          </p>
        </section>

        <DigitalServicesSubnav
          currentPath="/digital/support"
          className="mt-12 max-w-[74ch] md:mt-14"
        />

        <section className="mt-16 grid gap-5 md:mt-20 md:grid-cols-3 md:gap-6">
          <h2 className="sr-only">Digital support service areas</h2>
          <ServicePropositionCard
            title="Keep the website reliable"
            intro="Regular maintenance, monitoring and troubleshooting to keep an agreed website operating securely and reliably."
            capabilities={[
              "Platform and dependency updates where applicable",
              "Security checks",
              "Backups",
              "Uptime monitoring",
              "Minor content updates",
              "Technical troubleshooting",
            ]}
            footerLabel="Outcome"
            footerText="A more reliable website with routine technical work handled."
            className="h-full"
          />

          <ServicePropositionCard
            title="Manage the wider digital setup"
            intro="Ongoing coordination across domains, hosting, email, Microsoft 365 and the services connected to them."
            capabilities={[
              "Domain and hosting management",
              "SSL renewals",
              "Microsoft 365 administration",
              "User onboarding and offboarding",
              "Website improvements",
              "Supplier and integration coordination",
            ]}
            footerLabel="Outcome"
            footerText="One point of contact across the agreed digital environment."
            className="h-full"
          />

          <ServicePropositionCard
            title="Get help when something changes"
            intro="Practical assistance with problems, changes or small pieces of technical work that do not require an ongoing plan."
            capabilities={[
              "DNS issues",
              "Email setup",
              "Website problems",
              "Content changes",
              "Performance issues",
              "Technical advice",
            ]}
            footerLabel="Outcome"
            footerText="Focused help without committing to a full managed-service plan."
            className="h-full"
          />
        </section>

        <section
          className="mt-16 md:mt-20"
          aria-labelledby="arrangements-heading"
        >
          <h2
            id="arrangements-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Ways support can be arranged
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
            <ServicePropositionCard
              title="Ongoing plan"
              intro="Regularly scheduled management and support for an agreed environment."
              footerLabel="Best for"
              footerText="Environments requiring regular administration and proactive care."
              className="h-full"
              compact
            />
            <ServicePropositionCard
              title="Support block"
              intro="A prepaid allocation for smaller changes, troubleshooting and advice."
              footerLabel="Best for"
              footerText="Smaller changes, troubleshooting and advice used as needed."
              className="h-full"
              compact
            />
            <ServicePropositionCard
              title="Scoped work"
              intro="A separate quote for significant improvements, migrations or redevelopment."
              footerLabel="Best for"
              footerText="Defined improvements, migrations or redevelopment."
              className="h-full"
              compact
            />
          </div>
        </section>

        <section
          className="mt-16 max-w-[74ch] md:mt-20"
          aria-labelledby="scope-suitability-heading"
        >
          <h2
            id="scope-suitability-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Scope and suitability
          </h2>
          <p className="mt-6 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Ongoing support can cover Blackburn Studio projects and suitable
            existing{" "}
            <Link
              href="/digital/websites"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              websites
            </Link>
            ,{" "}
            <Link
              href="/digital/hosting-domains"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              hosting accounts and domains
            </Link>
            , and{" "}
            <Link
              href="/digital/microsoft-365"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              Microsoft 365 environments
            </Link>
            .
          </p>
          <p className="mt-4 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Where a system is unfamiliar or managed by another provider, the
            current setup will be reviewed before ongoing responsibility is
            agreed.
          </p>
          <p className="mt-4 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Urgent or after-hours support is only included where it has been
            specifically arranged.
          </p>
        </section>

        <section
          className="mt-16 max-w-[74ch] md:mt-20"
          aria-labelledby="not-included-heading"
        >
          <h2
            id="not-included-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            What is not automatically included
          </h2>
          <ul className="mt-7 space-y-2.5 text-sm leading-relaxed text-studio-muted md:text-base">
            <li className="flex gap-2">
              <span
                className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-studio-border"
                aria-hidden="true"
              />
              <span>Emergency or after-hours response.</span>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-studio-border"
                aria-hidden="true"
              />
              <span>Major redesign or redevelopment.</span>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-studio-border"
                aria-hidden="true"
              />
              <span>Unsupported or abandoned software.</span>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-studio-border"
                aria-hidden="true"
              />
              <span>Third-party custom code repair.</span>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-studio-border"
                aria-hidden="true"
              />
              <span>Incident recovery outside the agreed service.</span>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-studio-border"
                aria-hidden="true"
              />
              <span>Work requiring specialist providers.</span>
            </li>
          </ul>
        </section>

        <RelatedDigitalServices
          currentPath="/digital/support"
          relatedHrefs={[
            "/digital/websites",
            "/digital/hosting-domains",
            "/digital/microsoft-365",
          ]}
          className="mt-16 md:mt-20"
        />

        <section className="mt-20 rounded-3xl border border-studio-border bg-studio-surface px-7 py-11 md:mt-24 md:px-10 md:py-12">
          <h2 className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Need ongoing digital support?
          </h2>
          <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Regular support can cover one service or the wider digital setup. We
            can agree on what is included, who is responsible for each part and
            how support will be handled.
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
