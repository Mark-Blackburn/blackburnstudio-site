import type { Metadata } from "next";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import PdfReducerApp from "@/components/tools/PdfReducerApp";

export const metadata: Metadata = {
  title: "Reduce a PDF",
  description:
    "Reduce PDF file size locally in your browser while your document stays on your device.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PdfReducerAppPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="tools-light-theme w-full flex-1 bg-studio-base text-studio-muted">
        <div className="mx-auto w-full max-w-280 px-5 pt-16 sm:px-6 md:px-8 md:pt-24">
          <PdfReducerApp />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
