import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ContactEnquiryForm from "@/components/site/ContactEnquiryForm";
import { submitContactForm } from "@/lib/actions/submitContactForm";

vi.mock("@/lib/actions/submitContactForm", () => ({
  submitContactForm: vi.fn(),
}));

const sendGAEventMock = vi.hoisted(() => vi.fn());

vi.mock("@next/third-parties/google", () => ({
  sendGAEvent: sendGAEventMock,
}));

const submitContactFormMock = vi.mocked(submitContactForm);

async function completeValidEnquiry(user: ReturnType<typeof userEvent.setup>) {
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
}

describe("ContactEnquiryForm error summary focus targets", () => {
  beforeEach(() => {
    submitContactFormMock.mockReset();
    submitContactFormMock.mockResolvedValue({ success: true, message: "ok" });
    sendGAEventMock.mockReset();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("formats a valid 9-digit mobile on blur and clears phone error", async () => {
    const user = userEvent.setup();
    render(<ContactEnquiryForm />);

    const phoneInput = screen.getByLabelText("Phone number");

    await user.type(phoneInput, "123");
    await user.tab();
    expect(screen.getByText("Enter a valid Australian phone number.")).toBeInTheDocument();

    await user.clear(phoneInput);
    await user.type(phoneInput, "424961192");
    await user.tab();

    await waitFor(() => {
      expect(phoneInput).toHaveValue("0424 961 192");
    });

    expect(screen.queryByText("Enter a valid Australian phone number.")).not.toBeInTheDocument();
  });

  it("tracks one lead after a confirmed successful enquiry", async () => {
    const user = userEvent.setup();
    render(<ContactEnquiryForm />);

    await completeValidEnquiry(user);
    await user.click(screen.getByRole("button", { name: "Send enquiry" }));

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Enquiry submission success" })).toBeInTheDocument();
    });

    expect(sendGAEventMock).toHaveBeenCalledOnce();
    expect(sendGAEventMock).toHaveBeenCalledWith("event", "generate_lead", {
      form_name: "project_enquiry",
    });
  });

  it("does not attempt lead tracking when analytics is not configured", async () => {
    const user = userEvent.setup();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    render(<ContactEnquiryForm />);

    await completeValidEnquiry(user);
    await user.click(screen.getByRole("button", { name: "Send enquiry" }));

    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Enquiry submission success" })).toBeInTheDocument();
    });

    expect(sendGAEventMock).not.toHaveBeenCalled();
  });

  it("does not track a lead when the server rejects the enquiry", async () => {
    const user = userEvent.setup();
    submitContactFormMock.mockResolvedValue({
      success: false,
      message: "The enquiry could not be sent.",
    });
    render(<ContactEnquiryForm />);

    await completeValidEnquiry(user);
    await user.click(screen.getByRole("button", { name: "Send enquiry" }));

    await waitFor(() => {
      expect(screen.getByText("The enquiry could not be sent.")).toBeInTheDocument();
    });

    expect(sendGAEventMock).not.toHaveBeenCalled();
  });

  it("does not track a lead when client validation fails", async () => {
    const user = userEvent.setup();
    render(<ContactEnquiryForm />);

    await user.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(sendGAEventMock).not.toHaveBeenCalled();
  });
});
