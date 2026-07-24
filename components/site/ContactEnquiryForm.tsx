"use client";

import { useMemo, useState } from "react";

import { StudioButton } from "@/components/studio";

const enquiryTypes = [
  "New website",
  "Website rebuild or improvement",
  "Online store",
  "Domain or managed hosting",
  "Website migration",
  "Microsoft 365",
  "Ongoing support",
  "Something else",
] as const;

const existingSetupOptions = ["Yes", "No", "Not sure"] as const;

const fieldClassName =
  "mt-2 w-full rounded-xl border border-studio-border/80 bg-studio-base/35 px-3 py-2.5 text-sm text-studio-text placeholder:text-studio-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base";

function buildMessage(enquiryType: string, existingSetup: string, problem: string) {
  return [
    `Enquiry type: ${enquiryType}`,
    `Existing website/domain/Microsoft 365 environment: ${existingSetup}`,
    "",
    "What I am trying to achieve or solve:",
    problem.trim() || "(No additional detail provided)",
  ].join("\n");
}

export default function ContactEnquiryForm() {
  const [enquiryType, setEnquiryType] = useState<(typeof enquiryTypes)[number]>("New website");
  const [existingSetup, setExistingSetup] =
    useState<(typeof existingSetupOptions)[number]>("Not sure");
  const [problem, setProblem] = useState("");

  const mailtoHref = useMemo(() => {
    const params = new URLSearchParams({
      subject: `Blackburn Studio enquiry: ${enquiryType}`,
      body: buildMessage(enquiryType, existingSetup, problem),
    });

    return `mailto:hello@theblackburn.studio?${params.toString()}`;
  }, [enquiryType, existingSetup, problem]);

  return (
    <section className="mt-10 max-w-3xl rounded-2xl border border-studio-border bg-studio-surface/70 px-5 py-6 md:px-6 md:py-7">
      <h2 className="text-xl font-medium tracking-tight text-studio-text md:text-2xl">Enquiry details</h2>
      <p className="mt-3 text-sm leading-relaxed text-studio-dim md:text-base">
        Share a few details and the button will prepare an email draft in your mail app.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="enquiry-type" className="text-sm font-medium text-studio-text">
            Type of help needed
          </label>
          <select
            id="enquiry-type"
            name="enquiryType"
            className={fieldClassName}
            value={enquiryType}
            onChange={(event) => setEnquiryType(event.target.value as (typeof enquiryTypes)[number])}
          >
            {enquiryTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="existing-setup" className="text-sm font-medium text-studio-text">
            Do you already have a website, domain or Microsoft 365 environment?
          </label>
          <select
            id="existing-setup"
            name="existingSetup"
            className={fieldClassName}
            value={existingSetup}
            onChange={(event) =>
              setExistingSetup(event.target.value as (typeof existingSetupOptions)[number])
            }
          >
            {existingSetupOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="problem" className="text-sm font-medium text-studio-text">
            What are you trying to achieve, or what problem are you trying to solve?
          </label>
          <textarea
            id="problem"
            name="problem"
            className={`${fieldClassName} min-h-30 resize-y`}
            value={problem}
            onChange={(event) => setProblem(event.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="mt-7">
        <StudioButton href={mailtoHref} variant="primary">
          Prepare email enquiry
        </StudioButton>
      </div>
    </section>
  );
}
