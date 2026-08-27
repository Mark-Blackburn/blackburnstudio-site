import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import ImageResizerBatchApp from "@/components/tools/ImageResizerBatchApp";
import { createPageMetadata } from "@/lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Online Image Resizer",
  description:
    "Resize JPEG, PNG and WebP images locally in your browser with Blackburn Studio Web Image Resizer. Your images stay on your device.",
  path: "/tools/image-resizer/app",
});

export default function OnlineImageResizerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-280 flex-1 px-6 pt-16 md:px-8 md:pt-24">
        <ImageResizerBatchApp />
      </main>

      <SiteFooter />
    </div>
  );
}