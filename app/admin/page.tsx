import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration | Blackburn Studio",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-studio-base px-5 py-10 text-studio-text sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 border-b border-studio-border pb-6">
          <p className="text-xs uppercase tracking-[.25em] text-studio-muted">
            Blackburn Studio
          </p>
          <h1 className="mt-3 text-3xl">Administration</h1>
        </header>
        <a
          href="/admin/galleries"
          className="block max-w-lg rounded border border-studio-border bg-studio-surface p-6 hover:border-studio-accent focus-visible:outline-2 focus-visible:outline-studio-accent"
        >
          <h2 className="text-xl">Gallery administration</h2>
          <p className="mt-2 text-studio-muted">
            Create client galleries, upload photographs and manage private links.
          </p>
        </a>
      </div>
    </main>
  );
}
