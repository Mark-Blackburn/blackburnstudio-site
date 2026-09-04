import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton, StudioTag } from "@/components/studio";
import { createPageMetadata } from "@/lib/siteConfig";

export const metadata = createPageMetadata({
  title: "PDF Reducer",
  description:
    "Reduce PDF file size directly in your browser. Optimise PDF structure or reduce oversized images without uploading your document.",
  path: "/tools/pdf-reducer",
});

const modes = [
  {
    eyebrow: "Optimize",
    title: "Optimize",
    copy: "Reduces PDF overhead without deliberately lowering image quality.",
    usefulFor:
      "Documents that are already reasonably optimised, or where image quality should not deliberately be reduced.",
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

      <main className="mx-auto w-full max-w-312 flex-1 px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <section aria-labelledby="pdf-reducer-heading" className="max-w-[78ch]">
          <SectionEyebrow>PDF Reducer</SectionEyebrow>
          <h1
            id="pdf-reducer-heading"
            className="mt-4 max-w-[19ch] text-4xl font-medium leading-[1.08] tracking-tight text-studio-text md:text-6xl"
          >
            Make PDFs smaller without uploading them
          </h1>
          <p className="mt-7 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Reduce PDF file size directly in your browser. Choose structural optimisation or
            reduce oversized images for a larger saving.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <StudioTag>Browser tool</StudioTag>
            <StudioTag>Local processing</StudioTag>
            <StudioTag>No upload</StudioTag>
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <StudioButton href="/tools/pdf-reducer/app" variant="primary">
              Reduce a PDF
            </StudioButton>
            <StudioButton href="/tools" variant="secondary">
              Back to tools
            </StudioButton>
          </div>
          <p className="mt-4 text-sm text-studio-dim">Your PDF stays on your device.</p>
        </section>

        <section aria-labelledby="modes-heading" className="mt-20 md:mt-24">
          <SectionEyebrow>Two reduction modes</SectionEyebrow>
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
                className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-7 md:p-9"
              >
                <SectionEyebrow>{mode.eyebrow}</SectionEyebrow>
                <h3 className="mt-3 text-2xl font-medium tracking-tight text-studio-text md:text-3xl">
                  {mode.title}
                </h3>
                <p className="mt-5 text-base leading-relaxed text-studio-muted">{mode.copy}</p>
                <div className="mt-6 border-t border-studio-border/60 pt-6">
                  <h4 className="text-sm font-medium text-studio-text">Useful for</h4>
                  <p className="mt-2 text-sm leading-relaxed text-studio-muted">
                    {mode.usefulFor}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-5 max-w-[78ch] text-sm leading-relaxed text-studio-dim">
            Image reduction can soften fine detail. Images and formats that cannot be changed
            safely are left untouched.
          </p>
        </section>

        <section
          aria-labelledby="privacy-heading"
          className="mt-20 rounded-3xl border border-studio-border bg-studio-surface px-7 py-10 md:mt-24 md:px-11 md:py-12"
        >
          <SectionEyebrow>Privacy</SectionEyebrow>
          <h2
            id="privacy-heading"
            className="mt-3 max-w-[24ch] text-3xl font-medium tracking-tight text-studio-text md:text-4xl"
          >
            Your PDF is processed locally in your browser
          </h2>
          <div className="mt-6 grid gap-4 text-base leading-relaxed text-studio-muted md:grid-cols-3 md:gap-8">
            <p>The file is not uploaded to Blackburn Studio for processing.</p>
            <p>Document contents and filenames are not sent to a server for processing.</p>
            <p>Processing stops if you cancel or close the page.</p>
          </div>
          <div className="mt-8">
            <StudioButton href="/tools/pdf-reducer/app" variant="primary">
              Reduce a PDF
            </StudioButton>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
