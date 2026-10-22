"use client";

import { useCallback, useRef, useState } from "react";

import { ClientGalleryGrid } from "@/components/client-gallery/ClientGalleryGrid";
import { ClientGalleryViewer } from "@/components/client-gallery/ClientGalleryViewer";
import type { ClientGallery as ClientGalleryData } from "@/lib/client-galleries/contracts";
import { SITE_EMAIL, SITE_NAME } from "@/lib/siteConfig";

function formatExpiry(expiresAt: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "long",
    timeZone: "Australia/Melbourne",
  }).format(new Date(expiresAt));
}

export function ClientGallery({ gallery, onSignOut }: { gallery: ClientGalleryData; onSignOut?: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const clientDisplayName = gallery.clientDisplayName?.trim();

  const open = useCallback((index: number, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setOpenIndex(index);
  }, []);

  const close = useCallback(() => {
    setOpenIndex(null);
  }, []);

  return (
    <div className="min-h-screen bg-studio-base text-studio-muted">
      <header className="border-b border-studio-border">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 md:px-8">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-studio-text">
            {SITE_NAME}
          </span>
          {onSignOut ? <button type="button" onClick={onSignOut} className="min-h-11 px-3 text-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-[#b9955a]">Sign out</button> : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-12 sm:px-6 md:px-8 md:pb-32 md:pt-20">
        <section aria-labelledby="client-gallery-heading">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-[#b9955a]">
            {clientDisplayName
              ? `Private gallery for ${clientDisplayName}`
              : "Private client gallery"}
          </p>
          <h1
            id="client-gallery-heading"
            className="mt-4 max-w-4xl text-4xl font-medium leading-[1.08] text-studio-text sm:text-5xl md:text-6xl"
          >
            {gallery.title}
          </h1>
          {gallery.message ? (
            <p className="mt-6 max-w-2xl text-sm leading-7 text-studio-muted md:text-base">
              {gallery.message}
            </p>
          ) : null}
          {gallery.expiresAt ? (
            <p className="mt-5 border-l border-[#b9955a]/70 pl-4 text-sm text-studio-dim">
              Available until {formatExpiry(gallery.expiresAt)}
            </p>
          ) : null}

          <div className="mt-12 md:mt-16">
            {gallery.assets.length === 0 ? <p className="text-sm text-studio-dim">Your photographs are being prepared. Please check back shortly.</p> : null}
            <ClientGalleryGrid assets={gallery.assets} onOpen={open} />
          </div>
        </section>
      </main>

      <footer className="border-t border-studio-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-studio-dim sm:px-6 md:flex-row md:items-center md:justify-between md:px-8">
          <span>{SITE_NAME}</span>
          <a
            href={`mailto:${SITE_EMAIL}`}
            className="transition-colors hover:text-studio-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9955a]"
          >
            {SITE_EMAIL}
          </a>
        </div>
      </footer>

      {openIndex !== null ? (
        <ClientGalleryViewer
          assets={gallery.assets}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={close}
          returnFocusRef={openerRef}
          renderActions={(asset) => <>
            {asset.webDownloadUrl ? <a href={asset.webDownloadUrl} download aria-label="Download web-size image" referrerPolicy="no-referrer" className="inline-flex min-h-11 items-center px-2 text-xs underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-[#d2b47b] sm:text-sm">Web size</a> : null}
            {asset.fullDownloadUrl ? <a href={asset.fullDownloadUrl} download aria-label="Download full-resolution image" referrerPolicy="no-referrer" className="inline-flex min-h-11 items-center px-2 text-xs underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-[#d2b47b] sm:text-sm">Full resolution</a> : null}
          </>}
        />
      ) : null}
    </div>
  );
}
