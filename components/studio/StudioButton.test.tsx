import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import StudioButton from "./StudioButton";

describe("StudioButton", () => {
  it("renders a native button with safe defaults and forwards button props", () => {
    const onClick = vi.fn();
    render(
      <StudioButton
        variant="primary"
        className="custom-button"
        disabled
        onClick={onClick}
      >
        Generate
      </StudioButton>,
    );

    const button = screen.getByRole("button", { name: "Generate" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass(
      "inline-flex",
      "min-h-11",
      "bg-white",
      "custom-button",
    );
    expect(button).not.toHaveAttribute("variant");

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects an explicit native type and forwards click handlers", () => {
    const onClick = vi.fn();
    render(
      <StudioButton type="submit" onClick={onClick}>
        Submit
      </StudioButton>,
    );

    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("border", "min-h-11");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders internal links with merged base, variant and caller classes", () => {
    render(
      <StudioButton href="/tools" className="custom-link">
        Browse tools
      </StudioButton>,
    );

    const link = screen.getByRole("link", { name: "Browse tools" });
    expect(link).toHaveAttribute("href", "/tools");
    expect(link).toHaveClass(
      "inline-flex",
      "min-h-11",
      "border",
      "custom-link",
    );
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  it("protects explicitly external HTTP links opened in a new tab", () => {
    render(
      <StudioButton href="https://example.com" external>
        External site
      </StudioButton>,
    );

    const link = screen.getByRole("link", { name: "External site" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
