import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";
import ToolCard from "@/components/tools/ToolCard";
import { createPageMetadata } from "@/lib/siteConfig";
import imageResizerApp from "@/public/tools/image-resizer/image-resizer-app.webp";

export const metadata = createPageMetadata({
  title: "Tools",
  description:
    "Practical free tools from Blackburn Studio for working with websites, images and digital content.",
  path: "/tools",
});

const imageResizerFeatures = [
  "Batch resizing",
  "Website and ecommerce presets",
  "Custom dimensions",
  "JPEG, WebP and PNG",
  "Metadata support",
  "Local processing",
];

export default function ToolsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-312 flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
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
          <div className="mt-9">
            <StudioButton href="#available-tools" variant="secondary">
              Explore available tools
            </StudioButton>
          </div>
        </section>

        <section
          id="available-tools"
          aria-labelledby="available-tools-heading"
          className="mt-20 scroll-mt-28 md:mt-24 md:scroll-mt-32"
        >
          <SectionEyebrow>Available now</SectionEyebrow>
          <h2
            id="available-tools-heading"
            className="mt-3 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Tools built around real digital workflows
          </h2>
          <div className="mt-10 grid max-w-3xl gap-6">
            <ToolCard
              title="Web Image Resizer"
              summary="Batch resize and prepare images for websites and online stores with web-friendly sizing, filenames and metadata."
              href="/tools/image-resizer"
              ctaLabel="View Image Resizer"
              imageSrc={imageResizerApp}
              imageAlt="Blackburn Studio Web Image Resizer showing batch image sizing, output dimensions and metadata options"
              features={imageResizerFeatures}
              platform="Windows"
              availability="Free download"
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