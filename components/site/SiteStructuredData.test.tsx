import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SiteStructuredData from "@/components/site/SiteStructuredData";

const { mockPathname } = vi.hoisted(() => ({
  mockPathname: vi.fn(() => "/"),
}));

vi.mock("next/navigation", () => ({
  usePathname: mockPathname,
}));

describe("SiteStructuredData", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/");
  });

  it("renders the existing structured data on public routes", () => {
    const { container } = render(<SiteStructuredData />);

    expect(container.querySelector('script[type="application/ld+json"]')).toBeTruthy();
  });

  it.each(["/clients/g_opaque", "/admin/galleries"]) (
    "omits structured data on the private route %s",
    (pathname) => {
      mockPathname.mockReturnValue(pathname);

      const { container } = render(<SiteStructuredData />);

      expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
    },
  );
});