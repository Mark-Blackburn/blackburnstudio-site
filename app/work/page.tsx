import Image from "next/image";
import Link from "next/link";
import { RichDigitalWorkSection } from "@/components/digital-work";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "/images";

const categories = [
  {
    slug: "portraits",
    title: "Portraits",
    description:
      "Portraits with expression, a relaxed feel and considered light.",
    image: "work-portraits.jpg",
  },
  {
    slug: "families",
    title: "Families",
    description:
      "Family sessions focused on connection, warmth and everyday moments.",
    image: "work-families.jpg",
  },
  {
    slug: "couples",
    title: "Couples",
    description:
      "Couples photography with gentle direction and natural interaction.",
    image: "work-couples.jpg",
  },
  {
    slug: "japan",
    title: "Japan",
    description:
      "A personal landscape series from Japan, focused on place, detail and atmosphere.",
    image: "work-japan.jpg",
  },
];

export const metadata = {
  title: "Selected Photography and Digital Work | Blackburn Studio",
  description:
    "Explore selected photography, website, workflow and digital-platform work created by Blackburn Studio for people, businesses and community organisations.",
};

export default function WorkPage() {
  return (
    <div className="flex min-h-screen flex-col bg-studio-base text-studio-muted">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-16 pb-28 md:px-8 md:pt-24 md:pb-32">
        <section aria-labelledby="work-heading" className="max-w-3xl">
          <SectionEyebrow>Work</SectionEyebrow>
          <h1 id="work-heading" className="mt-4 text-4xl font-medium leading-[1.1] tracking-tight text-studio-text md:text-5xl">
            Selected Work
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-studio-dim md:text-base">
            Photography, websites, workflows and digital platforms. A selection of work created
            for people, businesses and community organisations.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-studio-muted">
            <Link
              href="/work#photography"
              className="inline-flex items-center gap-1 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              View photography
              <span aria-hidden="true">↓</span>
            </Link>
            <Link
              href="/work#digital-work"
              className="inline-flex items-center gap-1 transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              View digital work
              <span aria-hidden="true">↓</span>
            </Link>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <StudioButton href="/contact" variant="primary">
              Start a conversation
            </StudioButton>
            <StudioButton href="/digital" variant="secondary">
              Explore digital
            </StudioButton>
          </div>
        </section>

        <section id="photography" aria-labelledby="photography-heading" className="mt-20 scroll-mt-28 md:mt-24 md:scroll-mt-32">
          <SectionEyebrow>Photography</SectionEyebrow>
          <h2 id="photography-heading" className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
            Portraits, families and places
          </h2>
          <p className="mt-6 max-w-[66ch] text-base leading-relaxed text-studio-muted md:text-[1.08rem]">
            Natural images focused on people, connection, atmosphere and detail.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/work/${c.slug}`}
                aria-label={`${c.title} — view series`}
                className="group block focus-visible:outline-none"
              >
                <figure className="relative aspect-4/3 overflow-hidden rounded-2xl bg-studio-surface group-focus-visible:ring-2 group-focus-visible:ring-white/60 group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-studio-base">
                  <Image
                    src={`${baseUrl}/${c.image}`}
                    alt={c.title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    style={{ willChange: "transform", backfaceVisibility: "hidden" }}
                    className="object-cover transform-gpu transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.01]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/60 via-black/25 to-transparent transition-opacity duration-500 ease-out"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-5 md:p-6">
                    <h3
                      style={{ willChange: "transform" }}
                      className="text-xl font-medium uppercase tracking-[0.18em] text-white transform-gpu transition-all duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] md:text-2xl md:group-hover:-translate-y-0.75 md:group-hover:tracking-[0.2em]"
                    >
                      {c.title}
                    </h3>
                    <span className="shrink-0 pb-0.5 text-[10px] uppercase tracking-[0.3em] text-white/55 transition-colors duration-500 ease-out group-hover:text-white/80 md:text-xs">
                      View series{" "}
                      <span
                        aria-hidden="true"
                        style={{ willChange: "transform" }}
                        className="inline-block transform-gpu transition-transform duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] md:group-hover:translate-x-0.75"
                      >
                        →
                      </span>
                    </span>
                  </div>
                </figure>

                <p className="mt-5 max-w-md text-sm leading-relaxed text-studio-dim">
                  {c.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <RichDigitalWorkSection
          id="digital-work"
          className="mt-24 max-w-280 md:mt-28"
          eyebrow="Digital work"
          heading="Websites, workflows and platforms"
          supportingCopy="Selected website, business-system and workflow projects delivered for small businesses, community organisations and internal studio ventures."
        />
      </main>

      <SiteFooter />
    </div>
  );
}
