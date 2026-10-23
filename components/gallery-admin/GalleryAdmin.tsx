"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Gallery = {
  id: string;
  title: string;
  clientDisplayName: string;
  message: string;
  status: string;
  expiresAt: number;
  accessTokenVersion: number;
};
type IssuedLink = {
  url: string;
  galleryId: string;
  accessTokenVersion: number;
};
function issuedLinkFor(
  galleryId: string,
  result: { link: string; accessTokenVersion: number },
): IssuedLink {
  if (
    !Number.isSafeInteger(result.accessTokenVersion) ||
    result.accessTokenVersion < 1
  )
    throw new Error(
      "The link version could not be confirmed. Refresh the gallery before issuing another link.",
    );
  return {
    url: result.link,
    galleryId,
    accessTokenVersion: result.accessTokenVersion,
  };
}
type Page = { galleries: Gallery[]; cursor?: string };
const base = "/api/gallery-management/galleries";
const field =
  "w-full rounded border border-studio-border bg-studio-surface px-3 py-2 text-studio-text";
const button =
  "rounded border border-studio-border px-4 py-2 text-sm hover:border-studio-accent disabled:opacity-40";

const uncertainMutation =
  "The operation could not be confirmed. Inspect the gallery before retrying: the current photo or other change may already have been saved. No automatic retry was made.";

async function api<T>(path: string, body?: object | FormData): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers:
        body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : undefined,
      body: body
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : undefined,
    });
  } catch {
    throw new Error(
      body
        ? uncertainMutation
        : "Unable to refresh galleries. Check your connection and try again.",
    );
  }
  if (!response.ok) {
    if (response.status === 400) {
      const data = await response.json().catch(() => null);
      throw new Error(
        typeof data?.message === "string" && data.message.length <= 500
          ? data.message
          : "Check the gallery details and selected photographs, then try again.",
      );
    }
    if (response.status === 401 || response.status === 403)
      throw new Error(
        "Your admin session needs sign-in or the gallery_admin role. Sign in again before continuing.",
      );
    if (response.status === 404 || (!body && response.status === 503))
      throw new Error(
        "Gallery administration is not enabled yet. Complete the one-time setup first.",
      );
    throw new Error(
      body
        ? uncertainMutation
        : "Unable to refresh galleries. Try again before changing this gallery.",
    );
  }
  try {
    return await response.json();
  } catch {
    throw new Error(
      body
        ? uncertainMutation
        : "Unable to read the gallery response. Refresh and try again.",
    );
  }
}

export async function makeWebJpeg(file: File): Promise<Blob> {
  if (file.type !== "image/jpeg" || file.size > 20 * 1024 * 1024)
    throw new Error("Choose JPEGs up to 20 MiB each.");
  const image = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const scale = Math.min(1, 2048 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Image conversion is unavailable in this browser.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Could not prepare web photo.")),
        "image/jpeg",
        0.85,
      ),
    );
    if (blob.size > 4 * 1024 * 1024)
      throw new Error(
        "Web export exceeds 4 MiB. Export a smaller JPEG and try again.",
      );
    return blob;
  } finally {
    image.close();
  }
}

export function GalleryAdmin() {
  const [checkedAt, setCheckedAt] = useState(0);
  const [auth, setAuth] = useState<"checking" | "denied" | "admin">("checking");
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [selected, setSelected] = useState<Gallery | null>(null);
  const [issuedLink, setIssuedLink] = useState<IssuedLink | null>(null);
  const link = issuedLink?.url ?? "";
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const files = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  // Bearer links stay only in this mounted component. Never browser storage.
  const load = useCallback(
    async (more?: string, current: Gallery | null = null) => {
      const page = await api<Page>(
        base + (more ? `?cursor=${encodeURIComponent(more)}` : ""),
      );
      let fresh = current
        ? page.galleries.find((gallery) => gallery.id === current.id)
        : undefined;
      if (current && !fresh) {
        try {
          fresh = (
            await api<{ gallery: Gallery }>(`${base}/${current.id}/details`)
          ).gallery;
        } catch (error) {
          if (active.current) {
            setSelected(null);
            setIssuedLink(null);
          }
          throw error;
        }
      }
      if (!active.current) return;
      const refreshedAt = Date.now();
      setCheckedAt(refreshedAt);
      setGalleries((previous) =>
        more
          ? [
              ...previous.map((gallery) =>
                fresh?.id === gallery.id ? fresh : gallery,
              ),
              ...page.galleries,
            ]
          : page.galleries,
      );
      if (fresh) setSelected(fresh);
      setIssuedLink((current) => {
        if (!current) return current;
        const record =
          fresh && current.galleryId === fresh.id
            ? fresh
            : page.galleries.find(
                (gallery) => gallery.id === current.galleryId,
              );
        return record &&
          (record.status !== "published" ||
            record.expiresAt <= refreshedAt ||
            record.accessTokenVersion !== current.accessTokenVersion)
          ? null
          : current;
      });
      setCursor(page.cursor);
    },
    [],
  );
  useEffect(() => {
    active.current = true;
    fetch("/.auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (data) => {
        if (!active.current) return;
        const principal = data.clientPrincipal;
        if (
          principal?.identityProvider !== "aad" ||
          !principal?.userRoles?.includes("gallery_admin")
        ) {
          setAuth("denied");
          return;
        }
        setBusy(true);
        setAuth("admin");
        try {
          await load();
        } catch (e) {
          if (active.current)
            setError(
              e instanceof Error ? e.message : "Unable to load galleries.",
            );
        } finally {
          if (active.current) setBusy(false);
        }
      })
      .catch(() => {
        if (active.current) {
          setAuth("denied");
          setError("Unable to load your admin session. Try signing in again.");
        }
      });
    return () => {
      active.current = false;
    };
  }, [load]);
  useEffect(() => {
    if (!busy) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [busy]);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  };
  const create = (form: HTMLFormElement) =>
    run(async () => {
      const values = new FormData(form);
      const result = await api<{
        gallery: Gallery;
        link: string;
        accessTokenVersion: number;
      }>(base, {
        title: values.get("title"),
        clientDisplayName: values.get("client"),
        message: values.get("message"),
        expiresAt: new Date(`${values.get("expiry")}T23:59:59`).toISOString(),
      });
      setSelected(result.gallery);
      setIssuedLink(issuedLinkFor(result.gallery.id, result));
      form.reset();
      setNotice(
        "Gallery created. Save its private link before leaving this page.",
      );
      await load(undefined, result.gallery);
    });
  const change = (action: "replace" | "revoke") =>
    run(async () => {
      if (
        !selected ||
        !window.confirm(
          action === "revoke"
            ? "Revoke this gallery link and all client sessions?"
            : "Replace the link? The previous link and all client sessions will stop working.",
        )
      )
        return;
      // A lost response may still have invalidated the old bearer link.
      setIssuedLink(null);
      const result = await api<{ link?: string; accessTokenVersion: number }>(
        `${base}/${selected.id}/${action}`,
        {},
      );
      setIssuedLink(
        result.link
          ? issuedLinkFor(selected.id, {
              link: result.link,
              accessTokenVersion: result.accessTokenVersion,
            })
          : null,
      );
      if (action === "revoke") setSelected({ ...selected, status: "revoked" });
      setNotice(
        action === "revoke"
          ? "Gallery access revoked."
          : "New private link created. Save it now; the previous link no longer works.",
      );
      await load(undefined, selected);
    });
  const upload = () =>
    run(async () => {
      const chosen = Array.from(files.current?.files ?? []);
      if (!selected || !chosen.length) return;
      let uploaded = 0;
      try {
        for (const file of chosen) {
          setNotice(
            `Preparing photo ${uploaded + 1} of ${chosen.length}. Keep this page open.`,
          );
          const web = await makeWebJpeg(file);
          const data = new FormData();
          data.append("web", web, "web.jpg");
          data.append("full", file, "full.jpg");
          data.append(
            "altText",
            file.name.replace(/\.[^.]+$/, "").slice(0, 500),
          );
          setNotice(
            `Uploading photo ${uploaded + 1} of ${chosen.length}. Keep this page open.`,
          );
          await api(`${base}/${selected.id}/assets`, data);
          uploaded++;
        }
        setNotice(
          `${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded. Web copies are ready alongside the original JPEGs.`,
        );
        if (files.current) files.current.value = "";
      } catch (e) {
        if (files.current) files.current.value = "";
        setNotice(
          `${uploaded} photo${uploaded === 1 ? "" : "s"} confirmed uploaded. Stopped at the next photo; no automatic retries.`,
        );
        throw e;
      }
    });
  return (
    <main className="min-h-screen bg-studio-base px-5 py-10 text-studio-text sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-studio-border pb-6">
          <div>
            <p className="text-xs uppercase tracking-[.25em] text-studio-muted">
              Blackburn Studio · Administration
            </p>
            <h1 className="mt-3 text-3xl">Client galleries</h1>
          </div>
          {auth === "admin" && (
            <a
              className={button}
              href="/.auth/logout?post_logout_redirect_uri=/admin/galleries"
            >
              Sign out of admin
            </a>
          )}
        </header>
        {error && (
          <p role="alert" className="mb-5 rounded border border-red-500/50 p-4">
            {error}
          </p>
        )}
        {auth === "checking" ? (
          <p role="status">Checking your access…</p>
        ) : auth === "denied" ? (
          <section className="max-w-lg space-y-5">
            <h2 className="text-xl">Sign in to manage galleries</h2>
            <p className="text-studio-muted">
              Use the Microsoft account assigned the gallery_admin role for
              Blackburn Studio.
            </p>
            <a
              className={button + " inline-block"}
              href="/.auth/login/aad?post_login_redirect_uri=/admin/galleries"
            >
              Sign in with Microsoft
            </a>
          </section>
        ) : (
          <>
            {notice && (
              <p
                role="status"
                className="mb-6 rounded border border-studio-border p-4"
              >
                {notice}
              </p>
            )}
            <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
              <section>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl">Your galleries</h2>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => run(() => load(undefined, selected))}
                  >
                    Refresh list
                  </button>
                </div>
                <ul className="space-y-3">
                  {galleries.map((g) => (
                    <li key={g.id}>
                      <button
                        className={
                          field +
                          " text-left " +
                          (selected?.id === g.id ? "border-studio-accent" : "")
                        }
                        disabled={busy}
                        onClick={() => {
                          setSelected(g);
                          setIssuedLink(null);
                          setNotice("");
                          setError("");
                        }}
                      >
                        <span className="block font-medium">{g.title}</span>
                        <span className="text-sm text-studio-muted">
                          {g.clientDisplayName || "Client gallery"} ·{" "}
                          {g.expiresAt <= checkedAt ? "expired" : g.status} ·{" "}
                          {new Date(g.expiresAt).toLocaleDateString()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!galleries.length && (
                  <p className="text-studio-muted">
                    No galleries yet. Create your first gallery.
                  </p>
                )}
                {cursor && (
                  <button
                    className={button + " mt-4"}
                    disabled={busy}
                    onClick={() => run(() => load(cursor, selected))}
                  >
                    Load more galleries
                  </button>
                )}
                <h2 className="mb-4 mt-10 text-xl">Create a gallery</h2>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void create(e.currentTarget);
                  }}
                >
                  <label className="block">
                    Gallery title
                    <input
                      className={field}
                      name="title"
                      required
                      maxLength={200}
                      disabled={busy}
                    />
                  </label>
                  <label className="block">
                    Client name
                    <input
                      className={field}
                      name="client"
                      maxLength={200}
                      disabled={busy}
                    />
                  </label>
                  <label className="block">
                    Welcome message
                    <textarea
                      className={field}
                      name="message"
                      maxLength={2000}
                      disabled={busy}
                    />
                  </label>
                  <label className="block">
                    Available until
                    <input
                      className={field}
                      type="date"
                      name="expiry"
                      required
                      disabled={busy}
                    />
                  </label>
                  <button className={button} disabled={busy}>
                    Create gallery
                  </button>
                </form>
              </section>
              <section className="rounded border border-studio-border p-5 sm:p-7">
                {selected ? (
                  <>
                    <p className="text-xs uppercase tracking-widest text-studio-muted">
                      Selected gallery
                    </p>
                    <h2 className="mb-2 mt-2 text-2xl">{selected.title}</h2>
                    <p className="mb-6 text-studio-muted">
                      {selected.clientDisplayName} · {selected.status}
                    </p>
                    {link ? (
                      <ClientLink key={link} link={link} />
                    ) : (
                      <p className="mb-6 text-sm text-studio-muted">
                        Previously created links cannot be retrieved. If you
                        have lost the link, replace it below.
                      </p>
                    )}
                    {selected.status === "published" &&
                      selected.expiresAt > checkedAt && (
                        <>
                          <h3 className="mb-3 text-lg">Upload photographs</h3>
                          <p className="mb-4 text-sm text-studio-muted">
                            Select JPEGs up to 20 MiB each. Web copies are
                            generated at up to 2,048 pixels on the longest edge.
                            Original JPEGs are preserved, including any embedded
                            metadata.
                          </p>
                          <label className="block">
                            JPEG photographs
                            <input
                              key={selected.id}
                              className={field + " mt-2"}
                              type="file"
                              accept="image/jpeg,.jpg,.jpeg"
                              multiple
                              ref={files}
                              disabled={busy}
                            />
                          </label>
                          <button
                            className={button + " mt-4"}
                            disabled={busy}
                            onClick={upload}
                          >
                            Upload selected photos
                          </button>
                          <div className="mt-10 flex flex-wrap gap-3 border-t border-studio-border pt-6">
                            <button
                              className={button}
                              disabled={busy}
                              onClick={() => change("replace")}
                            >
                              Replace client link
                            </button>
                            <button
                              className={button}
                              disabled={busy}
                              onClick={() => change("revoke")}
                            >
                              Revoke access
                            </button>
                          </div>
                        </>
                      )}
                  </>
                ) : (
                  <p className="text-studio-muted">
                    Select a gallery to upload photographs or manage access.
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ClientLink({ link }: { link: string }) {
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(
    () => () => {
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const manualCopy = () => {
    input.current?.focus();
    input.current?.select();
    setMessage(
      "Link selected. Press Ctrl+C (or Command+C), or use your device’s Copy command.",
    );
  };
  const copy = async () => {
    if (copying) return;
    const attempt = ++generation.current;
    if (!navigator.clipboard?.writeText) {
      manualCopy();
      return;
    }
    setCopying(true);
    setMessage("Allow clipboard access if your browser asks.");
    timer.current = setTimeout(() => {
      if (generation.current !== attempt) return;
      generation.current++;
      setCopying(false);
      manualCopy();
    }, 8000);
    try {
      await navigator.clipboard.writeText(link);
      if (generation.current === attempt) setMessage("Private link copied.");
    } catch {
      if (generation.current === attempt) manualCopy();
    } finally {
      if (generation.current === attempt) {
        if (timer.current) clearTimeout(timer.current);
        setCopying(false);
      }
    }
  };
  return (
    <div className="mb-8 space-y-3">
      <label className="block">
        Private client link
        <input
          ref={input}
          className={field}
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <p className="text-sm text-studio-muted">
        Save this link now. It cannot be recovered after leaving this view.
        Anyone with it can access the gallery until expiry or revocation.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={button}
          disabled={copying}
          onClick={() => void copy()}
        >
          {copying ? "Copying…" : "Copy client link"}
        </button>
        <a
          className={button + " inline-block"}
          href={link}
          target="_blank"
          rel="noreferrer"
        >
          Open gallery
        </a>
      </div>
      {message && (
        <p role="status" className="text-sm text-studio-muted">
          {message}
        </p>
      )}
    </div>
  );
}
