import FamiliesGrid from "./FamiliesGrid";
import { getImagesWithBlur, type ImageSource } from "../../../lib/getImagesWithBlur";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata = {
  title: "Families — Blackburn Studio",
};

// Sequence preserved exactly — curated for emotional pacing and editorial rhythm.
const familySources: ImageSource[] = [
  { id: 1, file: "families-beach-connection.jpg", alt: "Family relaxing together on rocks near the beach" },
  { id: 2, file: "families-mother-daughter-embrace.jpg", alt: "Mother and daughter embracing outdoors" },
  { id: 3, file: "families-father-child-moment.jpg", alt: "Father holding young child in a quiet candid moment" },
  { id: 4, file: "families-formal-family-portrait.jpg", alt: "Formal family portrait outdoors" },
  { id: 5, file: "families-waterfall-family-portrait.jpg", alt: "Family portrait near a waterfall" },
  { id: 6, file: "families-generational-family.jpg", alt: "Multi-generational family portrait outdoors" },
  { id: 7, file: "families-blue-family-storytelling.jpg", alt: "Family interacting together outdoors in natural light" },
  { id: 8, file: "families-blossom-family.jpg", alt: "Family seated together beneath blossom trees" },
  { id: 9, file: "families-red-jumper-connection.jpg", alt: "Father and child portrait with red jumper" },
  { id: 10, file: "families-waterfall-father-sons.jpg", alt: "Father standing with two sons near a waterfall" },
  { id: 11, file: "families-seated-under-trees.jpg", alt: "Family seated together beneath trees" },
  { id: 12, file: "families-playful-family-stack.jpg", alt: "Playful stacked family portrait outdoors" },
];

export default async function FamiliesPage() {
  const images = await getImagesWithBlur("families", familySources);
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-12 pb-24 md:px-8 md:pt-20 md:pb-32">
        <section>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <div>
              <SectionEyebrow>Work</SectionEyebrow>
              <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight text-studio-text md:text-6xl">
                Families
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-studio-dim md:text-base">
              Relaxed family photography focused on connection, warmth,
              expression and real moments.
            </p>
          </div>

          <div className="mt-12 md:mt-16">
            <FamiliesGrid images={images} />
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
