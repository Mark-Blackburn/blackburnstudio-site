import Image from "next/image";

import { SectionEyebrow, StudioTag } from "@/components/studio";

import { leadDigitalProject, secondaryDigitalProjects } from "./data";

type RichDigitalWorkSectionProps = {
  id?: string;
  eyebrow: string;
  heading: string;
  supportingCopy: string;
  className?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type CardHeaderProps = {
  label: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
};

function CardHeader({
  label,
  title,
  actionLabel,
  actionHref,
}: CardHeaderProps) {
  const hasAction = !!actionLabel;

  return (
    <>
      <div className="flex flex-col items-start gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          {label}
        </p>
        {hasAction ? (
          actionHref ? (
            <span className="inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500 transition group-hover:text-neutral-300 group-focus-visible:text-neutral-300">
              {actionLabel}
              <span aria-hidden="true">↗</span>
            </span>
          ) : (
            <span className="inline-flex items-center text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
              {actionLabel}
            </span>
          )
        ) : null}
      </div>
      <h3 className="mt-4 text-2xl font-medium tracking-tight text-studio-text md:text-[2rem]">
        {title}
      </h3>
    </>
  );
}

export default function RichDigitalWorkSection({
  id,
  eyebrow,
  heading,
  supportingCopy,
  className,
}: RichDigitalWorkSectionProps) {
  const platform = secondaryDigitalProjects.platform;
  const workflows = secondaryDigitalProjects.workflows;
  const coaching = secondaryDigitalProjects.coaching;

  return (
    <section
      id={id}
      aria-labelledby="digital-work-heading"
      className={joinClasses("scroll-mt-28 md:scroll-mt-32", className)}
    >
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <h2
        id="digital-work-heading"
        className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
      >
        {heading}
      </h2>
      <p className="mt-6 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
        {supportingCopy}
      </p>

      <div className="mt-12 space-y-10">
        <a
          href={leadDigitalProject.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={leadDigitalProject.ariaLabel}
          className="group block cursor-pointer rounded-3xl border border-studio-border bg-studio-surface p-8 transition hover:border-white/30 hover:bg-studio-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base md:p-10"
        >
          <CardHeader
            label={leadDigitalProject.label}
            title={leadDigitalProject.title}
            actionLabel={leadDigitalProject.linkLabel}
            actionHref={leadDigitalProject.href}
          />
          <p className="mt-5 max-w-[86ch] text-sm leading-relaxed text-studio-muted md:text-base">
            {leadDigitalProject.description}
          </p>
          <div className="relative mt-7 overflow-hidden rounded-2xl border border-studio-border bg-studio-surface-soft">
            <Image
              src={leadDigitalProject.imageSrc}
              alt={leadDigitalProject.imageAlt}
              width={leadDigitalProject.imageWidth}
              height={leadDigitalProject.imageHeight}
              className="h-auto w-full object-cover"
              sizes="(min-width: 1024px) 60rem, (min-width: 768px) 90vw, 100vw"
            />
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-3 gap-y-3">
            {leadDigitalProject.tags.map((tag) => (
              <li key={tag}>
                <StudioTag>{tag}</StudioTag>
              </li>
            ))}
          </ul>
        </a>

        <div className="grid gap-8 lg:grid-cols-2">
          <a
            href={platform.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={platform.ariaLabel}
            className="group flex h-full min-w-0 cursor-pointer flex-col rounded-3xl border border-studio-border bg-studio-surface p-7 transition hover:border-white/30 hover:bg-studio-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base md:p-8"
          >
            <CardHeader
              label={platform.label}
              title={platform.title}
              actionLabel={platform.linkLabel}
              actionHref={platform.href}
            />
            <p className="mt-5 text-sm leading-relaxed text-studio-muted md:text-base lg:min-h-30">
              {platform.description}
            </p>
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-studio-border bg-studio-surface-soft lg:min-h-72">
              <Image
                src={platform.imageSrc}
                alt={platform.imageAlt}
                width={platform.imageWidth}
                height={platform.imageHeight}
                className="h-full w-full object-cover"
                sizes="(min-width: 1024px) 34rem, (min-width: 768px) 45vw, 100vw"
              />
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-3 gap-y-3">
              {platform.tags.map((tag) => (
                <li key={tag}>
                  <StudioTag>{tag}</StudioTag>
                </li>
              ))}
            </ul>
          </a>

          <article className="flex h-full min-w-0 flex-col rounded-3xl border border-studio-border bg-studio-surface p-7 md:p-8">
            <CardHeader
              label={workflows.label}
              title={workflows.title}
              actionLabel="Internal workflow"
            />
            <p className="mt-5 text-sm leading-relaxed text-studio-muted md:text-base lg:min-h-30">
              {workflows.description}
            </p>

            <figure
              className="mt-6 overflow-hidden rounded-2xl bg-[#f0ebe0] lg:min-h-72"
              role="img"
              aria-label="Anonymised workflow diagram showing administration moving from inboxes, spreadsheets and paper forms to structured workflows and clearer visibility"
            >
              <figcaption className="sr-only">
                Anonymised process diagram. Before: personal inboxes,
                spreadsheets, paper forms, manual reporting. Structured
                workflow: match-day forms, shared records, automated reminders,
                reporting flow. Clearer visibility: compliance status, club
                information, board reporting, volunteer handover.
              </figcaption>

              <div className="hidden sm:flex" aria-hidden="true">
                {[
                  {
                    label: "Before",
                    items: [
                      "Personal inboxes",
                      "Spreadsheets",
                      "Paper forms",
                      "Manual reporting",
                    ],
                  },
                  {
                    label: "Structured workflow",
                    items: [
                      "Match-day forms",
                      "Shared records",
                      "Automated reminders",
                      "Reporting flow",
                    ],
                  },
                  {
                    label: "Clearer visibility",
                    items: [
                      "Compliance status",
                      "Club information",
                      "Board reporting",
                      "Volunteer handover",
                    ],
                  },
                ].map((stage, idx) => (
                  <div key={stage.label} className="contents">
                    <div className="flex-1 px-5 py-6">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6b5f4a]">
                        {stage.label}
                      </p>
                      <ul className="mt-4 space-y-2.5">
                        {stage.items.map((item) => (
                          <li
                            key={item}
                            className="text-[0.83rem] leading-snug text-[#3a3228]"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {idx < 2 ? (
                      <div className="flex items-center justify-center px-1">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 28 28"
                          fill="none"
                          aria-hidden="true"
                        >
                          <line
                            x1="2"
                            y1="14"
                            x2="22"
                            y2="14"
                            stroke="#b0a090"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <polyline
                            points="17,9 23,14 17,19"
                            stroke="#b0a090"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </svg>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:hidden" aria-hidden="true">
                {[
                  {
                    label: "Before",
                    items: [
                      "Personal inboxes",
                      "Spreadsheets",
                      "Paper forms",
                      "Manual reporting",
                    ],
                  },
                  {
                    label: "Structured workflow",
                    items: [
                      "Match-day forms",
                      "Shared records",
                      "Automated reminders",
                      "Reporting flow",
                    ],
                  },
                  {
                    label: "Clearer visibility",
                    items: [
                      "Compliance status",
                      "Club information",
                      "Board reporting",
                      "Volunteer handover",
                    ],
                  },
                ].map((stage, idx) => (
                  <div key={stage.label}>
                    <div className="px-5 pt-5 pb-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#6b5f4a]">
                        {stage.label}
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        {stage.items.map((item) => (
                          <li
                            key={item}
                            className="text-[0.83rem] leading-snug text-[#3a3228]"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {idx < 2 ? (
                      <div className="flex items-center justify-center py-1">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 28 28"
                          fill="none"
                          aria-hidden="true"
                        >
                          <line
                            x1="14"
                            y1="2"
                            x2="14"
                            y2="22"
                            stroke="#b0a090"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <polyline
                            points="9,17 14,23 19,17"
                            stroke="#b0a090"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </svg>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </figure>

            <ul className="mt-7 flex flex-wrap gap-x-3 gap-y-3">
              {workflows.tags.map((tag) => (
                <li key={tag}>
                  <StudioTag>{tag}</StudioTag>
                </li>
              ))}
            </ul>
          </article>

          <a
            href={coaching.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={coaching.ariaLabel}
            className="group flex min-w-0 flex-col rounded-3xl border border-studio-border bg-studio-surface p-7 transition hover:border-white/30 hover:bg-studio-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base md:p-8 lg:col-span-2"
          >
            <CardHeader
              label={coaching.label}
              title={coaching.title}
              actionLabel={coaching.linkLabel}
              actionHref={coaching.href}
            />
            <p className="mt-5 max-w-[86ch] text-sm leading-relaxed text-studio-muted md:text-base">
              {coaching.description}
            </p>
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-studio-border bg-studio-surface-soft">
              {coaching.imageSrc ? (
                <Image
                  src={coaching.imageSrc}
                  alt={coaching.imageAlt ?? coaching.title}
                  width={coaching.imageWidth ?? 1280}
                  height={coaching.imageHeight ?? 720}
                  className="h-auto w-full object-cover"
                  sizes="(min-width: 1024px) 60rem, (min-width: 768px) 90vw, 100vw"
                />
              ) : null}
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-3 gap-y-3">
              {coaching.tags.map((tag) => (
                <li key={tag}>
                  <StudioTag>{tag}</StudioTag>
                </li>
              ))}
            </ul>
          </a>
        </div>
      </div>
    </section>
  );
}
