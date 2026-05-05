import Image from "next/image";
import Link from "next/link";

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
    <div className="bg-black text-neutral-300">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8">
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-300 transition-colors hover:text-white"
        >
          Blackburn Studio
        </Link>
        <nav className="hidden gap-8 text-sm text-neutral-400 md:flex">
          <Link href="/work" className="text-white">
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

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 md:px-8 md:pt-24 md:pb-16">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Work
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
          Selected Work
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-neutral-400 md:text-base">
          A curated collection of portrait, family, couple and personal
          landscape work — focused on real expression, considered light and
          quiet human moments.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28 md:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/work/${c.slug}`}
              className="group block"
            >
              <figure className="relative aspect-4/3 overflow-hidden rounded-2xl bg-neutral-900">
                <Image
                  src={`${baseUrl}/${c.image}`}
                  alt={c.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition duration-700 ease-out group-hover:scale-[1.01]"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/10" />
              </figure>
              <div className="mt-5 flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-medium tracking-tight text-white md:text-3xl">
                    {c.title}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-400">
                    {c.description}
                  </p>
                </div>
                <span className="mt-1 shrink-0 text-xs font-medium uppercase tracking-[0.3em] text-neutral-500 transition-colors group-hover:text-white">
                  View series →
                </span>
              </div>
            </Link>
          ))}
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
