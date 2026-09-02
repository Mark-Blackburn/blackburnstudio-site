import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ToolCard from "@/components/tools/ToolCard";

describe("ToolCard", () => {
  const defaultProps = {
    title: "Example tool",
    summary: "A practical example tool.",
    href: "/tools/example",
    ctaLabel: "Open example tool",
    features: ["Example feature"],
    platform: "Windows",
    availability: "Free download",
  };

  it("renders the explicit CTA label without requiring an image", () => {
    render(
      <ToolCard {...defaultProps} />,
    );

    expect(
      screen.getByRole("link", { name: "Open example tool" }),
    ).toHaveAttribute("href", "/tools/example");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("renders an optional image with its supplied alt text", () => {
    render(
      <ToolCard
        {...defaultProps}
        imageSrc={{
          src: "/tools/example/example.webp",
          width: 1600,
          height: 900,
        }}
        imageAlt="Example tool application interface"
      />,
    );

    expect(
      screen.getByRole("img", { name: "Example tool application interface" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Example tool application interface" }),
    ).toHaveAttribute("href", "/tools/example");
    expect(
      screen.getByRole("link", { name: "Open example tool" }),
    ).toHaveAttribute("href", "/tools/example");
  });
});