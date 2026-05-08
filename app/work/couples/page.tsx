import Link from "next/link";

import CouplesGrid from "./CouplesGrid";
import { getImagesWithBlur, type ImageSource } from "../../../lib/getImagesWithBlur";

export const metadata = {
  title: "Couples — Blackburn Studio",
};

// Sequence preserved exactly — curated for emotional pacing and editorial rhythm.
const couplesSources: ImageSource[] = [
  { id: 1, file: "couples-flower-moment.jpg", alt: "Couple sharing a quiet moment while examining a flower" },
  { id: 2, file: "couples-with-dog.jpg", alt: "Couple seated outdoors with their dog in natural light" },
  { id: 3, file: "couples-waterfall-portrait.jpg", alt: "Couple portrait beside a waterfall" },
  { id: 4, file: "couples-silhouette-kiss.jpg", alt: "Silhouetted couple embracing outdoors at sunset" },
  { id: 5, file: "couples-seated-grass.jpg", alt: "Couple seated together on grass in warm evening light" },
];

export default async function CouplesPage() {
  const images = await getImagesWithBlur("couples", couplesSources);
  return (
    <div className="flex min-h-screen flex-col bg-black text-neutral-300">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8">
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-300 transition-colors hover:text-white"
        >
          Blackburn Studio
        </Link>
        <nav className="hidden gap-8 text-sm text-neutral-400 md:flex">
          <Link href="/work" className="transition-colors hover:text-white">
            Work
          </Link>
          <Link href="/#about" className="transition-colors hover:text-white">
            About
          </Link>
          <Link href="/#contact" className="transition-colors hover:text-white">
            Contact
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-12 pb-24 md:px-8 md:pt-20 md:pb-32">
        <section>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
                Work
              </p>
              <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight text-white md:text-6xl">
                Couples
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-neutral-400 md:text-base">
              Quiet relationship portraits focused on connection, presence and
              natural interaction.
            </p>
          </div>

          <div className="mt-12 md:mt-16">
            <CouplesGrid images={images} />
          </div>
        </section>

        <div className="mt-20 flex justify-center">
          <Link
            href="/work"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
          >
            ← Back to work
          </Link>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-10 md:px-8">
        <div className="flex flex-col items-center justify-between gap-4 text-xs text-neutral-500 md:flex-row">
          <span className="uppercase tracking-[0.3em]">Blackburn Studio</span>
          <span>
            &copy; {new Date().getFullYear()} Blackburn Studio. All rights
            reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
