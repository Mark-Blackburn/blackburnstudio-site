"use client";

import { useSyncExternalStore } from "react";

import { ClientGallery } from "@/components/client-gallery/ClientGallery";
import { ClientGalleryUnavailable } from "@/components/client-gallery/ClientGalleryUnavailable";
import { getSampleClientGallery } from "@/lib/client-galleries/fixtures/sampleClientGallery";

function subscribeToPathname(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getBrowserPathname() {
  return window.location.pathname;
}

function getServerPathname() {
  return null;
}

export function getClientGalleryId(pathname: string): string | null {
  const match = /^\/clients\/([^/]+)\/?$/.exec(pathname);
  const rawGalleryId = match?.[1];

  if (!rawGalleryId) {
    return null;
  }

  try {
    const galleryId = decodeURIComponent(rawGalleryId);

    if (!galleryId || galleryId.includes("/") || galleryId.includes("\\")) {
      return null;
    }

    return galleryId;
  } catch {
    return null;
  }
}

export function ClientGalleryShell() {
  const pathname = useSyncExternalStore(
    subscribeToPathname,
    getBrowserPathname,
    getServerPathname,
  );

  if (pathname === null) {
    return <ClientGalleryLoading />;
  }

  const galleryId = getClientGalleryId(pathname);

  // Transitional public fixture only. Production gallery data must come from
  // the authenticated same-origin API and must never be bundled into this shell.
  const gallery = galleryId ? getSampleClientGallery(galleryId) : null;

  if (!gallery) {
    return <ClientGalleryUnavailable />;
  }

  return <ClientGallery gallery={gallery} />;
}

function ClientGalleryLoading() {
  return (
    <main className="flex min-h-screen bg-studio-base px-5 text-studio-muted sm:px-6">
      <div
        className="m-auto w-full max-w-xl border-y border-studio-border py-14 text-center"
        role="status"
      >
        <p className="text-sm text-studio-dim">Loading private gallery…</p>
      </div>
    </main>
  );
}
