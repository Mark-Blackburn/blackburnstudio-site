import Image from "next/image";
import Link from "next/link";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { getImagesWithBlur, type ImageSource } from "@/lib/getImagesWithBlur";

const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "/images";

const portraits = ["portrait-01.jpg", "portrait-02.jpg", "portrait-03.jpg"];

// Original curated homepage trio. Asymmetry is intrinsic to the photographs
// themselves — we read their native dimensions and let them define the rhythm.
const japanSources: ImageSource[] = [
  { id: 1, file: "japan-01.jpg", alt: "Japan landscape by Blackburn Studio" },
  { id: 2, file: "japan-02.jpg", alt: "Japan landscape by Blackburn Studio" },
  { id: 3, file: "japan-03.jpg", alt: "Japan landscape by Blackburn Studio" },
];

export default async function Home() {
  const japanImages = await getImagesWithBlur("images", japanSources);
  const [japanLead, ...japanSupports] = japanImages;
  return (
    <div className="bg-studio-base text-studio-muted">
      {/* Hero */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        <img
          src={`${baseUrl}/hero.jpg`}
          alt="Blackburn Studio hero"
          className="absolute inset-0 h-full w-full object-cover object-[70%_center] md:object-center"
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-black/40 to-black/80 md:from-black/60 md:via-black/30 md:to-black/70" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black via-black/40 to-transparent md:h-32" />

        <SiteHeader overlay />

        {/* `[@media(max-height:760px)]:` refinements target shorter mobile
            heights only (iPhone SE / 12 Pro class). Larger phones, tablets,
            and desktop are untouched. */}
        <div className="relative z-30 mx-auto flex h-[calc(85vh-72px)] w-full max-w-6xl flex-col justify-end px-6 pb-16 [@media(max-height:760px)]:pb-8 md:px-8 md:pb-20">
          <h1 className="rise-in mt-24 max-w-[90%] text-4xl font-medium leading-[1.1] tracking-tight text-white sm:text-5xl [@media(max-height:760px)]:mt-10 [@media(max-height:760px)]:text-3xl [@media(max-height:760px)]:leading-[1.15] md:mt-0 md:max-w-xl md:text-6xl">
            Honest, cinematic photography
            <br />
            <span className="text-neutral-400">with a human edge.</span>
          </h1>
          <p
            className="rise-in mt-6 max-w-xl text-sm leading-relaxed text-neutral-400 [@media(max-height:760px)]:mt-3 [@media(max-height:760px)]:max-w-[19rem] [@media(max-height:760px)]:text-[13px] [@media(max-height:760px)]:leading-snug md:text-base"
            style={{ animationDelay: "120ms" }}
          >
            Blackburn Studio focuses on portrait photography with a natural,
            human approach — supported by a curated collection of landscape
            work from Japan.
          </p>
          <div
            className="rise-in mt-8 flex w-full flex-col gap-3 [@media(max-height:760px)]:mt-4 [@media(max-height:760px)]:gap-2 md:mt-10 md:w-auto md:flex-row md:gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <a
              href="#work"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 [@media(max-height:760px)]:min-h-10 [@media(max-height:760px)]:py-1.5 [@media(max-height:760px)]:text-[13px] md:w-auto"
            >
              View work
            </a>
            <a
              href="#contact"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white [@media(max-height:760px)]:min-h-10 [@media(max-height:760px)]:py-1.5 [@media(max-height:760px)]:text-[13px] md:w-auto"
            >
              Enquire
            </a>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden h-6 w-px -translate-x-1/2 bg-white/25 md:block" />
      </section>

      {/* Work */}
      <section id="work">
        {/* Portraits — tighter top spacing creates a connected exhale from the hero.
            On short-height mobile, restore extra clearance so Portraits doesn't
            visually collide with the compressed hero stack. */}
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-20 [@media(max-height:760px)]:pt-16 md:px-8 md:pt-16 md:pb-28">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
                Primary
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
                Portraits
              </h2>
            </div>
            <div className="max-w-sm md:ml-auto">
              <p className="text-sm leading-relaxed text-studio-dim md:text-base">
                Quiet, considered portraiture. Natural light, real expression,
                and a sense of presence in every frame.
              </p>
              <Link
                href="/work"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-studio-dim transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
              >
                View selected work
                <span aria-hidden="true" className="transition-transform duration-300 ease-out group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
            {portraits.map((file) => (
              <Link
                key={file}
                href="/work"
                aria-label="View selected work"
                className="group relative block aspect-4/5 overflow-hidden rounded-2xl bg-studio-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
              >
                <Image
                  src={`${baseUrl}/${file}`}
                  alt="Portrait by Blackburn Studio"
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition duration-700 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.01]"
                />
              </Link>
            ))}
          </div>
        </div>

      </section>

      {/* About — placed between Portraits and Japan to bridge
          human connection → artistic philosophy → contemplative observation. */}
      <section
        id="about"
        className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            About
          </p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-studio-text md:text-4xl">
            Clean, natural, human-focused photography.
          </h2>
          <p className="mt-8 text-sm leading-loose text-studio-dim md:text-base">
            Blackburn Studio is built around a simple idea: photographs should
            feel honest. We work quietly and slowly, prioritising real moments
            over performance, and natural light over spectacle. The result is
            imagery that holds up — calm, considered, and unmistakably human.
          </p>
        </div>
      </section>

      {/* Japan — contemplative extension of the studio's worldview.
          Quieter than Portraits: narrower container, intrinsic aspect ratios,
          asymmetry inherited from the photographs themselves. */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-28 md:px-8 md:pt-24 md:pb-40">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:gap-12">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
              Series
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
              Japan
            </h2>
          </div>
          <div className="max-w-sm md:ml-auto">
            <p className="text-sm leading-relaxed text-studio-dim md:text-base">
              A curated landscape series — stillness, scale, and the soft
              geometry of a country observed slowly.
            </p>
            <Link
              href="/work"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-studio-dim transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
            >
              View selected work
              <span aria-hidden="true" className="transition-transform duration-300 ease-out group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>

        {/* Establishing landscape on top, two portrait supports beneath.
            The photographs carry their own rhythm \u2014 the layout just gives
            them room. Intrinsic aspect ratios throughout. */}
        <div className="mt-10 flex flex-col gap-8 md:gap-10">
          <Link
            href="/work"
            aria-label="View selected work"
            className="group relative block overflow-hidden rounded-2xl bg-studio-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
            style={
              japanLead.width && japanLead.height
                ? { aspectRatio: `${japanLead.width} / ${japanLead.height}` }
                : undefined
            }
          >
            <Image
              src={japanLead.src}
              alt={japanLead.alt}
              fill
              placeholder="blur"
              blurDataURL={japanLead.blurDataURL}
              sizes="(min-width: 768px) 56rem, 100vw"
              className="object-cover transition duration-700 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.01]"
            />
          </Link>
          {/* Mobile: paired supporting diptych beneath the lead.
              Desktop (md+): inherits the editorial drift refinements. */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {japanSupports.map((img, i) => (
              <Link
                key={img.id}
                href="/work"
                aria-label="View selected work"
                className={
                  "group relative block overflow-hidden rounded-2xl bg-studio-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60 " +
                  // Quiet editorial drift on the right-hand image, desktop only:
                  // slightly narrower, anchored to the inner edge, and nudged
                  // downward so the two supports share no aligned edge or baseline.
                  // Mobile keeps a clean paired diptych — no drift.
                  (i === 1 ? "md:w-[82%] md:justify-self-end md:mt-10" : "")
                }
                style={
                  img.width && img.height
                    ? { aspectRatio: `${img.width} / ${img.height}` }
                    : undefined
                }
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  placeholder="blur"
                  blurDataURL={img.blurDataURL}
                  sizes="(min-width: 640px) 32rem, 50vw"
                  className="object-cover transition duration-700 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.01]"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="mx-auto max-w-6xl px-6 pt-24 pb-28 md:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Contact
          </p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-studio-text md:text-5xl">
            Let&rsquo;s work together.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-studio-dim md:text-base">
            Commissions, collaborations, and considered conversations all
            welcome.
          </p>
          <a
            href="mailto:hello@theblackburn.studio"
            className="mt-10 inline-flex items-center justify-center rounded-full border border-studio-border px-5 py-2 text-sm font-medium text-studio-muted transition duration-500 ease-out hover:scale-[1.02] hover:border-white/35 hover:text-studio-text"
          >
            hello@theblackburn.studio
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
