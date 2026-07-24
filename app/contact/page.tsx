import type { Metadata } from "next";

import ContactEnquiryForm from "@/components/site/ContactEnquiryForm";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow } from "@/components/studio";
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
            Website, photography, domain, hosting, Microsoft 365 and ongoing
            support enquiries are welcome. Share a few details and I&apos;ll
            come back to you with the most useful next step.
          </p>
          <ContactEnquiryForm />
          <p className="mt-6 text-sm leading-relaxed text-studio-dim md:text-base">
            Prefer email? Contact{" "}
            <a
              href="mailto:hello@theblackburn.studio"
              className="text-studio-muted underline decoration-white/30 underline-offset-4 transition hover:text-studio-text"
            >
              hello@theblackburn.studio
            </a>{" "}
            directly.
          </p>
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
