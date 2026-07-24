import type { Metadata } from "next";

import ContactEnquiryForm from "@/components/site/ContactEnquiryForm";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";
import { domainManagementUrl } from "@/lib/domainManagement";

export const metadata: Metadata = {
  title: "Contact — Blackburn Studio",
  description:
    "Get in touch about websites, domains, hosting, Microsoft 365, photography or ongoing support.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section className="max-w-3xl" aria-labelledby="contact-heading">
          <SectionEyebrow>Contact</SectionEyebrow>
          <h1
            id="contact-heading"
            className="mt-4 text-4xl font-medium leading-[1.1] tracking-tight text-studio-text md:text-5xl"
          >
            Tell me what you&apos;re working on.
          </h1>
          <p className="mt-6 text-[0.98rem] leading-relaxed text-studio-muted md:text-[1.02rem]">
            Website, hosting, Microsoft 365 and photography enquiries are
            welcome. Send through a few details and I&apos;ll come back to you.
          </p>
          <div className="mt-8">
            <StudioButton
              href="mailto:hello@theblackburn.studio"
              variant="primary"
            >
              hello@theblackburn.studio
            </StudioButton>
          </div>
          <div className="mt-8 max-w-xl rounded-2xl border border-studio-border/70 bg-studio-surface/65 px-5 py-5">
            <h2 className="text-base font-medium text-studio-text">
              What to include
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-studio-dim">
              <li>What you need help with</li>
              <li>Where things are up to now</li>
              <li>Any timing, location or deadline</li>
            </ul>
          </div>
          <ContactEnquiryForm />
          {domainManagementUrl ? (
            <p className="mt-4 text-sm leading-relaxed text-studio-dim">
              Need to manage a domain registered through Blackburn Studio?{" "}
              <a
                href={domainManagementUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Access domain management (opens in a new tab)"
                className="text-studio-muted underline decoration-white/30 underline-offset-4 transition hover:text-studio-text"
              >
                Access domain management
              </a>
              .
            </p>
          ) : null}
          <p className="mt-5 text-sm leading-relaxed text-studio-dim">
            Based in Gisborne, working with clients across Victoria.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
