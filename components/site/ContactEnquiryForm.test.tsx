import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ContactEnquiryForm from "@/components/site/ContactEnquiryForm";
import { submitContactForm } from "@/lib/actions/submitContactForm";

vi.mock("@/lib/actions/submitContactForm", () => ({
  submitContactForm: vi.fn(),
}));

const submitContactFormMock = vi.mocked(submitContactForm);

describe("ContactEnquiryForm error summary focus targets", () => {
  beforeEach(() => {
    submitContactFormMock.mockReset();
    submitContactFormMock.mockResolvedValue({ success: true, message: "ok" });
  });

  it("focuses the name input from the error summary", async () => {
    const user = userEvent.setup();
    render(<ContactEnquiryForm />);

    await user.click(screen.getByRole("button", { name: "Send enquiry" }));
    await user.click(screen.getByRole("button", { name: "Please enter your name." }));

    expect(document.activeElement).toHaveAttribute("id", "contact-name");
  });

  it("focuses the first service checkbox from the error summary", async () => {
    const user = userEvent.setup();
    render(<ContactEnquiryForm />);

    await user.click(screen.getByRole("button", { name: "Send enquiry" }));
    await user.click(screen.getByRole("button", { name: "Select at least one service." }));

    expect(document.activeElement).toHaveAttribute("id", "contact-service-new-website");
  });

  it("focuses the contact-method radio group via first option mapping", async () => {
    const user = userEvent.setup();
    submitContactFormMock.mockResolvedValue({
      success: false,
      errors: [{ field: "contactMethod", message: "Choose a preferred contact method." }],
      message: "The enquiry could not be sent.",
    });

    render(<ContactEnquiryForm />);

    await user.type(screen.getByLabelText("Name *"), "Test Person");
    await user.type(screen.getByLabelText("Email address *"), "test@example.com");
    await user.click(screen.getByLabelText("New website"));
    await user.type(
      screen.getByLabelText("Tell me about the website or project *"),
      "This message is definitely longer than twenty characters.",
    );
    await user.click(
      screen.getByLabelText(
        "I consent to Blackburn Studio using these details to respond to my enquiry. *",
      ),
    );

    await user.click(screen.getByRole("button", { name: "Send enquiry" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Choose a preferred contact method." })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Choose a preferred contact method." }));

    expect(document.activeElement).toHaveAttribute("id", "contact-method-email");
  });

  it("focuses the consent checkbox from the error summary", async () => {
    const user = userEvent.setup();
    render(<ContactEnquiryForm />);

    await user.click(screen.getByRole("button", { name: "Send enquiry" }));
    await user.click(screen.getByRole("button", { name: "You must consent before submitting." }));

    expect(document.activeElement).toHaveAttribute("id", "contact-consent");
  });
});
