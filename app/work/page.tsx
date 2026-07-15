import Image from "next/image";
import Link from "next/link";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "/images";

const categories = [
  {
    slug: "portraits",
    title: "Portraits",
    description:
      "Considered portraits with a focus on presence, expression and carefully shaped light.",
    image: "work-portraits.jpg",
  },
  {
    slug: "families",
    title: "Families",
    description:
      "Relaxed family sessions built around connection, warmth and real moments.",
    image: "work-families.jpg",
  },
  {
    slug: "couples",
    title: "Couples",
    description:
      "Quiet, personal images of couples — gently directed, naturally expressive.",
    image: "work-couples.jpg",
  },
  {
    slug: "japan",
    title: "Japan",
    description:
      "A personal landscape series from Japan — stillness, texture, scale and place.",
    image: "work-japan.jpg",
  },
];

export const metadata = {
  title: "Selected Work — Blackburn Studio",
  description:
    "A curated collection of portrait, family, couple and personal landscape work.",
};

export default function WorkPage() {
  return (
    <div className="bg-studio-base text-studio-muted">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 md:px-8 md:pt-24 md:pb-16">
        <SectionEyebrow>Work</SectionEyebrow>
        <h1 className="mt-4 max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight text-studio-text md:text-5xl">
          Selected Work
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-studio-dim md:text-base">
          A curated collection of portrait, family, couple and personal
          landscape work — focused on real expression, considered light and
          quiet human moments.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <StudioButton href="/contact" variant="primary">
            Start a conversation
          </StudioButton>
          <StudioButton href="/digital" variant="secondary">
            Digital services
          </StudioButton>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28 md:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/work/${c.slug}`}
              aria-label={`${c.title} — view series`}
              className="group block focus-visible:outline-none"
            >
              <figure className="relative aspect-4/3 overflow-hidden rounded-2xl bg-studio-surface group-focus-visible:ring-2 group-focus-visible:ring-white/60 group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-studio-base">
                {/* Image layer — subtle, slow, cinematic scale */}
                <Image
                  src={`${baseUrl}/${c.image}`}
                  alt={c.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  style={{ willChange: "transform", backfaceVisibility: "hidden" }}
                  className="object-cover transform-gpu transition-transform duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.01]"
                />

                {/* Gradient overlay — atmospheric base, gently deepens on hover */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 via-black/25 to-transparent transition-opacity duration-500 ease-out"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                />

                {/* Typography layer — title and CTA animate independently */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-5 md:p-6">
                  <h2
                    style={{ willChange: "transform" }}
                    className="text-xl font-medium uppercase tracking-[0.18em] text-white transform-gpu transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:text-2xl md:group-hover:-translate-y-[3px] md:group-hover:tracking-[0.2em]"
                  >
                    {c.title}
                  </h2>
                  <span className="shrink-0 pb-[2px] text-[10px] uppercase tracking-[0.3em] text-white/55 transition-colors duration-500 ease-out group-hover:text-white/80 md:text-xs">
                    View series{" "}
                    <span
                      aria-hidden="true"
                      style={{ willChange: "transform" }}
                      className="inline-block transform-gpu transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:group-hover:translate-x-[3px]"
                    >
                      →
                    </span>
                  </span>
                </div>
              </figure>

              {/* Supporting description below image — preserved */}
              <p className="mt-5 max-w-md text-sm leading-relaxed text-studio-dim">
                {c.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
