import Image from "next/image";

const baseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "/images";

const portraits = ["portrait-01.jpg", "portrait-02.jpg", "portrait-03.jpg"];
const japan = ["japan-01.jpg", "japan-02.jpg", "japan-03.jpg"];

export default function Home() {
  return (
    <div className="bg-black text-neutral-300">
      {/* Hero */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        <img
          src={`${baseUrl}/hero.jpg`}
          alt="Blackburn Studio hero"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black via-black/40 to-transparent md:h-32" />

        <header className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-300">
            Blackburn Studio
          </span>
          <nav className="hidden gap-8 text-sm text-neutral-400 md:flex">
            <a href="/work" className="transition-colors hover:text-white">Work</a>
            <a href="#about" className="transition-colors hover:text-white">About</a>
            <a href="#contact" className="transition-colors hover:text-white">Contact</a>
          </nav>
        </header>

        <div className="relative z-30 mx-auto flex h-[calc(85vh-72px)] w-full max-w-6xl flex-col justify-end px-6 pb-16 md:px-8 md:pb-20">
          <h1 className="rise-in max-w-xl text-4xl font-medium leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
            Honest, cinematic photography
            <br />
            <span className="text-neutral-400">with a human edge.</span>
          </h1>
          <p
            className="rise-in mt-6 max-w-xl text-sm leading-relaxed text-neutral-400 md:text-base"
            style={{ animationDelay: "120ms" }}
          >
            Blackburn Studio focuses on portrait photography with a natural,
            human approach — supported by a curated collection of landscape
            work from Japan.
          </p>
          <div
            className="rise-in mt-10 flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <a
              href="#work"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
            >
              View work
            </a>
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-neutral-200 transition hover:border-white/40 hover:text-white"
            >
              Enquire
            </a>
          </div>
        </div>
      </section>

      {/* Work */}
      <section id="work">
        {/* Portraits */}
        <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-6 pt-16 pb-14 md:-mt-10 md:px-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
                Primary
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
                Portraits
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-neutral-400 md:ml-auto md:text-base">
              Quiet, considered portraiture. Natural light, real expression,
              and a sense of presence in every frame.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
            {portraits.map((file) => (
              <figure
                key={file}
                className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-neutral-900"
              >
                <Image
                  src={`${baseUrl}/${file}`}
                  alt="Portrait by Blackburn Studio"
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition duration-700 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.01]"
                />
              </figure>
            ))}
          </div>
        </div>

        {/* Japan */}
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 md:px-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:gap-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
                Series
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
                Japan
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-neutral-400 md:ml-auto md:text-base">
              A curated landscape series — stillness, scale, and the soft
              geometry of a country observed slowly.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
            {japan.map((file) => (
              <figure
                key={file}
                className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-neutral-900"
              >
                <Image
                  src={`${baseUrl}/${file}`}
                  alt="Japan landscape by Blackburn Studio"
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition duration-700 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.01]"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-6xl px-6 py-24 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            About
          </p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-white md:text-4xl">
            Clean, natural, human-focused photography.
          </h2>
          <p className="mt-8 text-sm leading-loose text-neutral-400 md:text-base">
            Blackburn Studio is built around a simple idea: photographs should
            feel honest. We work quietly and slowly, prioritising real moments
            over performance, and natural light over spectacle. The result is
            imagery that holds up — calm, considered, and unmistakably human.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-6xl px-6 py-24 md:px-8">
        <div className="mx-auto mt-32 max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Contact
          </p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-white md:text-5xl">
            Let&rsquo;s work together.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-neutral-400 md:text-base">
            Commissions, collaborations, and considered conversations all
            welcome.
          </p>
          <a
            href="mailto:hello@theblackburn.studio"
            className="mt-10 inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-neutral-200 transition duration-500 ease-out hover:scale-[1.02] hover:border-white/40 hover:text-white"
          >
            hello@theblackburn.studio
          </a>
        </div>
      </section>

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
