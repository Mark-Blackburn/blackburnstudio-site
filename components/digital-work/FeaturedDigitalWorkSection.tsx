import Link from "next/link";

import { SectionEyebrow } from "@/components/studio";

import { featuredDigitalWorkProjects } from "./data";

type FeaturedDigitalWorkSectionProps = {
  id?: string;
  className?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function FeaturedDigitalWorkSection({ id, className }: FeaturedDigitalWorkSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby="featured-digital-work-heading"
      className={joinClasses("scroll-mt-28 md:scroll-mt-32", className)}
    >
      <SectionEyebrow>Selected work</SectionEyebrow>
      <h2
        id="featured-digital-work-heading"
        className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
      >
        See how the services come together
      </h2>
      <p className="mt-6 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
        A selection of website, workflow and platform work delivered across commercial,
        community and internal projects.
      </p>

      <div className="mt-9 grid gap-5 md:grid-cols-3 md:gap-6">
        {featuredDigitalWorkProjects.map((project) => (
          <article
            key={project.id}
            className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-7"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{project.label}</p>
            <h3 className="mt-3 text-2xl font-medium tracking-tight text-studio-text">{project.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-studio-muted md:text-base">
              {project.description}
            </p>
            {project.href ? (
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={project.ariaLabel}
                className="mt-5 inline-flex items-center gap-1.5 text-sm text-studio-muted transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
              >
                {project.linkLabel}
                <span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </article>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/work#digital-work"
          className="inline-flex items-center gap-1.5 text-sm text-studio-muted transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
        >
          View all digital work
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
