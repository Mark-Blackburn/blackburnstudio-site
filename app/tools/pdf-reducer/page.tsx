import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton, StudioTag } from "@/components/studio";
import { createPageMetadata } from "@/lib/siteConfig";

export const metadata = createPageMetadata({
  title: "PDF Reducer",
  description:
    "Reduce PDF file size directly in your browser. Optimize PDF structure or reduce oversized images while your document stays on your device.",
  path: "/tools/pdf-reducer",
});

const modes = [
  {
    eyebrow: "Optimize",
    title: "Optimize",
    copy: "Reduces PDF overhead without deliberately lowering image quality.",
    usefulFor:
      "Documents that are already reasonably optimized, or where image quality should not deliberately be reduced.",
  },
  {
    eyebrow: "Reduce images",
    title: "Reduce images",
    copy: "Reduces oversized and high-quality images to make photo and scanned PDFs smaller while keeping text, links and other PDF content intact.",
    usefulFor:
      "Photo-heavy documents, scans and PDFs containing images larger than they need to be.",
  },
];

export default function PdfReducerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="tools-light-theme w-full flex-1 bg-studio-base text-studio-muted">
        <div className="mx-auto w-full max-w-312 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
          <section aria-labelledby="pdf-reducer-heading" className="max-w-[78ch]">
            <SectionEyebrow className="text-[#765d34]">PDF Reducer</SectionEyebrow>
            <h1
              id="pdf-reducer-heading"
              className="mt-4 max-w-[19ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
            >
              Make PDFs smaller in your browser
            </h1>
            <p className="mt-7 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
              Reduce PDF file size directly in your browser. Choose structural optimization or
              reduce oversized images for a larger saving.
            </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <StudioTag>Browser tool</StudioTag>
            <StudioTag>Local processing</StudioTag>
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <StudioButton
              href="/tools/pdf-reducer/app"
              variant="primary"
              className="!bg-[#111111] !text-[#f4f1eb] hover:!bg-[#2a2824] focus-visible:!ring-black/60 focus-visible:!ring-offset-[#f4f1eb]"
            >
              Reduce a PDF
            </StudioButton>
            <StudioButton
              href="/tools"
              variant="secondary"
              className="border-black/20 text-studio-text hover:border-black/45 hover:text-black focus-visible:ring-black/60 focus-visible:ring-offset-[#f4f1eb]"
            >
              Back to tools
            </StudioButton>
          </div>
          <p className="mt-4 text-sm text-studio-dim">
            Processed locally in your browser. Your PDF is not sent to Blackburn Studio.
          </p>
          </section>

          <section aria-labelledby="modes-heading" className="mt-14 md:mt-16">
          <SectionEyebrow className="text-[#765d34]">Two reduction modes</SectionEyebrow>
          <h2
            id="modes-heading"
            className="mt-3 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Choose the right balance for your document
          </h2>
          <div className="mt-9 grid gap-6 md:grid-cols-2">
            {modes.map((mode) => (
              <article
                key={mode.title}
                className="rounded-2xl border border-studio-border bg-studio-surface p-7 shadow-[0_18px_50px_rgba(17,17,17,0.04)] md:p-9"
              >
                <SectionEyebrow className="text-[#765d34]">{mode.eyebrow}</SectionEyebrow>
                <h3 className="mt-3 text-2xl font-medium tracking-tight text-studio-text md:text-3xl">
                  {mode.title}
                </h3>
                <p className="mt-5 text-base leading-relaxed text-studio-muted">{mode.copy}</p>
                {mode.title === "Reduce images" ? (
                  <p className="mt-4 text-sm leading-relaxed text-studio-dim">
                    Fine detail may soften slightly. Images that can&apos;t be changed safely are
                    left untouched.
                  </p>
                ) : null}
                <div className="mt-6 border-t border-studio-border/60 pt-6">
                  <h4 className="text-sm font-medium text-studio-text">Useful for</h4>
                  <p className="mt-2 text-sm leading-relaxed text-studio-muted">
                    {mode.usefulFor}
                  </p>
                </div>
              </article>
            ))}
          </div>
          </section>

          <section
            aria-labelledby="final-cta-heading"
            className="tools-dark-workspace mt-20 rounded-3xl border border-studio-border bg-studio-base px-7 py-10 md:mt-24 md:px-11 md:py-12"
          >
          <SectionEyebrow>Ready when you are</SectionEyebrow>
          <h2
            id="final-cta-heading"
            className="mt-3 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Reduce a PDF in your browser
          </h2>
          <div className="mt-8">
            <StudioButton href="/tools/pdf-reducer/app" variant="primary">
              Reduce a PDF
            </StudioButton>
          </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
