import PortraitsGrid from "./PortraitsGrid";
import Link from "next/link";
import { getImagesWithBlur } from "../../../lib/getImagesWithBlur";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata = {
  title: "Portraits — Blackburn Studio",
  description:
    "Portrait photography focused on expression, natural light and presence.",
};

export default async function PortraitsPage() {
  const images = await getImagesWithBlur();
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-12 pb-24 md:px-8 md:pt-20 md:pb-32">
        <section>
          <Link
            href="/work"
            className="mb-5 inline-flex items-center text-[13px] text-studio-dim transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
          >
            ← Back to work
          </Link>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <div>
              <SectionEyebrow>PORTRAITS</SectionEyebrow>
              <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight text-studio-text md:text-6xl">
                Portraits
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-studio-dim md:text-base">
              Portrait photography focused on expression, natural light and
              presence.
            </p>
          </div>

          <div className="mt-12 md:mt-16">
            <PortraitsGrid images={images} />
          </div>
        </section>

        <div className="mt-20 flex justify-center">
          <StudioButton
            href="/work"
            variant="secondary"
            className="rounded-full"
          >
            ← Back to work
          </StudioButton>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
