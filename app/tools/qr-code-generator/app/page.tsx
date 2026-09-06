import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import QrCodeGeneratorApp from "@/components/tools/QrCodeGeneratorApp";
import { createPageMetadata } from "@/lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Online QR Code Generator",
  description:
    "Create and download static QR codes for URLs or text. Everything is generated locally in your browser.",
  path: "/tools/qr-code-generator/app",
});

export default function OnlineQrCodeGeneratorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="tools-light-theme w-full flex-1 bg-studio-base text-studio-muted">
        <div className="mx-auto w-full max-w-280 px-5 pt-16 pb-24 sm:px-6 md:px-8 md:pt-24 md:pb-32">
          <QrCodeGeneratorApp />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}