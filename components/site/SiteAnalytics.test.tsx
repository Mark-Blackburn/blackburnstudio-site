import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SiteAnalytics from "@/components/site/SiteAnalytics";

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <div data-testid="google-analytics" data-ga-id={gaId} />
  ),
}));

describe("SiteAnalytics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("omits Google Analytics when the measurement ID is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");

    render(<SiteAnalytics />);

    expect(screen.queryByTestId("google-analytics")).not.toBeInTheDocument();
  });

  it("configures Google Analytics from the environment", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");

    render(<SiteAnalytics />);

    expect(screen.getByTestId("google-analytics")).toHaveAttribute(
      "data-ga-id",
      "G-TEST123",
    );
  });
});