import Image from "next/image";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton, StudioTag } from "@/components/studio";
import ImageResizerRelease from "@/components/tools/ImageResizerRelease";
import { createPageMetadata } from "@/lib/siteConfig";
import imageResizerApp from "@/public/tools/image-resizer/image-resizer-app.webp";

export const metadata = createPageMetadata({
  title: "Web Image Resizer",
  description:
    "Use Blackburn Studio Web Image Resizer online or download it for Windows to resize and prepare images for websites and online stores.",
  path: "/tools/image-resizer",
});

const capabilities = [
  "Resize a complete folder of images in one batch",
  "Use practical website and ecommerce size presets",
  "Set custom width, height and fit options",
  "Export JPEG, WebP and PNG files",
  "Prepare clean, web-friendly filenames",
  "Retain or remove supported image metadata",
];

const workflowTags = [
  "Batch resizing",
  "Website presets",
  "Custom dimensions",
  "Local processing",
];

export default function ImageResizerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-312 flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section aria-labelledby="image-resizer-heading" className="max-w-[78ch]">
          <SectionEyebrow>Blackburn Studio Tools</SectionEyebrow>
          <h1
            id="image-resizer-heading"
            className="mt-4 max-w-[21ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
          >
            Prepare website images without the repetitive work
          </h1>
          <p className="mt-7 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Web Image Resizer is a free tool for resizing, cropping and
            watermarking images for websites and online stores. Process single
            images or batches, apply consistent sizing, filenames and metadata,
            and download completed files individually or as a ZIP. Image
            processing happens locally in your browser, or you can download the
            Windows application for a dedicated desktop workflow.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {workflowTags.map((tag) => (
              <StudioTag key={tag}>{tag}</StudioTag>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <StudioButton href="/tools/image-resizer/app" variant="primary">
              Use online
            </StudioButton>
            <StudioButton href="#download" variant="secondary">
              Download for Windows
            </StudioButton>
          </div>
        </section>

        <figure className="mt-16 overflow-hidden rounded-2xl border border-studio-border/70 bg-studio-surface/65 md:mt-20">
          <Image
            src={imageResizerApp}
            alt="Blackburn Studio Web Image Resizer showing batch image sizing, output dimensions and metadata options"
            sizes="(min-width: 1280px) 74rem, (min-width: 768px) calc(100vw - 4rem), calc(100vw - 3rem)"
            className="h-auto w-full"
          />
        </figure>

        <section
          aria-labelledby="capabilities-heading"
          className="mt-16 grid gap-8 md:mt-20 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] md:gap-12"
        >
          <div>
            <h2
              id="capabilities-heading"
              className="text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
            >
              Built for everyday image preparation
            </h2>
            <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              Process a set of source images once and create consistent output
              ready for content management systems, product catalogues and
              general website use.
            </p>
          </div>
          <ul className="space-y-4 text-sm leading-relaxed text-studio-muted md:pt-1 md:text-base">
            {capabilities.map((capability) => (
              <li key={capability} className="flex gap-3">
                <span
                  className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-studio-border"
                  aria-hidden="true"
                />
                <span>{capability}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="download"
          aria-labelledby="download-heading"
          className="mt-20 scroll-mt-28 md:mt-24 md:scroll-mt-32"
        >
          <h2 id="download-heading" className="sr-only">
            Download and release information
          </h2>
          <ImageResizerRelease />
        </section>

        <section
          aria-labelledby="installation-heading"
          className="mt-20 max-w-5xl md:mt-24"
        >
          <SectionEyebrow>Installation</SectionEyebrow>
          <h2
            id="installation-heading"
            className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Getting started on Windows
          </h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-3 md:gap-6">
            {[
              {
                title: "Download",
                text: "Choose the installer for the standard setup, or the portable file if you do not want to install the app.",
              },
              {
                title: "Open",
                text: "Run the downloaded file. If Windows displays a SmartScreen message for an unsigned release, review the publisher information before continuing.",
              },
              {
                title: "Process locally",
                text: "Select your source images, choose the output settings and resize them directly on your computer.",
              },
            ].map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 px-5 py-6 md:px-6"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-studio-dim">
                  Step {index + 1}
                </p>
                <h3 className="mt-3 text-xl font-medium tracking-tight text-studio-text">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-studio-muted">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="privacy-heading"
          className="mt-20 max-w-[74ch] md:mt-24"
        >
          <SectionEyebrow>Privacy</SectionEyebrow>
          <h2
            id="privacy-heading"
            className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Your images stay on your computer
          </h2>
          <p className="mt-6 text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Web Image Resizer performs image processing locally. Your source
            images and resized files are not uploaded to Blackburn Studio or a
            third-party image service.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}