import Link from "next/link";
import { domainManagementUrl } from "@/lib/domainManagement";

export default function SiteFooter() {
  const domainManagementHref = domainManagementUrl ?? undefined;
  const hasDomainManagement = typeof domainManagementHref === "string";

  return (
    <footer className="mt-auto border-t border-studio-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-8">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm uppercase tracking-[0.16em] text-studio-dim">
          <span className="tracking-[0.3em] text-studio-muted">
            Blackburn Studio
          </span>
          <Link
            href="/work"
            className="transition-colors hover:text-studio-text"
          >
            Work
          </Link>
          <Link
            href="/digital"
            className="transition-colors hover:text-studio-text"
          >
            Digital
          </Link>
          <Link
            href="/about"
            className="transition-colors hover:text-studio-text"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="transition-colors hover:text-studio-text"
          >
            Contact
          </Link>
          {hasDomainManagement ? (
            <a
              href={domainManagementHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Domain management (opens in a new tab)"
              className="transition-colors hover:text-studio-text"
            >
              Domain management
            </a>
          ) : null}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 text-sm text-studio-dim md:flex-row md:items-center">
          <a
            href="mailto:hello@theblackburn.studio"
            className="transition-colors hover:text-studio-muted"
          >
            hello@theblackburn.studio
          </a>
          <span>
            &copy; {new Date().getFullYear()} Blackburn Studio. All rights
            reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
