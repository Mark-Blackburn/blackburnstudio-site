import type { Metadata } from "next";
import Link from "next/link";

import {
  DigitalInfoPanel,
  DigitalServicesSubnav,
  RelatedDigitalServices,
  ServicePropositionCard,
} from "@/components/digital";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata: Metadata = {
  title: "Microsoft 365 Setup and Support | Blackburn Studio",
  description:
    "Microsoft 365 setup, migration, administration and workflow delivery across email, Teams, SharePoint and automation.",
};

export default function Microsoft365Page() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-312 flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section aria-labelledby="m365-heading" className="max-w-[76ch]">
          <SectionEyebrow>Digital services</SectionEyebrow>
          <h1
            id="m365-heading"
            className="mt-4 max-w-[22ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
          >
            Microsoft 365 configured as a working business system
          </h1>
          <p className="mt-7 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Blackburn Studio helps businesses and organisations set up Microsoft
            365 properly, from email and user administration through to Teams,
            SharePoint, forms and workflow automation.
          </p>
          <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Microsoft 365 should operate as a connected business system, not
            simply a collection of licences.
          </p>
          <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            For domain connection, DNS and related email routing, see{" "}
            <Link
              href="/digital/hosting-domains"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              domains and hosting
            </Link>
            .
          </p>
        </section>

        <DigitalServicesSubnav
          currentPath="/digital/microsoft-365"
          className="mt-12 max-w-[74ch] md:mt-14"
        />

        <section className="mt-16 grid gap-5 md:mt-20 md:grid-cols-2 md:gap-6">
          <h2 className="sr-only">Microsoft 365 service areas</h2>
          <ServicePropositionCard
            title="Set up the foundation"
            intro="Establish secure business email, users, licences and access so the Microsoft 365 environment is ready to operate properly."
            capabilities={[
              "New tenant setup",
              "Business email and domain connection",
              "Users and licences",
              "Mailbox migration",
              "Shared mailboxes and aliases",
              "Security and access configuration",
              "Outlook setup and troubleshooting",
            ]}
            footerLabel="Typical outcome"
            footerText="A stable Microsoft 365 environment with working email, clear access and correctly configured users."
            className="h-full"
          />

          <ServicePropositionCard
            title="Connect the way your team works"
            intro="Organise collaboration, information and repeatable processes so the platform supports everyday work rather than becoming another collection of tools."
            capabilities={[
              "Teams",
              "SharePoint",
              "Document libraries",
              "Microsoft Forms",
              "Microsoft Lists",
              "Workflow automation",
              "Permissions and governance",
              "Process digitisation",
            ]}
            footerLabel="Typical outcome"
            footerText="Clearer collaboration, structured information and less repeated administration."
            className="h-full"
          />
        </section>

        <section
          className="mt-16 md:mt-20"
          aria-labelledby="existing-env-heading"
        >
          <h2
            id="existing-env-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Existing Microsoft 365 environments
          </h2>
          <p className="mt-6 max-w-[72ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Already using Microsoft 365? Blackburn Studio can review and improve
            an existing environment without requiring a complete migration or
            rebuild.
          </p>
          <ul className="mt-7 grid gap-3 text-base leading-relaxed text-studio-muted sm:grid-cols-2 md:text-[1.02rem]">
            <li>Domain and DNS review</li>
            <li>Mailbox and alias configuration</li>
            <li>Shared mailbox setup</li>
            <li>User and licence review</li>
            <li>Teams and SharePoint structure</li>
            <li>Permissions and access review</li>
            <li>Security configuration</li>
            <li>Workflow and information-management improvements</li>
          </ul>
        </section>

        <section
          className="mt-16 md:mt-20"
          aria-labelledby="engagement-start-heading"
        >
          <h2
            id="engagement-start-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            How an engagement can start
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
            <ServicePropositionCard
              title="Stabilise"
              intro="Resolve immediate email, access, account or domain problems."
              footerLabel="Best for"
              footerText="Getting the environment working again."
              className="h-full"
              compact
            />
            <ServicePropositionCard
              title="Organise"
              intro="Improve users, licences, permissions, Teams, SharePoint and document structure."
              footerLabel="Best for"
              footerText="Making the existing setup clearer and easier to manage."
              className="h-full"
              compact
            />
            <ServicePropositionCard
              title="Improve"
              intro="Add forms, workflows, automation and ongoing administration."
              footerLabel="Best for"
              footerText="Extending Microsoft 365 into a more useful business system."
              className="h-full"
              compact
            />
          </div>
        </section>

        <section
          className="mt-16 max-w-[74ch] md:mt-20"
          aria-labelledby="security-heading"
        >
          <h2
            id="security-heading"
            className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Security and governance
          </h2>
          <p className="mt-6 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Practical security and governance settings can be set up to match
            how your organisation works.
          </p>
          <DigitalInfoPanel title="Practical setup areas" className="mt-7">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-base font-medium text-studio-text">
                  Identity and access
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-studio-muted md:text-base">
                  <li>Multi-factor authentication</li>
                  <li>Administrator-role review</li>
                  <li>User onboarding and offboarding</li>
                  <li>Access and permissions</li>
                </ul>
              </div>
              <div>
                <h3 className="text-base font-medium text-studio-text">
                  Continuity and information
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-studio-muted md:text-base">
                  <li>Shared account reduction</li>
                  <li>Recovery and continuity planning</li>
                  <li>SharePoint permissions</li>
                  <li>Information structure</li>
                </ul>
              </div>
            </div>
          </DigitalInfoPanel>
        </section>

        <RelatedDigitalServices
          currentPath="/digital/microsoft-365"
          relatedHrefs={[
            "/digital/hosting-domains",
            "/digital/support",
            "/digital/websites",
          ]}
          className="mt-16 md:mt-20"
        />

        <section className="mt-20 rounded-3xl border border-studio-border bg-studio-surface px-7 py-11 md:mt-24 md:px-10 md:py-12">
          <h2 className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Need help setting up Microsoft 365?
          </h2>
          <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            <Link
              href="/digital/support"
              className="underline decoration-studio-border underline-offset-3 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              Ongoing support
            </Link>{" "}
            can cover users and licences, mailbox changes, access requests,
            onboarding, Teams and SharePoint support, and technical
            coordination.
          </p>
          <div className="mt-8">
            <StudioButton href="/contact" variant="primary">
              Discuss Microsoft 365
            </StudioButton>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
