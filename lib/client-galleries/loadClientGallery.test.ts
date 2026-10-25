import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGallerySessionCoordinator, loadClientGallery, logoutClientGallery, takeGalleryFragment } from "./loadClientGallery";

const id = "g_privateGallery123456";
const assetId = "a_privateAsset12345678";
const token = "t".repeat(43);
const path = `/api/galleries/${id}/assets/${assetId}`;
const gallery = { id, title: "Private test", clientDisplayName: "Synthetic client", expiresAt: "2026-11-01T00:00:00Z",
  assets: [{ id: assetId, width: 100, height: 150, altText: "Test image", displayOrder: 0, orientation: "portrait",
    webImageUrl: `${path}/view`, webDownloadUrl: `${path}/web`, fullDownloadUrl: `${path}/full` }] };
const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); window.history.replaceState({}, "", "/"); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("private gallery browser transport", () => {
  it("removes fragments before exchange, uses same-origin cookies and does not persist the token", async () => {
    window.history.replaceState({}, "", `/clients/${id}#access=${token}`);
    const value = takeGalleryFragment(); expect(window.location.hash).toBe("");
    fetchMock.mockResolvedValueOnce(json({ success: true })).mockResolvedValueOnce(json(gallery));
    expect(await loadClientGallery(id, value)).toMatchObject(gallery);
    expect(fetchMock).toHaveBeenNthCalledWith(1, `/api/galleries/${id}/exchange`, expect.objectContaining({ method: "POST", body: JSON.stringify({ token }),
      credentials: "same-origin", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/galleries/${id}`, expect.objectContaining({ credentials: "same-origin" }));
    expect(window.sessionStorage.length).toBe(0); expect(window.localStorage.length).toBe(0);
  });
  it("clears malformed fragments and fails without a request", async () => {
    window.history.replaceState({}, "", `/clients/${id}#access=invalid`);
    await expect(loadClientGallery(id, takeGalleryFragment())).rejects.toThrow("Gallery unavailable");
    expect(window.location.hash).toBe(""); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("loads a returning session without resending a bearer token", async () => {
    fetchMock.mockResolvedValue(json(gallery)); await loadClientGallery(id);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/galleries/${id}`);
  });
  it.each([403, 404, 429, 503])("does not retry failed exchange HTTP %s", async status => {
    fetchMock.mockResolvedValue(json({}, status)); await expect(loadClientGallery(id, token)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("rejects HTML fallbacks and cross-gallery or external image/download URLs", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>", { headers: { "Content-Type": "text/html" } }));
    await expect(loadClientGallery(id)).rejects.toThrow();
    for (const property of ["webImageUrl", "webDownloadUrl", "fullDownloadUrl"]) {
      fetchMock.mockResolvedValueOnce(json({ ...gallery, assets: [{ ...gallery.assets[0], [property]: "https://other.example/private.jpg?sig=secret" }] }));
      await expect(loadClientGallery(id)).rejects.toThrow();
    }
    fetchMock.mockResolvedValueOnce(json({ ...gallery, id: "g_otherGallery12345678" }));
    await expect(loadClientGallery(id)).rejects.toThrow();
  });
  it("removes unexpected internal fields from the loaded DTO", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...gallery, clientEmail: "secret@example.test", accessTokenHash: "secret",
      assets: [{ ...gallery.assets[0], fullBlobPath: "secret" }] }));
    expect(JSON.stringify(await loadClientGallery(id))).not.toMatch(/secret|clientEmail|fullBlobPath|accessTokenHash/);
  });
  it("clears only the chosen gallery session through same-origin logout", async () => {
    fetchMock.mockResolvedValue(json({ success: true })); await logoutClientGallery(id);
    expect(fetchMock).toHaveBeenCalledWith(`/api/galleries/${id}/logout`, expect.objectContaining({ method: "POST", credentials: "same-origin" }));
  });
  it("aborts a stalled request without retrying", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")))));
    const pending = loadClientGallery(id); const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(15000); await assertion; expect(fetchMock).toHaveBeenCalledOnce();
  });
});


describe("gallery cookie operation ordering", () => {
  it("orders overlapping exchanges, logout and a later reopen across callers", async () => {
    let releaseFirst!: (value: Response) => void;
    const first = new Promise<Response>(resolve => { releaseFirst = resolve; });
    const operations: string[] = [];
    let authorized = false;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith("/exchange")) {
        const value = JSON.parse(init.body as string).token;
        operations.push(value);
        if (value === token) await first;
        authorized = true;
        return json({ success: true });
      }
      if (url.endsWith("/logout")) {
        operations.push("logout"); authorized = false;
        return json({ success: true });
      }
      return json(authorized ? gallery : {}, authorized ? 200 : 404);
    });
    const session = createGallerySessionCoordinator();
    const oldLoad = session.load(id, token);
    const newLoad = session.load(id, "u".repeat(43));
    const logout = session.logout(id);
    const reopened = session.load(id, "v".repeat(43));
    await vi.waitFor(() => expect(operations).toEqual([token]));
    releaseFirst(json({ success: true }));
    await Promise.all([oldLoad, newLoad, logout, reopened]);
    expect(operations).toEqual([token, "u".repeat(43), "logout", "v".repeat(43)]);
    expect(authorized).toBe(true);
    await session.logout(id);
    expect(authorized).toBe(false);
    await expect(session.load(id)).rejects.toThrow("Gallery unavailable");
  });

  it("still executes logout after a rejected exchange", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json({ success: true }));
    const session = createGallerySessionCoordinator();
    const exchange = session.load(id, token);
    const logout = session.logout(id);
    await expect(exchange).rejects.toThrow("Gallery unavailable");
    await expect(logout).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      `/api/galleries/${id}/exchange`, `/api/galleries/${id}/logout`,
    ]);
  });
});


it.each([250, 300, 301])("validates a gallery with %s photos against the 300-photo limit", async (count) => {
  const assets = Array.from({ length: count }, (_, index) => {
    const assetId = `a_${String(index).padStart(22, "0")}`;
    const path = `/api/galleries/${id}/assets/${assetId}`;
    return { ...gallery.assets[0], id: assetId, displayOrder: index,
      webImageUrl: `${path}/view`, webDownloadUrl: `${path}/web`, fullDownloadUrl: `${path}/full` };
  });
  fetchMock.mockResolvedValue(json({ ...gallery, assets }));
  if (count <= 300) expect((await loadClientGallery(id)).assets).toHaveLength(count);
  else await expect(loadClientGallery(id)).rejects.toThrow("Gallery unavailable");
});
