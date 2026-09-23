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
import { createPageMetadata } from "@/lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Workflow and Business Systems",
  description:
    "Practical workflow and business-system improvement for small businesses and organisations, including forms, information management, automation, Microsoft 365 and custom tools.",
  path: "/digital/workflow-systems",
});

export default function WorkflowSystemsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="editorial-light-theme w-full flex-1 bg-studio-base text-studio-muted">
        <div className="mx-auto w-full max-w-328 px-6 pt-14 pb-20 md:px-8 md:pt-20 md:pb-28">
          <section
            aria-labelledby="workflow-systems-heading"
            className="max-w-[76ch]"
          >
            <SectionEyebrow className="text-sm tracking-[0.24em]">
              <span className="text-[#765d34]">Digital services</span>
            </SectionEyebrow>
            <h1
              id="workflow-systems-heading"
              className="mt-4 max-w-[22ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
            >
              Make the systems behind the business work better
            </h1>
            <p className="mt-7 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              When work is being repeated, information is hard to find or a
              process relies on too many spreadsheets, emails or manual steps,
              the first job is to understand where the friction is.
            </p>
            <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              Blackburn Studio can review the way the work happens, improve the
              process and then use the right tools where they add value. That
              might involve a clearer workflow, better forms, Microsoft 365,
              automation, a custom tool or a combination of them.
            </p>
          </section>

          <DigitalServicesSubnav
            currentPath="/digital/workflow-systems"
            className="mt-12 max-w-[74ch] md:mt-14"
          />

          <section
            aria-labelledby="problems-heading"
            className="mt-20 max-w-[74ch] border-t border-studio-border pt-12 md:mt-24 md:pt-16"
          >
            <h2
              id="problems-heading"
              className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Start with what is slowing the work down
            </h2>
            <p className="mt-6 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              The technology comes later. A useful review starts with the parts
              of the day-to-day work that are awkward, repetitive or difficult
              to see clearly.
            </p>
            <DigitalInfoPanel title="Common signs" className="mt-8">
              <ul className="grid gap-3 text-sm leading-relaxed text-studio-muted sm:grid-cols-2 md:text-base">
                <li>Information entered more than once</li>
                <li>Paper forms or spreadsheet workarounds</li>
                <li>Long email chains for simple approvals</li>
                <li>Enquiries or follow-ups being missed</li>
                <li>Status information spread across different places</li>
                <li>Important knowledge held by one person</li>
                <li>Systems that do not share information</li>
                <li>Reporting that takes too much manual effort</li>
              </ul>
            </DigitalInfoPanel>
          </section>

          <section
            aria-labelledby="responses-heading"
            className="mt-20 md:mt-24"
          >
            <SectionEyebrow className="text-[#765d34]">
              What the response can look like
            </SectionEyebrow>
            <h2
              id="responses-heading"
              className="mt-3 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Improve the process before adding more technology
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3 md:gap-6">
              <ServicePropositionCard
                title="Simplify the workflow"
                intro="Clarify who does what, remove unnecessary steps and make the process easier to follow."
                capabilities={[
                  "Process review",
                  "Clear handoffs",
                  "Forms and approvals",
                  "Status visibility",
                ]}
                footerLabel="Useful when"
                footerText="The existing process has grown complicated over time."
                compact
                className="h-full"
              />
              <ServicePropositionCard
                title="Use the tools you already have"
                intro="Get more value from systems already in the business before introducing something new."
                capabilities={[
                  "Microsoft 365",
                  "SharePoint",
                  "Microsoft Forms",
                  "Lists and automation",
                ]}
                footerLabel="Useful when"
                footerText="The capability already exists but the setup is not supporting the work."
                compact
                className="h-full"
              />
              <ServicePropositionCard
                title="Build where it is needed"
                intro="Create a focused tool or integration when an off-the-shelf option does not solve the problem well."
                capabilities={[
                  "Custom tools",
                  "Simple portals",
                  "Integrations",
                  "Reporting and dashboards",
                ]}
                footerLabel="Useful when"
                footerText="The business has a clear need that existing tools cannot handle cleanly."
                compact
                className="h-full"
              />
            </div>
          </section>

          <section
            aria-labelledby="m365-option-heading"
            className="mt-20 max-w-[74ch] border-t border-studio-border pt-12 md:mt-24 md:pt-16"
          >
            <SectionEyebrow className="text-[#765d34]">
              One possible platform
            </SectionEyebrow>
            <h2
              id="m365-option-heading"
              className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Microsoft 365 can be part of the answer
            </h2>
            <p className="mt-6 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              For businesses already using Microsoft 365, there is often more
              value available from the tools already being paid for. Email,
              Teams, SharePoint, Forms, Lists and automation can be connected
              into a more useful working system when that suits the problem.
            </p>
            <Link
              href="/digital/microsoft-365"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-studio-muted underline decoration-[#b9955a]/55 underline-offset-4 transition-colors hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
            >
              Explore Microsoft 365 setup and support
              <span aria-hidden="true">→</span>
            </Link>
          </section>

          <section
            aria-labelledby="workflow-contact-heading"
            className="editorial-dark-section mt-20 rounded-3xl border border-studio-border bg-studio-base px-7 py-11 text-studio-muted md:mt-24 md:px-10 md:py-12"
          >
            <h2
              id="workflow-contact-heading"
              className="max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Something in the business taking more effort than it should?
            </h2>
            <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              Tell me how it works today and where it is getting in the way. We
              can work out what is worth changing before deciding on the
              technology.
            </p>
            <div className="mt-8">
              <StudioButton href="/contact" variant="primary">
                Talk through the problem
              </StudioButton>
            </div>
          </section>

          <RelatedDigitalServices
            currentPath="/digital/workflow-systems"
            relatedHrefs={[
              "/digital/websites",
              "/digital/hosting-domains",
              "/digital/support",
            ]}
            className="mt-16 md:mt-20"
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
