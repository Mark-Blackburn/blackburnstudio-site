import Image from "next/image";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton, StudioTag } from "@/components/studio";
import { createPageMetadata } from "@/lib/siteConfig";
import qrCodeGeneratorApp from "@/public/tools/qr-code-generator/qr-code-generator-app.webp";

export const metadata = createPageMetadata({
  title: "Free QR Code Generator",
  description:
    "Create static QR codes for URLs or text and download them as PNG or SVG. QR codes are generated locally in your browser.",
  path: "/tools/qr-code-generator",
});

const workflowTags = [
  "Static QR codes",
  "PNG & SVG",
  "Custom colours",
  "Local generation",
];

const benefits = [
  "Encode a URL or arbitrary text.",
  "Choose foreground and background colours.",
  "Set error correction and a scan-friendly quiet zone.",
  "Download raster PNG or vector SVG.",
  "Generate without an account or upload.",
];

export default function QrCodeGeneratorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="tools-light-theme w-full flex-1 bg-studio-base text-studio-muted">
        <div className="mx-auto w-full max-w-312 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section
          aria-labelledby="qr-generator-heading"
          className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:gap-12"
        >
          <div>
            <SectionEyebrow className="text-[#765d34]">Blackburn Studio Tools</SectionEyebrow>
            <h1
              id="qr-generator-heading"
              className="mt-4 max-w-[21ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-5xl"
            >
              Create clear, dependable QR codes in your browser
            </h1>
            <p className="mt-6 max-w-[62ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              Generate a static QR code for a website, form or any text,
              customise its colours and download it as PNG or SVG. Nothing is
              uploaded and no account is required.
            </p>
            <aside className="mt-5 max-w-[62ch] border-l border-studio-border pl-4 text-sm leading-relaxed text-studio-muted">
              <h2 className="font-medium text-studio-text">Static QR code</h2>
              <p className="mt-1.5">
                The destination is stored directly in the QR code. It will
                continue to work without Blackburn Studio, but the destination
                cannot be changed after the QR code has been created.
              </p>
            </aside>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {workflowTags.map((tag) => (
                <StudioTag key={tag}>{tag}</StudioTag>
              ))}
            </div>
            <div className="mt-7">
              <StudioButton
                href="/tools/qr-code-generator/app"
                variant="primary"
                className="!bg-[#111111] !text-[#f4f1eb] hover:!bg-[#2a2824] focus-visible:!ring-black/60 focus-visible:!ring-offset-[#f4f1eb]"
              >
                Launch QR Generator
              </StudioButton>
            </div>
          </div>
          <div className="lg:pl-1">
            <Image
              src={qrCodeGeneratorApp}
              alt="Blackburn Studio QR Code Generator interface showing controls and QR preview"
              sizes="(min-width: 1024px) 42vw, calc(100vw - 3rem)"
              className="h-auto w-full rounded-2xl border border-black/25 shadow-[0_1px_2px_rgba(17,17,17,0.1),0_8px_20px_rgba(17,17,17,0.13)]"
              preload
            />
          </div>
        </section>

        <section
          aria-label="QR Code Generator details"
          className="mt-14 grid gap-6 md:mt-16 lg:grid-cols-2"
        >
          <article className="rounded-2xl border border-studio-border bg-studio-surface p-7 shadow-[0_18px_50px_rgba(17,17,17,0.04)] md:p-9">
            <SectionEyebrow className="text-[#765d34]">Capabilities</SectionEyebrow>
            <h2
              id="qr-benefits-heading"
              className="mt-3 max-w-[25ch] text-3xl font-medium tracking-tight text-studio-text"
            >
              Simple controls, files you can use anywhere
            </h2>
            <ul className="mt-7 space-y-4 text-sm leading-relaxed text-studio-muted md:text-base">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3">
                  <span
                    className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9955a]"
                    aria-hidden="true"
                  />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-studio-border bg-studio-surface p-7 shadow-[0_18px_50px_rgba(17,17,17,0.04)] md:p-9">
            <SectionEyebrow className="text-[#765d34]">Privacy</SectionEyebrow>
            <h2
              id="qr-privacy-heading"
              className="mt-3 max-w-[22ch] text-3xl font-medium tracking-tight text-studio-text"
            >
              Your content stays in your browser
            </h2>
            <p className="mt-7 max-w-[56ch] text-base leading-relaxed text-studio-muted">
              QR codes are generated locally on your device. The URL or text you
              enter is not uploaded to Blackburn Studio or sent to a QR
              management service.
            </p>
            <p className="mt-6 border-t border-studio-border/60 pt-6 text-sm leading-relaxed text-studio-dim">
              No account, QR management service or redirect is required.
            </p>
          </article>
        </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}