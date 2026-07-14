import type { Metadata } from "next";
import Link from "next/link";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Website design, workflow improvement and digital platforms | Blackburn Studio",
  description:
    "Blackburn Studio creates clear websites, improves operational workflows and delivers practical digital platforms for businesses and organisations.",
  openGraph: {
    title: "Practical digital improvement for websites, workflows and platforms",
    description:
      "Blackburn Studio helps businesses and organisations improve websites, workflows and operational systems with clear, maintainable delivery.",
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
  const chipClass =
    "rounded-full border border-white/14 bg-neutral-950/55 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-neutral-200";

  return (
    <div className="flex min-h-screen flex-col bg-black text-neutral-300">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[74rem] flex-1 px-6 pt-14 pb-24 md:px-8 md:pt-20 md:pb-32">
        <section aria-labelledby="digital-hero-heading" className="max-w-[76ch]">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-neutral-500">Digital</p>
          <h1
            id="digital-hero-heading"
            className="mt-5 max-w-[22ch] text-4xl font-medium leading-[1.05] tracking-tight text-white md:text-6xl"
          >
            Better websites and digital systems, shaped around how you work
          </h1>
          <p className="mt-7 max-w-[66ch] text-base leading-relaxed text-neutral-300 md:text-[1.08rem]">
            Some projects begin with a clear brief and outcome. Others begin with a process that no
            longer supports where you want to get to. Blackburn Studio helps you understand the
            need, simplify the problem and build the right response.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Start a conversation
            </Link>
            <Link
              href="#selected-digital-work"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 px-6 py-2.5 text-sm font-medium text-neutral-100 transition hover:border-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              See selected work
            </Link>
          </div>
          <p className="mt-7 max-w-[68ch] text-sm leading-relaxed text-neutral-400">
            <span className="text-neutral-500">Services:</span>{" "}
            <a
              href="#websites"
              className="text-neutral-200 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Websites
            </a>
            {", "}
            <a
              href="#workflow-improvement"
              className="text-neutral-200 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              workflow improvement
            </a>
            {", and "}
            <a
              href="#platforms-systems"
              className="text-neutral-200 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              platforms and systems
            </a>
            .
          </p>
        </section>

        <section id="websites" aria-labelledby="websites-heading" className="mt-24 scroll-mt-28 md:mt-28 md:scroll-mt-32">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-neutral-500">Websites</p>
          <h2 id="websites-heading" className="mt-4 max-w-[26ch] text-3xl font-medium tracking-tight text-white md:text-4xl">
            Clear websites that support real business and organisational goals
          </h2>
          <div className="mt-6 max-w-[66ch] space-y-5 text-base leading-relaxed text-neutral-300 md:text-[1.08rem]">
            <p>
              For many clients, the website is the right place to begin. Blackburn Studio creates
              new sites and modernises existing ones, bringing together structure, content,
              photography and practical platform choices.
            </p>
            <p>
              The result is a site that is easier to understand, maintain and improve. Website work
              can also reveal broader opportunities around content, customer experience and ongoing
              digital support.
            </p>
          </div>
          <ul className="mt-8 flex max-w-[66ch] flex-wrap gap-x-3 gap-y-3">
            <li className={chipClass}>New websites</li>
            <li className={chipClass}>Website modernisation</li>
            <li className={chipClass}>Information structure</li>
            <li className={chipClass}>Photography</li>
            <li className={chipClass}>Portfolio presentation</li>
            <li className={chipClass}>Ongoing improvement</li>
          </ul>
          <aside className="mt-8 max-w-[66ch] border-l border-white/20 pl-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Commercial client project</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              For Create from Concepts, Blackburn Studio combined a substantial WordPress rebuild
              with improved information structure, gallery presentation and original team
              photography. The site is live and the project remains ongoing.
            </p>
          </aside>
        </section>

        <section id="workflow-improvement" aria-labelledby="workflow-heading" className="mt-24 scroll-mt-28 md:mt-28 md:scroll-mt-32">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-neutral-500">
            Workflow and process improvement
          </p>
          <h2 id="workflow-heading" className="mt-4 max-w-[24ch] text-3xl font-medium tracking-tight text-white md:text-4xl">
            Improve how work moves before deciding what to build
          </h2>
          <div className="mt-6 max-w-[66ch] space-y-5 text-base leading-relaxed text-neutral-300 md:text-[1.08rem]">
            <p>
              Paper forms, spreadsheet workarounds, repeated entry and long email chains often
              point to a process problem before they point to a technology problem.
            </p>
            <p>
              Blackburn Studio maps how the work happens, removes unnecessary friction and
              introduces the smallest useful change - whether that is a clearer process, automation
              or a new system.
            </p>
          </div>
          <ul className="mt-8 flex max-w-[66ch] flex-wrap gap-x-3 gap-y-3">
            <li className={chipClass}>Manual entry</li>
            <li className={chipClass}>Paper forms</li>
            <li className={chipClass}>Spreadsheets</li>
            <li className={chipClass}>Email approvals</li>
            <li className={chipClass}>Status visibility</li>
            <li className={chipClass}>Reporting</li>
          </ul>
          <aside className="mt-8 max-w-[66ch] border-l border-white/20 pl-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Volunteer community project</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              AFL Masters Vic Country workflow work is a volunteer community project. It included
              moving fragmented administration into structured Microsoft 365, SharePoint, Forms and
              Power Automate workflows, creating clearer visibility and shared access.
            </p>
          </aside>
        </section>

        <section id="platforms-systems" aria-labelledby="platforms-heading" className="mt-24 scroll-mt-28 md:mt-28 md:scroll-mt-32">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-neutral-500">
            Platforms, portals and business systems
          </p>
          <h2 id="platforms-heading" className="mt-4 max-w-[24ch] text-3xl font-medium tracking-tight text-white md:text-4xl">
            When the need goes beyond a standard website
          </h2>
          <div className="mt-6 max-w-[66ch] space-y-5 text-base leading-relaxed text-neutral-300 md:text-[1.08rem]">
            <p>
              When a standard website is not enough, Blackburn Studio can design shared platforms,
              portals and operational tools that bring content, data and administration together.
            </p>
            <p>
              Integrations, resilience and ongoing support are considered from the start, so the
              result remains useful beyond its initial launch.
            </p>
          </div>
          <ul className="mt-8 flex max-w-[66ch] flex-wrap gap-x-3 gap-y-3">
            <li className={chipClass}>Shared website platforms</li>
            <li className={chipClass}>Member portals</li>
            <li className={chipClass}>Central content</li>
            <li className={chipClass}>Live data</li>
            <li className={chipClass}>Integrations</li>
            <li className={chipClass}>Administration tools</li>
          </ul>
          <aside className="mt-8 max-w-[66ch] border-l border-white/20 pl-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Volunteer community project</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              AFL Masters Vic Country is a volunteer community project. Blackburn Studio designed
              and delivered a shared public platform supporting the main league site and 17 clubs,
              with centrally managed content and integrated live competition information.
            </p>
          </aside>
        </section>

        <section aria-labelledby="how-heading" className="mt-24 md:mt-28">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-neutral-500">Development lifecycle</p>
          <h2 id="how-heading" className="mt-4 max-w-[20ch] text-4xl font-medium tracking-tight text-white md:text-[2.8rem]">
            From goal to delivery
          </h2>
          <div className="relative mt-9">
            <div className="absolute bottom-0 left-4 top-1 w-px bg-white/14 md:hidden" aria-hidden="true" />
            <ol className="grid gap-10 md:grid-cols-2 md:gap-x-12 md:gap-y-12 lg:grid-cols-3">
            {processStages.map((stage, index) => (
              <li
                key={stage.title}
                className={`relative pl-16 md:pl-0 md:pt-11 lg:pr-6 ${
                  index % 3 !== 2
                    ? "lg:after:absolute lg:after:left-12 lg:after:right-0 lg:after:top-[1.15rem] lg:after:h-px lg:after:bg-white/14"
                    : ""
                }`}
              >
                <p className="absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black text-xs font-medium tracking-[0.14em] text-neutral-300 md:left-0 md:top-0">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-xl font-medium tracking-tight text-white md:text-2xl">
                  {stage.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-neutral-300">{stage.text}</p>
              </li>
            ))}
            </ol>
          </div>
        </section>

        <section id="selected-digital-work" aria-labelledby="selected-heading" className="mt-24 scroll-mt-28 md:mt-28 md:scroll-mt-32">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">Selected Digital work</p>
          <h2 id="selected-heading" className="mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
            Selected work across websites, workflows and platforms
          </h2>
          <p className="mt-6 max-w-[66ch] text-base leading-relaxed text-neutral-300 md:text-[1.08rem]">
            These projects show how Blackburn Studio works across small-business websites,
            operational improvement and shared digital platforms. Each began with a different need
            and required a different response.
          </p>

          <div className="mt-12 space-y-10">
            <a
              href="https://createfromconcepts.com.au/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Create from Concepts website"
              className="group block rounded-3xl border border-white/12 bg-neutral-950/50 p-8 transition hover:border-white/25 hover:bg-neutral-950/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:p-10"
            >
              <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                Commercial client project
              </p>
                <span className="inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500 transition group-hover:text-neutral-300 group-focus-visible:text-neutral-300">
                  Live site
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M5 11L11 5" />
                    <path d="M6 5H11V10" />
                  </svg>
                </span>
              </div>
              <h3 className="mt-3 text-3xl font-medium tracking-tight text-white md:text-[2rem]">Create from Concepts</h3>
              <p className="mt-6 max-w-[86ch] text-sm leading-relaxed text-neutral-200">
                An existing WordPress site needed substantial modernisation and stronger portfolio
                presentation. Blackburn Studio rebuilt the structure, improved the gallery
                experience and delivered original team photography. The site is live and the
                project remains ongoing.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-3 gap-y-3">
                <li className={chipClass}>Website modernisation</li>
                <li className={chipClass}>Information structure</li>
                <li className={chipClass}>Photography</li>
                <li className={chipClass}>Ongoing improvement</li>
              </ul>
            </a>

            <div className="grid gap-8 lg:grid-cols-2">
              <a
                href="https://viccountrymasters.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit AFL Masters Vic Country website"
                className="group block rounded-3xl bg-neutral-950/35 p-7 transition hover:bg-neutral-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                  Volunteer community project
                </p>
                  <span className="inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500 transition group-hover:text-neutral-300 group-focus-visible:text-neutral-300">
                    Live site
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M5 11L11 5" />
                      <path d="M6 5H11V10" />
                    </svg>
                  </span>
                </div>
                <h3 className="mt-3 text-2xl font-medium tracking-tight text-white">
                  AFL Masters Vic Country website platform
                </h3>
                <p className="mt-5 text-sm leading-relaxed text-neutral-200">
                  A simple SharePoint-pages direction was not suitable for public club websites.
                  Blackburn Studio delivered a shared public platform for the main league site and
                  17 clubs, with central content and live competition information.
                </p>
                <ul className="mt-6 flex flex-wrap gap-x-3 gap-y-3">
                  <li className={chipClass}>Shared website platforms</li>
                  <li className={chipClass}>Platform development</li>
                  <li className={chipClass}>Integrations</li>
                  <li className={chipClass}>Business systems</li>
                </ul>
              </a>

              <article className="rounded-3xl bg-neutral-950/35 p-7 md:p-8">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                  Volunteer community project
                </p>
                <h3 className="mt-3 text-2xl font-medium tracking-tight text-white">
                  AFL Masters Vic Country workflows and automation
                </h3>
                <p className="mt-5 text-sm leading-relaxed text-neutral-200">
                  Administration relied on inboxes, spreadsheets, paper forms and manual reporting.
                  Blackburn Studio helped move this work into structured Microsoft 365, SharePoint,
                  Forms and Power Automate workflows.
                </p>
                <ul className="mt-6 flex flex-wrap gap-x-3 gap-y-3">
                  <li className={chipClass}>Workflow improvement</li>
                  <li className={chipClass}>Paper-to-digital</li>
                  <li className={chipClass}>Microsoft 365</li>
                  <li className={chipClass}>Automation</li>
                  <li className={chipClass}>Reporting</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section aria-labelledby="capability-heading" className="mt-24 md:mt-28">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">Deeper capability</p>
          <h2 id="capability-heading" className="mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
            Practical depth where it is needed
          </h2>
          <div className="mt-9 grid gap-8 md:grid-cols-3">
            <section className="border-l border-white/20 pl-4">
              <h3 className="text-lg font-medium text-white">Structure and content</h3>
              <p className="mt-3 text-base leading-relaxed text-neutral-300">
                Information architecture, content design and visual communication that make services
                and decisions easier to understand.
              </p>
            </section>

            <section className="border-l border-white/20 pl-4">
              <h3 className="text-lg font-medium text-white">Workflows and operations</h3>
              <p className="mt-3 text-base leading-relaxed text-neutral-300">
                Microsoft 365, SharePoint, automation and reporting that support clearer,
                repeatable administration.
              </p>
            </section>

            <section className="border-l border-white/20 pl-4">
              <h3 className="text-lg font-medium text-white">Platforms and integration</h3>
              <p className="mt-3 text-base leading-relaxed text-neutral-300">
                Portals, shared platforms, live-data integrations and administration tools for needs
                beyond a standard website.
              </p>
            </section>
          </div>
        </section>

        <p className="mt-20 text-sm text-neutral-400 md:mt-24">
          For more about Mark Blackburn and the studio approach, visit{" "}
          <Link
            href="/about"
            className="underline decoration-white/35 underline-offset-4 transition hover:text-white"
          >
            About
          </Link>
          .
        </p>

        <section
          aria-labelledby="contact-heading"
          className="mt-24 rounded-3xl border border-white/20 bg-neutral-900 px-7 py-12 md:mt-28 md:px-12 md:py-14"
        >
          <h2 id="contact-heading" className="max-w-[22ch] text-3xl font-medium tracking-tight text-white md:text-4xl">
            Start with the outcome you want
          </h2>
          <p className="mt-6 max-w-[66ch] text-base leading-relaxed text-neutral-300 md:text-[1.08rem]">
            Tell me what you want your website, process or information flow to support, and what is
            getting in the way. We can work back from there to identify what needs to change, what
            should be simplified, and what is worth building.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              Start a conversation
            </Link>
            <a
              href="mailto:hello@theblackburn.studio"
              className="inline-flex items-center text-base text-neutral-200 transition hover:text-white"
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
