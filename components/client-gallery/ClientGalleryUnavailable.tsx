import { SITE_EMAIL, SITE_NAME } from "@/lib/siteConfig";

export function ClientGalleryUnavailable() {
  return (
    <main className="flex min-h-screen bg-studio-base px-5 text-studio-muted sm:px-6">
      <div className="m-auto w-full max-w-xl border-y border-studio-border py-14 text-center">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-[#b9955a]">
          {SITE_NAME}
        </p>
        <h1 className="mt-5 text-3xl font-medium text-studio-text sm:text-4xl">
          This gallery is unavailable.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-studio-dim sm:text-base">
          The link may no longer be active. If you believe this is an error,
          contact Blackburn Studio.
        </p>
        <a
          href={`mailto:${SITE_EMAIL}`}
          className="mt-8 inline-flex min-h-11 items-center text-sm text-studio-muted underline decoration-[#b9955a]/70 underline-offset-4 transition hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9955a]"
        >
          {SITE_EMAIL}
        </a>
      </div>
    </main>
  );
}