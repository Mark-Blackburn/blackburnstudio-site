import Image from "next/image";
import Link from "next/link";

import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { SectionEyebrow, StudioButton } from "@/components/studio";

const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "/images";

const portraits = ["portrait-01.jpg", "portrait-02.jpg", "portrait-03.jpg"];

export default function Home() {
  return (
    <div className="bg-studio-base text-studio-muted">
      {/* Hero */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        <Image
          src={`${baseUrl}/hero.jpg`}
          alt="Blackburn Studio hero"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-[70%_center] md:object-center"
        />
        <div className="absolute inset-0 z-10 bg-linear-to-b from-black/70 via-black/40 to-black/80 md:from-black/60 md:via-black/30 md:to-black/70" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-linear-to-t from-black via-black/40 to-transparent md:h-32" />

        <SiteHeader overlay />

        {/* `[@media(max-height:760px)]:` refinements target shorter mobile
            heights only (iPhone SE / 12 Pro class). Larger phones, tablets,
            and desktop are untouched. */}
        <div className="relative z-30 mx-auto flex h-[calc(85vh-72px)] w-full max-w-6xl flex-col justify-end px-6 pb-16 [@media(max-height:760px)]:pb-8 md:px-8 md:pb-20">
          <h1 className="rise-in mt-24 max-w-[90%] text-4xl font-medium leading-[1.1] tracking-tight text-white sm:text-5xl [@media(max-height:760px)]:mt-10 [@media(max-height:760px)]:text-3xl [@media(max-height:760px)]:leading-[1.15] md:mt-0 md:max-w-xl md:text-6xl">
            Photography, websites and practical digital services.
          </h1>
          <p
            className="rise-in mt-6 max-w-xl text-[15px] leading-relaxed text-neutral-300 [@media(max-height:760px)]:mt-3 [@media(max-height:760px)]:max-w-76 [@media(max-height:760px)]:text-[13px] [@media(max-height:760px)]:leading-snug md:text-base"
            style={{ animationDelay: "120ms" }}
          >
            Blackburn Studio creates natural photography, builds clear and useful websites, and looks after the domains, hosting, Microsoft 365 and ongoing support behind them.
          </p>
          <div
            className="rise-in mt-8 flex w-full flex-col gap-3 [@media(max-height:760px)]:mt-4 [@media(max-height:760px)]:gap-2 md:mt-10 md:w-auto md:flex-row md:gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <StudioButton
              href="/work#photography"
              variant="primary"
              className="w-full rounded-full [@media(max-height:760px)]:min-h-10 [@media(max-height:760px)]:py-1.5 [@media(max-height:760px)]:text-[13px] md:w-auto"
            >
              View photography
            </StudioButton>
            <StudioButton
              href="/digital"
              variant="secondary"
              className="w-full rounded-full border-white/20 text-white/80 hover:border-white/40 hover:text-white [@media(max-height:760px)]:min-h-10 [@media(max-height:760px)]:py-1.5 [@media(max-height:760px)]:text-[13px] md:w-auto"
            >
              Explore digital
            </StudioButton>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden h-6 w-px -translate-x-1/2 bg-white/25 md:block" />
      </section>

      <section id="work">
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-8 md:px-8 md:pt-20 md:pb-12">
          <SectionEyebrow>Studio</SectionEyebrow>
          <h2 className="mt-4 max-w-[24ch] text-3xl font-medium leading-tight tracking-tight text-studio-text md:text-4xl">
            Photography and digital work from one studio.
          </h2>
          <p className="mt-6 max-w-[72ch] text-[0.98rem] leading-relaxed text-studio-muted md:text-base">
            Some projects need strong images. Some need a website that explains
            the work clearly. Others need a better way to manage information.
            Blackburn Studio can help with each, without making it bigger than
            it needs to be.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 md:gap-6">
            <section className="flex h-full flex-col rounded-2xl border border-studio-border bg-studio-surface px-6 py-6 md:px-7 md:py-7">
              <h3 className="text-2xl font-medium tracking-tight text-studio-text">
                Digital
              </h3>
              <div className="flex-1">
                <p className="mt-4 text-[0.98rem] leading-relaxed text-studio-muted md:text-base">
                  Websites, managed domains and hosting, Microsoft 365,
                  workflow improvements and practical digital systems for small
                  businesses, clubs and community organisations.
                </p>
                <p className="mt-3 text-[0.98rem] leading-relaxed text-studio-muted">
                  Recent work includes business websites, club platforms,
                  workflow automation and long-term digital support.
                </p>
              </div>
              <div className="mt-auto pt-6">
                <StudioButton href="/digital" variant="secondary">
                  Explore digital
                </StudioButton>
              </div>
            </section>

            <section className="flex h-full flex-col rounded-2xl border border-studio-border bg-studio-surface px-6 py-6 md:px-7 md:py-7">
              <h3 className="text-2xl font-medium tracking-tight text-studio-text">
                Photography
              </h3>
              <div className="flex-1">
                <p className="mt-4 text-[0.98rem] leading-relaxed text-studio-muted md:text-base">
                  Portraits, families, couples, business and project
                  photography with a natural, honest style.
                </p>
                <p className="mt-3 text-[0.98rem] leading-relaxed text-studio-muted">
                  Available for personal branding, websites, families and
                  projects across the Macedon Ranges and surrounding areas.
                </p>
              </div>
              <div className="mt-auto pt-6">
                <StudioButton href="/work#photography" variant="secondary">
                  View photography
                </StudioButton>
              </div>
            </section>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 pt-10 pb-20 [@media(max-height:760px)]:pt-16 md:px-8 md:pt-16 md:pb-28">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:gap-12">
            <div>
              <SectionEyebrow>FEATURED PHOTOGRAPHY</SectionEyebrow>
              <h2 className="mt-3 text-3xl font-medium tracking-tight text-studio-text md:text-4xl">
                Portraits
              </h2>
            </div>
            <div className="max-w-sm md:ml-auto">
              <p className="text-sm leading-relaxed text-studio-dim md:text-base">
                Portraits with considered light, expression and a relaxed feel.
              </p>
              <Link
                href="/work/portraits"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-studio-dim transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
              >
                View portraits
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
            {portraits.map((file) => (
              <Link
                key={file}
                href="/work/portraits"
                aria-label="View portraits gallery"
                className="group relative block aspect-4/5 overflow-hidden rounded-2xl bg-studio-surface focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-4 focus-visible:ring-offset-studio-base"
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

        <section
          id="about"
          className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28"
        >
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>About</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-studio-text md:text-4xl">
              Clear work, practical systems and one person accountable for the
              result.
            </h2>
            <p className="mt-8 text-sm leading-loose text-studio-dim md:text-base">
              Blackburn Studio combines photography, websites and managed
              digital services without adding unnecessary complexity.
            </p>
          </div>
        </section>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="mx-auto max-w-6xl px-6 pt-20 pb-28 md:px-8 md:pt-24"
      >
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>Contact</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-studio-text md:text-5xl">
            Let&rsquo;s work together.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-studio-dim md:text-base">
            Photography commissions, website projects, managed digital services
            and ongoing support are all welcome.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <StudioButton
              href="/contact"
              variant="primary"
              className="w-full sm:w-auto"
            >
              Start a conversation
            </StudioButton>
            <StudioButton
              href="/work"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              View selected work
            </StudioButton>
          </div>
          <p className="mt-5 text-sm text-studio-dim">
            Or email{" "}
            <a
              href="mailto:hello@theblackburn.studio"
              className="text-studio-muted underline decoration-white/30 underline-offset-4 transition hover:text-studio-text"
            >
              hello@theblackburn.studio
            </a>
            .
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
