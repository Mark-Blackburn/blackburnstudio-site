import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSearchParamsMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/lib/actions/submitContactForm", () => ({
  submitContactForm: vi.fn(),
}));

import ContactEnquiryFormFromSearchParams from "@/components/site/ContactEnquiryFormFromSearchParams";

describe("ContactEnquiryFormFromSearchParams", () => {
  beforeEach(() => {
    useSearchParamsMock.mockReset();
  });

  it("preselects the service from the URL query", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("service=photography"),
    );

    render(<ContactEnquiryFormFromSearchParams />);

    expect(screen.getByLabelText("Photography")).toBeChecked();
  });

  it("preserves repeated service parameters and existing aliases", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams(
        "service=websites&service=microsoft-365&service=invalid",
      ),
    );

    render(<ContactEnquiryFormFromSearchParams />);

    expect(screen.getByLabelText("New website")).toBeChecked();
    expect(screen.getByLabelText("Microsoft 365")).toBeChecked();
    expect(screen.getByLabelText("Photography")).not.toBeChecked();
  });

  it("preserves in-progress form state after query-only navigation", async () => {
    const user = userEvent.setup();
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("service=photography"),
    );
    const view = render(<ContactEnquiryFormFromSearchParams />);

    await user.type(screen.getByLabelText("Name *"), "Test Person");
    await user.type(
      screen.getByLabelText("Tell me about the photography you need *"),
      "Photography enquiry already in progress.",
    );
    await user.click(screen.getByLabelText("New website"));

    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("service=microsoft-365"),
    );
    view.rerender(<ContactEnquiryFormFromSearchParams />);

    expect(screen.getByLabelText("Name *")).toHaveValue("Test Person");
    expect(
      screen.getByLabelText("Tell me what you’re working on *"),
    ).toHaveValue("Photography enquiry already in progress.");
    expect(screen.getByLabelText("Photography")).toBeChecked();
    expect(screen.getByLabelText("New website")).toBeChecked();
    expect(screen.getByLabelText("Microsoft 365")).not.toBeChecked();
  });
});
