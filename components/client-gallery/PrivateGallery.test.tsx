import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/clients/g_privateGallery123456" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
import { ClientGalleryShell } from "./ClientGalleryShell";

const id = "g_privateGallery123456";
const asset = "a_privateAsset12345678";
const path = `/api/galleries/${id}/assets/${asset}`;
const dto = { id, title: "Synthetic private gallery", expiresAt: "2026-11-01T00:00:00Z",
  assets: [{ id: asset, altText: "Synthetic portrait", width: 100, height: 150, orientation: "portrait", displayOrder: 0,
    webImageUrl: `${path}/view`, webDownloadUrl: `${path}/web`, fullDownloadUrl: `${path}/full` }] };
const fetchMock = vi.fn();
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  navigation.pathname = `/clients/${id}`;
  window.history.replaceState({}, "", navigation.pathname);
  fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("private gallery shell", () => {
  it("exchanges once under Strict Mode and removes the access fragment", async () => {
    window.history.replaceState({}, "", `${navigation.pathname}#access=${"t".repeat(43)}`);
    fetchMock.mockResolvedValueOnce(json({ success: true })).mockResolvedValueOnce(json(dto));
    render(<StrictMode><ClientGalleryShell /></StrictMode>);
    expect(await screen.findByRole("heading", { name: dto.title })).toBeInTheDocument();
    expect(window.location.hash).toBe("");
    expect(fetchMock.mock.calls.filter(call => call[0].endsWith("/exchange"))).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reopens a hash-only link after logout with one new exchange under Strict Mode", async () => {
    window.history.replaceState({}, "", `${navigation.pathname}#access=${"t".repeat(43)}`);
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/exchange")) {
        expect(window.location.hash).toBe("");
        return json({ success: true });
      }
      return json(url.endsWith("/logout") ? { success: true } : dto);
    });
    render(<StrictMode><ClientGalleryShell /></StrictMode>);
    await screen.findByRole("heading", { name: dto.title });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { name: "This gallery is unavailable." });

    // Native fragment navigation: keep the document and mounted shell alive.
    window.location.hash = `access=${"u".repeat(43)}`;
    await screen.findByRole("heading", { name: dto.title });
    expect(window.location.hash).toBe("");
    const exchanges = fetchMock.mock.calls.filter(call => call[0].endsWith("/exchange"));
    expect(exchanges).toHaveLength(2);
    expect(JSON.parse(exchanges[1][1].body)).toEqual({ token: "u".repeat(43) });
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(fetchMock.mock.calls.filter(call => call[0] === `/api/galleries/${id}`)).toHaveLength(3));
    expect(fetchMock.mock.calls.filter(call => call[0].endsWith("/exchange"))).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { name: "This gallery is unavailable." });
  });

  it("drains an obsolete exchange before reopening and signing out", async () => {
    let finishFirst!: (response: Response) => void;
    const firstExchange = new Promise<Response>(resolve => { finishFirst = resolve; });
    let authorized = false;
    const mutations: string[] = [];
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith("/exchange")) {
        const token = JSON.parse(init.body as string).token;
        mutations.push(token);
        if (token === "t".repeat(43)) await firstExchange;
        authorized = true;
        return json({ success: true });
      }
      if (url.endsWith("/logout")) {
        mutations.push("logout"); authorized = false;
        return json({ success: true });
      }
      return json(authorized ? dto : {}, authorized ? 200 : 404);
    });
    window.history.replaceState({}, "", `${navigation.pathname}#access=${"t".repeat(43)}`);
    const view = render(<StrictMode><ClientGalleryShell /></StrictMode>);
    await waitFor(() => expect(mutations).toEqual(["t".repeat(43)]));
    window.location.hash = `access=${"u".repeat(43)}`;
    await waitFor(() => expect(window.location.hash).toBe(""));
    expect(screen.getByRole("status")).toHaveTextContent("Loading private gallery");
    expect(mutations).toHaveLength(1);
    await act(async () => { finishFirst(json({ success: true })); });
    await screen.findByRole("heading", { name: dto.title });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mutations).toEqual(["t".repeat(43), "u".repeat(43), "logout"]));
    expect(authorized).toBe(false);
    // A fresh shell models reload using the browser's resulting cookie state.
    view.unmount();
    render(<StrictMode><ClientGalleryShell /></StrictMode>);
    await screen.findByRole("heading", { name: "This gallery is unavailable." });
    expect(authorized).toBe(false);
    expect(mutations).toHaveLength(3);
  });

  it.each([200, 503])("waits for pending logout (%s) before exchanging a reopened link", async status => {
    let finishLogout!: (response: Response) => void;
    const logout = new Promise<Response>(resolve => { finishLogout = resolve; });
    let authorized = true;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/logout")) {
        const response = await logout;
        authorized = false; // Model the late response clearing the browser cookie.
        return response;
      }
      if (url.endsWith("/exchange")) {
        expect(window.location.hash).toBe("");
        authorized = true;
        return json({ success: true });
      }
      return json(authorized ? dto : {}, authorized ? 200 : 404);
    });
    render(<StrictMode><ClientGalleryShell /></StrictMode>);
    await screen.findByRole("heading", { name: dto.title });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { name: "This gallery is unavailable." });
    window.location.hash = `access=${"u".repeat(43)}`;
    await waitFor(() => expect(window.location.hash).toBe(""));
    expect(screen.getByRole("status")).toHaveTextContent("Loading private gallery");
    expect(fetchMock.mock.calls.filter(call => call[0].endsWith("/exchange"))).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => { finishLogout(json({ success: status === 200 }, status)); });
    await screen.findByRole("heading", { name: dto.title });
    expect(fetchMock.mock.calls.filter(call => call[0].endsWith("/exchange"))).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(fetchMock.mock.calls.filter(call => call[0] === `/api/galleries/${id}`)).toHaveLength(3));
    expect(screen.getByRole("heading", { name: dto.title })).toBeInTheDocument();
    expect(authorized).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Open image 1: Synthetic portrait" }));
    expect(screen.getByRole("link", { name: "Download full-resolution image" })).toHaveAttribute("href", `${path}/full`);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  });

  it("renders private download actions in the viewer and signs out", async () => {
    fetchMock.mockResolvedValueOnce(json(dto)).mockResolvedValueOnce(json({ success: true }));
    render(<ClientGalleryShell />);
    fireEvent.click(await screen.findByRole("button", { name: "Open image 1: Synthetic portrait" }));
    expect(screen.getByRole("link", { name: "Download web-size image" })).toHaveAttribute("href", `${path}/web`);
    expect(screen.getByRole("link", { name: "Download full-resolution image" })).toHaveAttribute("href", `${path}/full`);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "This gallery is unavailable." })).toBeInTheDocument();
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(`/api/galleries/${id}/logout`);
  });

  it.each([false, true])("recovers metadata on focus after initial GET failure (exchange=%s)", async exchange => {
    if (exchange) {
      window.history.replaceState({}, "", `${navigation.pathname}#access=${"t".repeat(43)}`);
      fetchMock.mockResolvedValueOnce(json({ success: true }));
    }
    fetchMock.mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json(dto));
    render(<StrictMode><ClientGalleryShell /></StrictMode>);
    await screen.findByRole("heading", { name: "This gallery is unavailable." });
    fireEvent(window, new Event("focus"));
    expect(await screen.findByRole("heading", { name: dto.title })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(call => call[0].endsWith("/exchange"))).toHaveLength(exchange ? 1 : 0);
    expect(fetchMock.mock.calls.filter(call => call[0] === `/api/galleries/${id}`)).toHaveLength(2);
    expect(window.location.hash).toBe("");
  });

  it("recovers on the timer after initial metadata failure", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json(dto));
    render(<ClientGalleryShell />);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByRole("heading", { name: "This gallery is unavailable." })).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByRole("heading", { name: dto.title })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("requires site-data removal after failed logout and does not restore the gallery on focus", async () => {
    fetchMock.mockResolvedValueOnce(json(dto)).mockResolvedValueOnce(json({}, 503));
    render(<ClientGalleryShell />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("clear this website’s cookies or site data");
    expect(alert).toHaveTextContent("Closing the browser may keep you signed in");
    fireEvent(window, new Event("focus"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("heading", { name: dto.title })).not.toBeInTheDocument();
  });

  it("removes displayed metadata when the session is revoked on refresh", async () => {
    fetchMock.mockResolvedValueOnce(json(dto)).mockResolvedValueOnce(json({}, 404));
    render(<ClientGalleryShell />);
    await screen.findByRole("heading", { name: dto.title });
    fireEvent(window, new Event("focus"));
    await screen.findByRole("heading", { name: "This gallery is unavailable." });
    expect(screen.queryByRole("heading", { name: dto.title })).not.toBeInTheDocument();
  });

  it("does not retain a prior gallery while navigating to an unauthorized one", async () => {
    fetchMock.mockResolvedValueOnce(json(dto)).mockResolvedValueOnce(json({}, 404));
    const view = render(<ClientGalleryShell />);
    await screen.findByRole("heading", { name: dto.title });
    navigation.pathname = "/clients/g_anotherGallery12345";
    view.rerender(<ClientGalleryShell />);
    expect(screen.queryByRole("heading", { name: dto.title })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "This gallery is unavailable." })).toBeInTheDocument());
  });
});
