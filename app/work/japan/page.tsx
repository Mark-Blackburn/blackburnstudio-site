import JapanGrid from "./JapanGrid";
import Link from "next/link";
import { getImagesWithBlur, type ImageSource } from "../../../lib/getImagesWithBlur";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata = {
  title: "Japan — Atmosphere & Memory — Blackburn Studio",
  description:
    "A personal landscape study of place, texture and memory in Japan.",
};

// Sequence preserved exactly — order is data-driven, independent of filenames.
const japanSources: ImageSource[] = [
  {
    id: 1,
    file: "floral-abstraction.jpg",
    alt: "Close-up abstract view of red flowers and branches in soft natural light",
  },
  {
    id: 2,
    file: "geisha-portrait.jpg",
    alt: "Portrait of a geisha in traditional attire illuminated by soft ambient light",
  },
  {
    id: 3,
    file: "black-texture.jpg",
    alt: "Dark textured abstract surface with layered organic detail",
  },
  {
    id: 4,
    file: "bridge-reflection.jpg",
    alt: "Red Japanese bridge reflected in calm garden water surrounded by greenery",
  },
  {
    id: 5,
    file: "pagoda.jpg",
    alt: "Traditional Japanese pagoda framed by trees and seasonal foliage",
  },
  {
    id: 6,
    file: "red-doorway.jpg",
    alt: "Red temple doorway and corridor detail in soft natural light",
  },
  {
    id: 7,
    file: "shrine-fire.jpg",
    alt: "Smoke and fire rising through a Japanese shrine during a ceremonial moment",
  },
  {
    id: 8,
    file: "elderly-man.jpg",
    alt: "Portrait of an elderly Japanese man in natural outdoor light",
  },
  {
    id: 9,
    file: "kimono-pair.jpg",
    alt: "Two women in traditional kimono walking together in Japan",
  },
  {
    id: 10,
    file: "kobe-tower-night.jpg",
    alt: "Kobe tower illuminated at night against the city skyline",
  },
  {
    id: 11,
    file: "garden-reflection.jpg",
    alt: "Woman in red standing beside a reflective Japanese garden beneath large trees",
  },
  {
    id: 12,
    file: "rope-ornaments.jpg",
    alt: "Traditional Japanese rope ornaments hanging in soft natural light",
  },
  {
    id: 13,
    file: "tree-trunk.jpg",
    alt: "Large textured tree trunk and branches in a quiet natural setting",
  },
  {
    id: 14,
    file: "pottery-detail.jpg",
    alt: "Close-up detail of traditional Japanese pottery and ceramic textures",
  },
];

export default async function JapanPage() {
  const images = await getImagesWithBlur("japan", japanSources);
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
              <SectionEyebrow>Work</SectionEyebrow>
              <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight text-studio-text md:text-6xl">
                Japan
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-studio-dim md:text-base">
              A photographic study of place, texture and memory, observed
              slowly and sequenced with care.
            </p>
          </div>

          <div className="mt-12 md:mt-16">
            <JapanGrid images={images} />
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
