import Link from "next/link";

export const metadata = {
  title: "Japan — Blackburn Studio",
};

export default function JapanPage() {
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

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-24 text-center md:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
          Series
        </p>
        <h1 className="mt-4 text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
          Japan
        </h1>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-neutral-400 md:text-base">
          Coming soon.
        </p>
        <Link
          href="/work"
          className="mt-10 inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-neutral-200 transition hover:border-white/40 hover:text-white"
        >
          ← Back to work
        </Link>
      </main>
    </div>
  );
}
