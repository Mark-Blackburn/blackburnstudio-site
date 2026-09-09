import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SiteAnalytics from "@/components/site/SiteAnalytics";

const { gtagMock, mockPathname, mockSearchParams } = vi.hoisted(() => ({
  gtagMock: vi.fn(),
  mockPathname: vi.fn(() => "/"),
  mockSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({
  usePathname: mockPathname,
  useSearchParams: mockSearchParams,
}));

vi.mock("next/script", () => ({
  default: ({
    id,
    src,
    onReady,
    dangerouslySetInnerHTML,
  }: {
    id: string;
    src?: string;
    onReady?: () => void;
    dangerouslySetInnerHTML?: { __html: string };
  }) => (
    <button
      type="button"
      data-testid={id}
      data-src={src}
      data-script={dangerouslySetInnerHTML?.__html}
      onClick={onReady}
    >
      Ready
    </button>
  ),
}));

const measurementId = "G-TEST123";
const disableKey = `ga-disable-${measurementId}`;

function pageViewCalls() {
  return gtagMock.mock.calls.filter(
    ([command, eventName]) => command === "event" && eventName === "page_view",
  );
}

function setRoute(pathname: string, search = "") {
  const query = search ? `?${search}` : "";
  window.history.replaceState({}, "", `${pathname}${query}`);
  mockPathname.mockReturnValue(pathname);
  mockSearchParams.mockReturnValue(new URLSearchParams(search));
}

function initializeAnalytics() {
  fireEvent.click(screen.getByTestId("blackburn-ga-init"));
}

describe("SiteAnalytics", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", measurementId);
    gtagMock.mockReset();
    window.gtag = gtagMock;
    setRoute("/");
    Reflect.deleteProperty(window, disableKey);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(window, disableKey);
    delete window.gtag;
  });

  it("omits analytics when the measurement ID is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");

    render(<SiteAnalytics />);

    expect(screen.queryByTestId("blackburn-ga-init")).not.toBeInTheDocument();
    expect(gtagMock).not.toHaveBeenCalled();
  });

  it.each(["/clients/example", "/admin/galleries"])(
    "does not initialize analytics on the private cold load %s",
    (pathname) => {
      setRoute(pathname);

      render(<SiteAnalytics />);

      expect(screen.queryByTestId("blackburn-ga-init")).not.toBeInTheDocument();
      expect(screen.queryByTestId("blackburn-ga-loader")).not.toBeInTheDocument();
      expect(Reflect.get(window, disableKey)).toBe(true);
      expect(pageViewCalls()).toHaveLength(0);
    },
  );

  it("initializes without an automatic page view and sends one public cold-load page view", async () => {
    render(
      <StrictMode>
        <SiteAnalytics />
      </StrictMode>,
    );

    expect(screen.getByTestId("blackburn-ga-init")).toHaveAttribute(
      "data-script",
      expect.stringContaining(
      "'send_page_view': false",
      ),
    );
    expect(screen.getByTestId("blackburn-ga-loader")).toHaveAttribute(
      "data-src",
      `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
    );
    expect(pageViewCalls()).toHaveLength(0);

    initializeAnalytics();

    await waitFor(() => expect(pageViewCalls()).toHaveLength(1));
    expect(pageViewCalls()[0]).toEqual([
      "event",
      "page_view",
      {
        page_title: "Blackburn Studio",
        page_location: "http://localhost:3000/",
        page_path: "/",
      },
    ]);
  });

  it.each(["/clients/g_opaque", "/admin/galleries"])(
    "disables measurement and emits no private data after navigation to %s",
    async (pathname) => {
      const view = render(<SiteAnalytics />);
      initializeAnalytics();
      await waitFor(() => expect(pageViewCalls()).toHaveLength(1));

      setRoute(pathname, "access=future-secret");
      view.rerender(<SiteAnalytics />);

      expect(Reflect.get(window, disableKey)).toBe(true);
      expect(pageViewCalls()).toHaveLength(1);
      expect(JSON.stringify(gtagMock.mock.calls)).not.toContain(pathname);
      expect(JSON.stringify(gtagMock.mock.calls)).not.toContain("future-secret");
    },
  );

  it("re-enables measurement and sends one fresh public page view after a private route", async () => {
    setRoute("/clients/g_opaque", "access=future-secret");
    const view = render(<SiteAnalytics />);
    expect(Reflect.get(window, disableKey)).toBe(true);

    setRoute("/about");
    view.rerender(<SiteAnalytics />);
    initializeAnalytics();

    await waitFor(() => expect(pageViewCalls()).toHaveLength(1));
    expect(Reflect.get(window, disableKey)).toBe(false);
    expect(pageViewCalls()[0][2]).toMatchObject({
      page_location: "http://localhost:3000/about",
      page_path: "/about",
    });
    expect(JSON.stringify(gtagMock.mock.calls)).not.toContain("g_opaque");
    expect(JSON.stringify(gtagMock.mock.calls)).not.toContain("future-secret");
  });

  it("sends one page view per public navigation without rerender duplicates", async () => {
    const view = render(<SiteAnalytics />);
    initializeAnalytics();
    await waitFor(() => expect(pageViewCalls()).toHaveLength(1));

    setRoute("/about");
    view.rerender(<SiteAnalytics />);
    await waitFor(() => expect(pageViewCalls()).toHaveLength(2));

    view.rerender(<SiteAnalytics />);
    expect(pageViewCalls()).toHaveLength(2);
    expect(pageViewCalls().map((call) => call[2])).toEqual([
      expect.objectContaining({ page_path: "/" }),
      expect.objectContaining({ page_path: "/about" }),
    ]);
  });

  it("records public query-string navigation once", async () => {
    const view = render(<SiteAnalytics />);
    initializeAnalytics();
    await waitFor(() => expect(pageViewCalls()).toHaveLength(1));

    setRoute("/", "source=portfolio");
    view.rerender(<SiteAnalytics />);
    await waitFor(() => expect(pageViewCalls()).toHaveLength(2));

    expect(pageViewCalls()[1][2]).toMatchObject({
      page_location: "http://localhost:3000/?source=portfolio",
      page_path: "/?source=portfolio",
    });
  });

  it.each(["/clientservices", "/administration"])(
    "does not treat the public prefix-like route %s as private",
    async (pathname) => {
      setRoute(pathname);
      render(<SiteAnalytics />);

      expect(screen.getByTestId("blackburn-ga-init")).toBeInTheDocument();
      initializeAnalytics();

      await waitFor(() => expect(pageViewCalls()).toHaveLength(1));
      expect(Reflect.get(window, disableKey)).toBe(false);
      expect(pageViewCalls()[0][2]).toMatchObject({ page_path: pathname });
    },
  );
});