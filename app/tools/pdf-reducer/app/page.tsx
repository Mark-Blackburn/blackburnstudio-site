import type { Metadata } from "next";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import PdfReducerApp from "@/components/tools/PdfReducerApp";

export const metadata: Metadata = {
  title: "Reduce a PDF",
  description:
    "Reduce PDF file size locally in your browser without uploading your document.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PdfReducerAppPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-280 flex-1 px-6 pt-16 md:px-8 md:pt-24">
        <PdfReducerApp />
      </main>

      <SiteFooter />
    </div>
  );
}
