import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";
import ToolCard from "@/components/tools/ToolCard";
import { createPageMetadata } from "@/lib/siteConfig";
import imageResizerApp from "@/public/tools/image-resizer/image-resizer-app.webp";
import qrCodeGeneratorApp from "@/public/tools/qr-code-generator/qr-code-generator-app.webp";

export const metadata = createPageMetadata({
  title: "Tools",
  description:
    "Practical free tools from Blackburn Studio for working with websites, images and digital content.",
  path: "/tools",
});

const imageResizerFeatures = [
  "Batch resizing",
  "Crop & aspect ratios",
  "Text & logo watermarks",
  "Website & ecommerce presets",
  "JPEG, WebP & PNG",
  "Local browser processing",
];

const qrCodeGeneratorFeatures = [
  "PNG & SVG downloads",
  "Custom foreground & background",
  "Error correction controls",
  "Local browser generation",
];

export default function ToolsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-312 flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-20 md:pb-32">
        <section aria-labelledby="tools-heading" className="max-w-[76ch]">
          <SectionEyebrow>Blackburn Studio Tools</SectionEyebrow>
          <h1
            id="tools-heading"
            className="mt-4 max-w-[23ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
          >
            Practical tools for better digital work
          </h1>
          <p className="mt-7 max-w-[68ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Free, focused utilities for preparing website content and handling
            common digital tasks. Each tool is built to solve a practical
            problem without adding unnecessary complexity.
          </p>
        </section>

        <section
          id="available-tools"
          aria-labelledby="available-tools-heading"
          className="mt-14 scroll-mt-28 md:mt-16 md:scroll-mt-32"
        >
          <SectionEyebrow>Available now</SectionEyebrow>
          <h2
            id="available-tools-heading"
            className="mt-3 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Tools built around real digital workflows
          </h2>
          <div className="mt-10 grid max-w-6xl gap-6 lg:grid-cols-2 lg:items-stretch">
            <ToolCard
              title="Web Image Resizer"
              summary="Resize, crop and watermark single images or batches directly in your browser, with consistent filenames, metadata and ZIP downloads. Processing happens locally on your device, or use the Windows application for a dedicated desktop workflow."
              href="/tools/image-resizer"
              ctaLabel="View Image Resizer"
              imageSrc={imageResizerApp}
              imageAlt="Blackburn Studio Web Image Resizer showing batch image sizing, output dimensions and metadata options"
              features={imageResizerFeatures}
              platform="Browser + Windows"
              availability="Free tool"
            />
            <ToolCard
              title="QR Code Generator"
              summary="Create static QR codes for websites, forms, signage and print. Customise the colours and download PNG or SVG files, with everything generated locally in your browser."
              href="/tools/qr-code-generator"
              ctaLabel="View QR Code Generator"
              imageSrc={qrCodeGeneratorApp}
              imageAlt="Blackburn Studio QR Code Generator interface showing controls and QR preview"
              features={qrCodeGeneratorFeatures}
              platform="Browser"
              availability="Free tool"
            />
          </div>
        </section>

        <section
          aria-labelledby="tools-contact-heading"
          className="mt-24 max-w-264 rounded-3xl border border-studio-border bg-studio-surface px-7 py-11 md:mt-28 md:px-11 md:py-13"
        >
          <h2
            id="tools-contact-heading"
            className="max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Need help with a digital workflow?
          </h2>
          <p className="mt-5 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Blackburn Studio also helps businesses and organisations improve
            websites, content systems and the processes around them.
          </p>
          <div className="mt-8">
            <StudioButton href="/contact" variant="primary">
              Start a conversation
            </StudioButton>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}