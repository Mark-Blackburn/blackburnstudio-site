import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClientGalleryDownloads } from "./ClientGalleryDownloads";
import { prepareGalleryZip } from "@/lib/client-galleries/downloads";
import { galleryAssetListRevision } from "@/lib/client-galleries/assetListRevision";
import { getSampleClientGallery, SAMPLE_CLIENT_GALLERY_ID } from "@/lib/client-galleries/fixtures/sampleClientGallery";

vi.mock("@/lib/client-galleries/downloads", () => ({ prepareGalleryZip: vi.fn() }));
const gallery = getSampleClientGallery(SAMPLE_CLIENT_GALLERY_ID)!;
const assets = gallery.assets.slice(0, 3).map(asset => ({ ...asset, webDownloadUrl: "/web", fullDownloadUrl: "/full" }));
const jobId = "z_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef";
const base = `/api/galleries/${gallery.id}/archives`;
const fetchMock = vi.fn();
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
const status = (state: string) => json({ jobId, status: state, photosCompleted: state === "ready" ? 2 : 0, photosTotal: 2 });
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_GALLERY_SERVER_ARCHIVES_ENABLED", "true");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(prepareGalleryZip).mockClear();
});
afterEach(() => {
  expect(prepareGalleryZip).not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function show() {
  return render(<ClientGalleryDownloads galleryId={gallery.id} title={gallery.title} assets={assets} selected={new Set([assets[1].id, assets[2].id])} onSelectionChange={vi.fn()} />);
}
async function start(variant: "web" | "full" = "web") {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: variant === "web" ? "Download selected · web" : "Download selected · full resolution" })); });
}
async function poll() { await act(async () => { await vi.advanceTimersByTimeAsync(2000); }); }
it.each(["web", "full"] as const)("posts the displayed revision and %s selection, then polls queued to ready", async variant => {
  fetchMock.mockResolvedValueOnce(status("queued")).mockResolvedValueOnce(status("processing")).mockResolvedValueOnce(status("ready"));
  show();
  await start(variant);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ variant, assetIds: [assets[1].id, assets[2].id], assetListRevision: galleryAssetListRevision(assets) });
  expect(fetchMock.mock.calls[0][0]).toBe(base);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", credentials: "same-origin" });
  expect(screen.queryByRole("link", { name: /Save ZIP/ })).not.toBeInTheDocument();
  await poll();
  expect(fetchMock.mock.calls[1][0]).toBe(`${base}/${jobId}`);
  await poll();
  expect(screen.getByRole("link", { name: "Save ZIP · 2 photos" })).toHaveAttribute("href", `${base}/${jobId}/download`);
});
it.each(["failed", "expired"])("reports %s without exposing a download", async state => {
  fetchMock.mockResolvedValueOnce(status("queued")).mockResolvedValueOnce(status(state));
  show(); await start(); await poll();
  expect(screen.getByRole("alert")).toHaveTextContent("Archive preparation did not complete");
  expect(screen.queryByRole("link", { name: /Save ZIP/ })).not.toBeInTheDocument();
});
it("stops during the polling delay without requesting status", async () => {
  fetchMock.mockResolvedValueOnce(status("queued"));
  show(); await start();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Stop waiting" })); });
  await poll();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status")).toHaveTextContent("Stopped waiting");
  expect(screen.queryByRole("link", { name: /Save ZIP/ })).not.toBeInTheDocument();
});
it.each(["stop", "unmount"])("ignores a late READY response after %s during polling", async action => {
  let finish!: (response: Response) => void;
  fetchMock.mockResolvedValueOnce(status("queued")).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = show(); await start(); await poll();
  const signal = fetchMock.mock.calls[1][1].signal as AbortSignal;
  if (action === "stop") fireEvent.click(screen.getByRole("button", { name: "Stop waiting" }));
  else view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => { finish(status("ready")); });
  expect(screen.queryByRole("link", { name: /Save ZIP/ })).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("explains a stale gallery rejection without polling or exposing a download", async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: "Gallery photographs changed. Refresh the gallery and select your photos again." }), { status: 400 }));
  show(); await start();
  expect(screen.getByRole("alert")).toHaveTextContent("Refresh the gallery and select your photos again");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("link", { name: /Save ZIP/ })).not.toBeInTheDocument();
});
