import Link from "next/link";
import PortraitsGrid from "./PortraitsGrid";
import { getImagesWithBlur } from "../../../lib/getImagesWithBlur";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata = {
  title: "Portraits — Blackburn Studio",
};

export default async function PortraitsPage() {
  const images = await getImagesWithBlur();
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-12 pb-24 md:px-8 md:pt-20 md:pb-32">
        <section>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
                Primary
              </p>
              <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight text-studio-text md:text-6xl">
                Portraits
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-studio-dim md:text-base">
              Quiet, considered portraiture. Natural light, real expression,
              and a sense of presence in every frame.
            </p>
          </div>

          <div className="mt-12 md:mt-16">
            <PortraitsGrid images={images} />
          </div>
        </section>

        <div className="mt-20 flex justify-center">
          <Link
            href="/work"
            className="inline-flex items-center justify-center rounded-full border border-studio-border px-5 py-2 text-sm font-medium text-studio-muted transition hover:border-white/35 hover:text-studio-text"
          >
            ← Back to work
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
