import CouplesGrid from "./CouplesGrid";
import { getImagesWithBlur, type ImageSource } from "../../../lib/getImagesWithBlur";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

export const metadata = {
  title: "Couples — Blackburn Studio",
  description:
    "Couples photography with gentle direction and natural interaction.",
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
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-12 pb-24 md:px-8 md:pt-20 md:pb-32">
        <section>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <div>
              <SectionEyebrow>Work</SectionEyebrow>
              <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight text-studio-text md:text-6xl">
                Couples
              </h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-studio-dim md:text-base">
              Couples photography focused on connection and natural
              interaction.
            </p>
          </div>

          <div className="mt-12 md:mt-16">
            <CouplesGrid images={images} />
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
