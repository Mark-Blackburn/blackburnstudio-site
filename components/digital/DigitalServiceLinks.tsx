import Link from "next/link";

type DigitalServiceLink = {
  label: string;
  href: string;
};

const DIGITAL_SERVICE_LINKS: DigitalServiceLink[] = [
  { label: "Websites", href: "/digital/websites" },
  { label: "Domains & hosting", href: "/digital/hosting-domains" },
  { label: "Microsoft 365", href: "/digital/microsoft-365" },
  { label: "Ongoing support", href: "/digital/support" },
];

type DigitalServicesSubnavProps = {
  currentPath?: string;
  className?: string;
};

type RelatedDigitalServicesProps = {
  currentPath: string;
  relatedHrefs: string[];
  className?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getServiceByHref(href: string) {
  return DIGITAL_SERVICE_LINKS.find((service) => service.href === href);
}

export function DigitalServicesSubnav({
  currentPath,
  className,
}: DigitalServicesSubnavProps) {
  return (
    <nav
      aria-label="Explore digital services"
      className={joinClasses("w-full", className)}
    >
      <p className="text-xs uppercase tracking-[0.16em] text-studio-dim">
        Explore digital services
      </p>
      <ul className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-3 md:mt-5 md:gap-x-3 md:gap-y-3.5">
        {DIGITAL_SERVICE_LINKS.map((service) => {
          const isActive = currentPath === service.href;

          return (
            <li key={service.href}>
              <Link
                href={service.href}
                aria-current={isActive ? "page" : undefined}
                className={joinClasses(
                  "inline-flex min-h-10 items-center rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-text focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base",
                  isActive
                    ? "border-studio-text bg-studio-surface text-studio-text hover:border-studio-text hover:bg-studio-surface"
                    : "border-studio-border bg-studio-surface-soft/80 text-studio-muted hover:border-studio-border/90 hover:bg-studio-surface hover:text-studio-text",
                )}
              >
                {service.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function RelatedDigitalServices({
  currentPath,
  relatedHrefs,
  className,
}: RelatedDigitalServicesProps) {
  const relatedServices = relatedHrefs
    .filter((href) => href !== currentPath)
    .map(getServiceByHref)
    .filter((service): service is DigitalServiceLink => Boolean(service));

  if (relatedServices.length === 0) {
    return null;
  }

  return (
    <section aria-label="Related services" className={joinClasses(className)}>
      <h2 className="text-2xl font-medium tracking-tight text-studio-text md:text-3xl">
        Related services
      </h2>
      <ul className="mt-5 flex flex-wrap gap-x-3 gap-y-3 md:gap-x-6">
        {relatedServices.map((service) => (
          <li key={service.href}>
            <Link
              href={service.href}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-studio-border bg-studio-surface-soft/80 px-3 py-2 text-sm text-studio-muted transition-colors hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-text focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base md:rounded-none md:border-0 md:border-b md:border-transparent md:bg-transparent md:px-0 md:py-1"
            >
              {service.label}
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
