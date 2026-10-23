"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ClientGallery } from "@/components/client-gallery/ClientGallery";
import { ClientGalleryUnavailable } from "@/components/client-gallery/ClientGalleryUnavailable";
import { getSampleClientGallery } from "@/lib/client-galleries/fixtures/sampleClientGallery";
import type { ClientGallery as GalleryData } from "@/lib/client-galleries/contracts";
import { createGallerySessionCoordinator, takeGalleryFragment } from "@/lib/client-galleries/loadClientGallery";

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
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [linkGeneration, setLinkGeneration] = useState(0);
  // Preserve cookie-operation order across every keyed loader replacement.
  const [session] = useState(createGallerySessionCoordinator);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const restartForFragment = () => {
      // A same-gallery link can change only the hash, leaving usePathname unchanged.
      // Remount the loader without retaining the bearer in React state. Its initial
      // effect clears the fragment before making the one-shot exchange.
      if (window.location.hash && getClientGalleryId(window.location.pathname) === getClientGalleryId(pathname)) {
        setLinkGeneration(generation => generation + 1);
      }
    };
    window.addEventListener("hashchange", restartForFragment);
    return () => window.removeEventListener("hashchange", restartForFragment);
  }, [pathname]);

  // This also isolates pending state when Next performs client-side navigation.
  const galleryId = getClientGalleryId(pathname);

  if (!mounted) {
    return <ClientGalleryLoading />;
  }

  const gallery = galleryId ? getSampleClientGallery(galleryId) : null;
  return <GalleryLoader key={`${galleryId ?? "unavailable"}:${linkGeneration}`} galleryId={galleryId} sample={gallery} session={session} />;
}

function GalleryLoader({ galleryId, sample, session }: {
  galleryId: string | null;
  sample: GalleryData | null;
  session: ReturnType<typeof createGallerySessionCoordinator>;
}) {
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signOutError, setSignOutError] = useState(false);
  const initial = useRef<Promise<GalleryData> | null>(null);
  const signedOut = useRef(false);

  useEffect(() => {
    let active = true;
    const token = takeGalleryFragment();
    // Keep one in-flight exchange across React Strict Mode's effect replay.
    // No token is persisted or retained in a ref; only the resulting promise.
    initial.current ??= sample ? Promise.resolve(sample) : galleryId
      ? session.load(galleryId, token)
      : Promise.reject(new Error("Gallery unavailable"));
    initial.current.then(data => { if (active) setGallery(data); })
      .catch(() => { if (active) setGallery(null); })
      .finally(() => { if (active) setLoading(false); });
    let refreshing = false;
    const refresh = async () => {
      if (sample || !galleryId || signedOut.current || refreshing) return;
      refreshing = true;
      try {
        // Wait for the one-shot exchange/load to settle, including failure.
        // Recovery retries metadata only; it never resends a link credential.
        await initial.current?.catch(() => undefined);
        if (!active || signedOut.current) return;
        const data = await session.load(galleryId);
        if (active && !signedOut.current) setGallery(data);
      } catch { if (active) setGallery(null); }
      finally { refreshing = false; }
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [galleryId, sample, session]);

  const signOut = async () => {
    signedOut.current = true;
    setGallery(null);
    try { await session.logout(galleryId!); }
    catch { setSignOutError(true); }
  };
  if (loading) return <ClientGalleryLoading />;
  if (!gallery) return <>
    <ClientGalleryUnavailable />
    {signOutError ? <p role="alert" className="fixed bottom-4 left-4 right-4 bg-studio-surface p-4 text-sm text-studio-text">Sign-out could not be confirmed. On a shared device, clear this website’s cookies or site data in your browser settings before leaving it. Closing the browser may keep you signed in.</p> : null}
  </>;
  return <ClientGallery gallery={gallery} onSignOut={sample ? undefined : signOut} />;
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
