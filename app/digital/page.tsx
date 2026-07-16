import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton, StudioTag } from "@/components/studio";

export const metadata: Metadata = {
  title: "Website design, workflow improvement and digital platforms | Blackburn Studio",
  description:
    "Blackburn Studio helps small businesses and community organisations build clearer websites, improve workflows and set up useful digital systems.",
  openGraph: {
    title: "Practical digital improvement for websites, workflows and platforms",
    description:
      "Blackburn Studio builds clearer websites and practical digital systems that support visibility, communication and everyday operations.",
  },
};

const processStages = [
  {
    title: "Understand",
    text: "Learn the goals, people, constraints and current way of working.",
  },
  {
    title: "Find the real problem",
    text: "Separate the underlying friction from its visible symptoms.",
  },
  {
    title: "Simplify",
    text: "Remove unnecessary steps before introducing technology.",
  },
  {
    title: "Choose the right approach",
    text: "Decide what should change, what should remain and how to proceed.",
  },
  {
    title: "Build or improve",
    text: "Deliver clear, maintainable work in agreed stages.",
  },
  {
    title: "Support and evolve",
    text: "Refine the result as needs and opportunities change.",
  },
];

export default function DigitalPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[82rem] flex-1 px-6 pt-14 pb-24 md:px-8 md:pt-20 md:pb-32">
        <section aria-labelledby="digital-hero-heading" className="max-w-[76ch]">
          <SectionEyebrow className="text-sm tracking-[0.24em]">Digital</SectionEyebrow>
          <h1
            id="digital-hero-heading"
            className="mt-5 max-w-[22ch] text-4xl font-medium leading-[1.05] tracking-tight text-studio-text md:text-6xl"
          >
            Websites that promote your work. Systems that make it easier to
            manage.
          </h1>
          <p className="mt-7 max-w-[66ch] text-[1.02rem] leading-relaxed text-studio-muted md:text-[1.1rem]">
            Blackburn Studio helps small businesses and community organisations
            build clearer websites, improve everyday processes and set up
            useful tools for managing information, content and follow-up.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <StudioButton href="/contact" variant="primary">
              Start a conversation
            </StudioButton>
            <StudioButton href="#selected-digital-work" variant="secondary">
              See selected work
            </StudioButton>
          </div>
          <p className="mt-9 max-w-[70ch] text-sm leading-loose text-studio-dim">
            <span className="text-studio-dim">Services:</span>{" "}
            <a
              href="#websites"
              className="text-studio-muted transition hover:text-studio-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
            >
              Websites
            </a>
            {", "}
            <a
              href="#workflow-improvement"
              className="text-studio-muted transition hover:text-studio-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
            >
              workflow improvement
            </a>
            {", and "}
            <a
              href="#platforms-systems"
              className="text-studio-muted transition hover:text-studio-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base"
            >
              platforms and systems
            </a>
            .
          </p>
          <p className="mt-6 max-w-[70ch] text-sm leading-relaxed text-studio-dim">
            Common starting points include website refreshes, new business
            sites, form and reporting clean-up, workflow reviews and small
            internal tools.
          </p>
        </section>

        <section id="websites" aria-labelledby="websites-heading" className="mt-28 max-w-[54rem] scroll-mt-28 md:mt-36 md:scroll-mt-32">
          <SectionEyebrow className="text-sm tracking-[0.24em]">Websites</SectionEyebrow>
          <h2 id="websites-heading" className="mt-4 max-w-[26ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Clear websites that support real business and organisational goals
          </h2>
          <div className="mt-7 max-w-[68ch] space-y-6 text-[1.02rem] leading-8 text-studio-muted md:text-[1.1rem] md:leading-[1.85]">
            <p>
              For many clients, the website is the right place to start. Blackburn Studio builds
              new sites and improves existing ones, bringing together structure, content,
              photography and practical platform choices.
            </p>
            <p>
              The result is a site that is easier to use, maintain and improve. Website work can
              also reveal broader opportunities in content, customer experience and ongoing digital
              support.
            </p>
          </div>
          <div className="mt-7 max-w-[68ch]">
            <p className="text-sm leading-relaxed text-studio-dim md:text-base">
              Website projects can also include photography where fresh images would help explain
              the work, show the people involved or make the site feel more complete.
            </p>
            <Link
              href="/work"
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-studio-dim transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              View photography work
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className="mt-10 flex max-w-[68ch] flex-wrap gap-x-4 gap-y-4">
            <li><StudioTag>New websites</StudioTag></li>
            <li><StudioTag>Website modernisation</StudioTag></li>
            <li><StudioTag>Information structure</StudioTag></li>
            <li><StudioTag>Photography</StudioTag></li>
            <li><StudioTag>Portfolio presentation</StudioTag></li>
            <li><StudioTag>Ongoing improvement</StudioTag></li>
          </ul>
          <aside className="mt-10 max-w-[68ch] border-l border-studio-border pl-5">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Commercial client project</p>
            <p className="mt-3 text-[0.98rem] leading-7 text-studio-muted">
              For Create from Concepts, Blackburn Studio combined a substantial WordPress rebuild
              with improved information structure, gallery presentation and original team
              photography. The site is live and the project remains ongoing.
            </p>
          </aside>
        </section>

        <section id="workflow-improvement" aria-labelledby="workflow-heading" className="mt-28 max-w-[54rem] scroll-mt-28 md:mt-32 md:scroll-mt-32">
          <SectionEyebrow className="text-sm tracking-[0.24em]">
            Workflow and process improvement
          </SectionEyebrow>
          <h2 id="workflow-heading" className="mt-4 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Improve how work moves before deciding what to build
          </h2>
          <div className="mt-7 max-w-[68ch] space-y-6 text-[1.02rem] leading-8 text-studio-muted md:text-[1.1rem] md:leading-[1.85]">
            <p>
              Paper forms, spreadsheet workarounds, repeated entry and long email chains often
              point to a process problem before they point to a technology problem.
            </p>
            <p>
              Blackburn Studio maps how work happens, removes unnecessary friction and introduces
              the smallest useful change - whether that is a clearer process, automation or a new
              system.
            </p>
          </div>
          <ul className="mt-10 flex max-w-[68ch] flex-wrap gap-x-4 gap-y-4">
            <li><StudioTag>Manual entry</StudioTag></li>
            <li><StudioTag>Paper forms</StudioTag></li>
            <li><StudioTag>Spreadsheets</StudioTag></li>
            <li><StudioTag>Email approvals</StudioTag></li>
            <li><StudioTag>Status visibility</StudioTag></li>
            <li><StudioTag>Reporting</StudioTag></li>
          </ul>
          <aside className="mt-10 max-w-[68ch] border-l border-studio-border pl-5">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Volunteer community project</p>
            <p className="mt-3 text-[0.98rem] leading-7 text-studio-muted">
              AFL Masters Vic Country workflow work is a volunteer community project. It included
              moving fragmented administration into structured Microsoft 365, SharePoint, Forms and
              Power Automate workflows, creating clearer visibility and shared access.
            </p>
          </aside>
        </section>

        <section id="platforms-systems" aria-labelledby="platforms-heading" className="mt-28 max-w-[54rem] scroll-mt-28 md:mt-32 md:scroll-mt-32">
          <SectionEyebrow className="text-sm tracking-[0.24em]">
            Platforms, portals and business systems
          </SectionEyebrow>
          <h2 id="platforms-heading" className="mt-4 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            When the need goes beyond a standard website
          </h2>
          <div className="mt-7 max-w-[68ch] space-y-6 text-[1.02rem] leading-8 text-studio-muted md:text-[1.1rem] md:leading-[1.85]">
            <p>
              When a standard website is not enough, Blackburn Studio can design shared platforms,
              portals and operational tools that bring content, data and administration together.
            </p>
            <p>
              Integrations, resilience and ongoing support are planned from the start, so the
              result remains useful after launch.
            </p>
          </div>
          <ul className="mt-10 flex max-w-[68ch] flex-wrap gap-x-4 gap-y-4">
            <li><StudioTag>Shared website platforms</StudioTag></li>
            <li><StudioTag>Member portals</StudioTag></li>
            <li><StudioTag>Central content</StudioTag></li>
            <li><StudioTag>Live data</StudioTag></li>
            <li><StudioTag>Integrations</StudioTag></li>
            <li><StudioTag>Administration tools</StudioTag></li>
          </ul>
          <aside className="mt-10 max-w-[68ch] border-l border-studio-border pl-5">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Volunteer community project</p>
            <p className="mt-3 text-[0.98rem] leading-7 text-studio-muted">
              AFL Masters Vic Country is a volunteer community project. Blackburn Studio designed
              and delivered a shared public platform supporting the main league site and 17 clubs,
              with centrally managed content and integrated live competition information.
            </p>
          </aside>
        </section>

        <section aria-labelledby="how-heading" className="mt-32 max-w-[64rem] md:mt-40">
          <SectionEyebrow className="text-sm tracking-[0.24em]">Development lifecycle</SectionEyebrow>
          <h2 id="how-heading" className="mt-4 max-w-[20ch] text-4xl font-medium tracking-tight text-studio-text md:text-[2.8rem]">
            From goal to delivery
          </h2>
          <div className="relative mt-9">
            <div className="absolute bottom-0 left-4 top-1 w-px bg-studio-border md:hidden" aria-hidden="true" />
            <ol className="grid gap-10 md:grid-cols-2 md:gap-x-14 md:gap-y-12 lg:grid-cols-3 lg:gap-x-16">
            {processStages.map((stage, index) => (
              <li
                key={stage.title}
                className={`relative pl-16 md:pl-0 md:pt-11 lg:pr-6 ${
                  index % 3 !== 2
                    ? "lg:after:absolute lg:after:left-12 lg:after:right-0 lg:after:top-[1.15rem] lg:after:h-px lg:after:bg-studio-border"
                    : ""
                }`}
              >
                <p className="absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-studio-border bg-studio-surface text-xs font-medium tracking-[0.14em] text-studio-muted md:left-0 md:top-0">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-xl font-medium tracking-tight text-studio-text md:text-2xl">
                  {stage.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-studio-muted">{stage.text}</p>
              </li>
            ))}
            </ol>
          </div>
        </section>

        <section id="selected-digital-work" aria-labelledby="selected-heading" className="mt-24 max-w-[70rem] scroll-mt-28 md:mt-28 md:scroll-mt-32">
          <SectionEyebrow>Selected Digital work</SectionEyebrow>
          <h2 id="selected-heading" className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Selected work across websites, workflows and platforms
          </h2>
          <p className="mt-6 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            These projects show how Blackburn Studio works across small-business websites,
            operational improvement and shared digital platforms. Each began with a different need
            and called for a different response.
          </p>

          <div className="mt-12 space-y-10">
            <a
              href="https://createfromconcepts.com.au/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Create from Concepts website"
              className="group relative block cursor-pointer rounded-3xl border border-studio-border bg-studio-surface p-8 transition hover:border-white/30 hover:bg-studio-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base md:p-10"
            >
              <span className="pointer-events-none absolute top-6 right-6 inline-flex items-center gap-1 whitespace-nowrap text-[0.68rem] uppercase tracking-[0.2em] text-neutral-500 transition group-hover:text-neutral-300 group-focus-visible:text-neutral-300">
                Public site
                <span aria-hidden="true">↗</span>
              </span>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                Commercial client project
              </p>
              <div className="mt-3">
                <h3 className="pr-40 text-3xl font-medium tracking-tight text-studio-text md:text-[2rem]">
                  Create from Concepts
                </h3>
              </div>
              <p className="mt-5 max-w-[86ch] text-[0.95rem] leading-relaxed text-studio-muted md:text-base">
                Blackburn Studio modernised the Create from Concepts WordPress site with stronger
                structure, improved portfolio presentation, and original team photography; the site
                is live and the project remains ongoing.
              </p>
              <div className="relative mt-7 overflow-hidden rounded-2xl border border-studio-border bg-studio-surface-soft">
                <Image
                  src="/images/digital/create-from-concepts-home.jpg"
                  alt="Create from Concepts website homepage showing custom cabinetry positioning and project imagery"
                  width={1259}
                  height={708}
                  className="h-auto w-full object-cover"
                  sizes="(min-width: 1024px) 60rem, (min-width: 768px) 90vw, 100vw"
                />
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-3 gap-y-3">
                <li><StudioTag>Website modernisation</StudioTag></li>
                <li><StudioTag>Information structure</StudioTag></li>
                <li><StudioTag>Photography</StudioTag></li>
                <li><StudioTag>Ongoing improvement</StudioTag></li>
              </ul>
            </a>

            <div className="grid gap-8 lg:grid-cols-2">
              <a
                href="https://viccountrymasters.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit AFL Masters Vic Country website"
                className="group relative flex h-full min-w-0 cursor-pointer flex-col rounded-3xl border border-studio-border bg-studio-surface p-7 transition hover:border-white/30 hover:bg-studio-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base md:p-8"
              >
                <span className="pointer-events-none absolute top-6 right-6 inline-flex items-center gap-1 whitespace-nowrap text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500 transition group-hover:text-neutral-300 group-focus-visible:text-neutral-300">
                  Public site
                  <span aria-hidden="true">↗</span>
                </span>
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                  Volunteer community project
                </p>
                <div className="mt-3">
                  <h3 className="pr-40 text-2xl font-medium tracking-tight text-studio-text">
                    AFL Masters Vic Country website platform
                  </h3>
                </div>
                <p className="mt-5 text-[0.95rem] leading-relaxed text-studio-muted md:text-base lg:min-h-[7.5rem]">
                  A simple SharePoint-pages direction was not suitable for public club websites.
                  Blackburn Studio delivered a shared public platform for the main league site and
                  17 clubs, with central content and live competition information.
                </p>
                <div className="relative mt-6 overflow-hidden rounded-2xl border border-studio-border bg-studio-surface-soft lg:min-h-[18rem]">
                  <Image
                    src="/images/digital/vic-country-club-finder.jpg"
                    alt="AFL Masters Vic Country find your local club page showing a club search interface and map of Victoria"
                    width={1227}
                    height={690}
                    className="h-full w-full object-cover"
                    sizes="(min-width: 1024px) 34rem, (min-width: 768px) 45vw, 100vw"
                  />
                </div>
                <ul className="mt-7 flex flex-wrap gap-x-3 gap-y-3">
                  <li><StudioTag>Shared website platforms</StudioTag></li>
                  <li><StudioTag>Platform development</StudioTag></li>
                  <li><StudioTag>Integrations</StudioTag></li>
                  <li><StudioTag>Business systems</StudioTag></li>
                </ul>
              </a>

              <article className="relative flex h-full min-w-0 flex-col rounded-3xl border border-studio-border bg-studio-surface p-7 md:p-8">
                <span className="absolute top-6 right-6 inline-flex items-center whitespace-nowrap text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
                  Internal workflow
                </span>
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                  Volunteer community project
                </p>
                <h3 className="mt-3 pr-40 text-2xl font-medium tracking-tight text-studio-text">
                  AFL Masters Vic Country workflows and automation
                </h3>
                <p className="mt-5 text-[0.95rem] leading-relaxed text-studio-muted md:text-base lg:min-h-[7.5rem]">
                  Administration relied on inboxes, spreadsheets, paper forms and manual reporting.
                  Blackburn Studio helped move this work into structured Microsoft 365, SharePoint,
                  Forms and Power Automate workflows.
                </p>

                {/* Anonymised before-to-after workflow diagram — warm parchment panel */}
                <figure
                  className="mt-6 overflow-hidden rounded-2xl bg-[#f0ebe0] lg:min-h-[18rem]"
                  role="img"
                  aria-label="Anonymised workflow diagram showing administration moving from inboxes, spreadsheets and paper forms to structured workflows and clearer visibility"
                >
                  <figcaption className="sr-only">
                    Anonymised process diagram. Before: personal inboxes, spreadsheets, paper
                    forms, manual reporting. Structured workflow: match-day forms, shared records,
                    automated reminders, reporting flow. Clearer visibility: compliance status,
                    club information, board reporting, volunteer handover.
                  </figcaption>

                  {/* Desktop/tablet — three columns inside parchment */}
                  <div className="hidden sm:flex" aria-hidden="true">
                    {[
                      { label: "Before",              items: ["Personal inboxes",  "Spreadsheets",        "Paper forms",        "Manual reporting"]  },
                      { label: "Structured workflow",  items: ["Match-day forms",   "Shared records",      "Automated reminders", "Reporting flow"]    },
                      { label: "Clearer visibility",   items: ["Compliance status", "Club information",   "Board reporting",     "Volunteer handover"] },
                    ].map((stage, idx) => (
                      <div key={stage.label} className="contents">
                        <div className="flex-1 px-5 py-6">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6b5f4a]">
                            {stage.label}
                          </p>
                          <ul className="mt-4 space-y-2.5">
                            {stage.items.map((item) => (
                              <li key={item} className="text-[0.83rem] leading-snug text-[#3a3228]">{item}</li>
                            ))}
                          </ul>
                        </div>
                        {idx < 2 && (
                          <div className="flex items-center justify-center px-1">
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                              <line x1="2" y1="14" x2="22" y2="14" stroke="#b0a090" strokeWidth="1.5" strokeLinecap="round" />
                              <polyline points="17,9 23,14 17,19" stroke="#b0a090" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Mobile — vertical stack inside parchment */}
                  <div className="flex flex-col sm:hidden" aria-hidden="true">
                    {[
                      { label: "Before",              items: ["Personal inboxes",  "Spreadsheets",       "Paper forms",        "Manual reporting"]   },
                      { label: "Structured workflow",  items: ["Match-day forms",   "Shared records",     "Automated reminders", "Reporting flow"]     },
                      { label: "Clearer visibility",   items: ["Compliance status", "Club information",  "Board reporting",    "Volunteer handover"]  },
                    ].map((stage, idx) => (
                      <div key={stage.label}>
                        <div className="px-5 pt-5 pb-4">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6b5f4a]">
                            {stage.label}
                          </p>
                          <ul className="mt-3 space-y-2.5">
                            {stage.items.map((item) => (
                              <li key={item} className="text-[0.83rem] leading-snug text-[#3a3228]">{item}</li>
                            ))}
                          </ul>
                        </div>
                        {idx < 2 && (
                          <div className="flex items-center justify-center py-1">
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                              <line x1="14" y1="2" x2="14" y2="22" stroke="#b0a090" strokeWidth="1.5" strokeLinecap="round" />
                              <polyline points="9,17 14,23 19,17" stroke="#b0a090" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </figure>

                <ul className="mt-7 flex flex-wrap gap-x-3 gap-y-3">
                  <li><StudioTag>Workflow improvement</StudioTag></li>
                  <li><StudioTag>Paper-to-digital</StudioTag></li>
                  <li><StudioTag>Microsoft 365</StudioTag></li>
                  <li><StudioTag>Automation</StudioTag></li>
                  <li><StudioTag>Reporting</StudioTag></li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section aria-labelledby="capability-heading" className="mt-24 md:mt-28">
          <SectionEyebrow>Ongoing support</SectionEyebrow>
          <h2 id="capability-heading" className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Support beyond the first build
          </h2>
          <p className="mt-6 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Some projects need more than a launch. Blackburn Studio can help with the structure,
            content and systems that keep things useful over time.
          </p>
          <div className="mt-9 grid gap-5 md:grid-cols-3 md:gap-6">
            <section className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 px-5 py-5 md:px-6 md:py-6">
              <h3 className="text-lg font-medium text-studio-text">Structure and content</h3>
              <p className="mt-3 text-base leading-relaxed text-studio-muted">
                Information architecture, content design and clear images that help people
                understand the work.
              </p>
            </section>

            <section className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 px-5 py-5 md:px-6 md:py-6">
              <h3 className="text-lg font-medium text-studio-text">Workflows and operations</h3>
              <p className="mt-3 text-base leading-relaxed text-studio-muted">
                Microsoft 365, SharePoint, automation and reporting that support clearer,
                repeatable administration.
              </p>
            </section>

            <section className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 px-5 py-5 md:px-6 md:py-6">
              <h3 className="text-lg font-medium text-studio-text">Platforms and integration</h3>
              <p className="mt-3 text-base leading-relaxed text-studio-muted">
                Portals, shared platforms, live-data integrations and administration tools for needs
                beyond a standard website.
              </p>
            </section>
          </div>
        </section>

        <p className="mt-10 text-sm text-studio-dim md:mt-12">
          For more about Mark Blackburn and the studio approach, visit{" "}
          <Link
            href="/about"
            className="text-studio-muted underline decoration-white/35 underline-offset-4 transition hover:text-studio-text"
          >
            About
          </Link>
          .
        </p>

        <section
          aria-labelledby="contact-heading"
          className="mt-24 max-w-[64rem] rounded-3xl border border-studio-border bg-studio-surface px-7 py-12 md:mt-28 md:px-12 md:py-14"
        >
          <h2 id="contact-heading" className="max-w-[22ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Tell me what needs to work better
          </h2>
          <p className="mt-6 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Tell me what you want your website, process or information flow to support, and what is
            getting in the way. We can work back from there to identify what needs to change, what
            can be simplified, and what is worth building.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <StudioButton href="/contact" variant="primary">
              Start a conversation
            </StudioButton>
            <a
              href="mailto:hello@theblackburn.studio"
              className="inline-flex items-center text-base text-studio-muted transition hover:text-studio-text"
            >
              hello@theblackburn.studio
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
