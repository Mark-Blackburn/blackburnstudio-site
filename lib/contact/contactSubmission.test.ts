import { describe, expect, it } from "vitest";

import {
  CONTACT_MAX_FIELD_LENGTH,
  CONTACT_MAX_MESSAGE_LENGTH,
  decodeContactSubmissionRequest,
  prepareContactSubmission,
  type ContactSubmissionRequest,
  validateContactSubmission,
} from "./contactSubmission";

function buildSubmission(
  overrides: Partial<ContactSubmissionRequest> = {},
): ContactSubmissionRequest {
  return {
    name: "Test Person",
    email: "test@example.com",
    phone: "0412 345 678",
    services: ["new-website"],
    setup: "",
    message: "I need help with a new website project.",
    contactMethod: "email",
    timing: "one-month",
    requiredDate: "",
    consent: true,
    honeypot: "",
    ...overrides,
  };
}

describe("decodeContactSubmissionRequest", () => {
  const stringFields = [
    "name",
    "email",
    "phone",
    "setup",
    "message",
    "contactMethod",
    "timing",
    "requiredDate",
    "honeypot",
  ] as const satisfies ReadonlyArray<keyof ContactSubmissionRequest>;
  const invalidStringValues: unknown[] = [
    null,
    true,
    123,
    {},
    [],
    { nested: [] },
    [[{ nested: true }]],
  ];

  it("decodes a valid runtime request object", () => {
    const submission = buildSubmission();

    expect(decodeContactSubmissionRequest(submission)).toEqual(submission);
  });

  it("defaults omitted fields so authoritative validation can report them", () => {
    expect(decodeContactSubmissionRequest({})).toEqual({
      name: "",
      email: "",
      phone: "",
      services: [],
      setup: "",
      message: "",
      contactMethod: "",
      timing: "",
      requiredDate: "",
      consent: false,
      honeypot: "",
    });
  });

  it.each([null, [], "submission", 42])(
    "rejects non-object runtime shapes",
    (value) => {
      expect(decodeContactSubmissionRequest(value)).toBeNull();
    },
  );

  it.each(stringFields)("rejects wrong runtime types for %s", (field) => {
    for (const invalidValue of invalidStringValues) {
      expect(
        decodeContactSubmissionRequest({
          ...buildSubmission(),
          [field]: invalidValue,
        }),
      ).toBeNull();
    }
  });

  it.each([
    { services: "photography" },
    { services: ["photography", 42] },
    { services: [["photography"]] },
    { services: [{ nested: "photography" }] },
    { consent: "true" },
    { consent: null },
    { consent: 1 },
    { consent: {} },
    { consent: [] },
  ])("rejects invalid services and consent shapes", (override) => {
    const value = { ...buildSubmission(), ...override };

    expect(decodeContactSubmissionRequest(value)).toBeNull();
  });
});

describe("validateContactSubmission", () => {
  it("returns the established field errors for invalid submissions", () => {
    const errors = validateContactSubmission(
      buildSubmission({
        name: " ",
        email: "invalid",
        phone: "123",
        services: ["unknown-service"],
        contactMethod: "",
        timing: "unknown",
        requiredDate: "not-a-date",
        consent: false,
      }),
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        { field: "name", message: "Please enter your name." },
        { field: "email", message: "Enter a valid email address." },
        {
          field: "phone",
          message: "Enter a valid Australian phone number.",
        },
        {
          field: "services",
          message: "One or more services are invalid.",
        },
        {
          field: "contactMethod",
          message: "Choose a preferred contact method.",
        },
        { field: "timing", message: "Invalid timing selection." },
        { field: "requiredDate", message: "Enter a valid date." },
        { field: "consent", message: "You must consent to proceed." },
      ]),
    );
  });

  it("returns only the generic form error for the honeypot", () => {
    expect(
      validateContactSubmission(
        buildSubmission({ honeypot: "attacker-controlled-value" }),
      ),
    ).toEqual([
      { field: "form", message: "Form submission failed validation" },
    ]);
  });

  it.each([
    "Mark\r\nInjected",
    "Mark\nInjected",
    "Mark\tInjected",
    "Mark\u0000Injected",
  ])("rejects control characters in the single-line name", (name) => {
    expect(validateContactSubmission(buildSubmission({ name }))).toContainEqual(
      { field: "name", message: "Please enter your name." },
    );
  });

  it("accepts a name exactly at the field limit", () => {
    expect(
      validateContactSubmission(
        buildSubmission({ name: "A".repeat(CONTACT_MAX_FIELD_LENGTH) }),
      ),
    ).toEqual([]);
  });

  it.each([
    "A".repeat(CONTACT_MAX_FIELD_LENGTH + 1),
    "A".repeat(CONTACT_MAX_FIELD_LENGTH * 20),
  ])("rejects an oversized name instead of truncating it", (name) => {
    expect(validateContactSubmission(buildSubmission({ name }))).toContainEqual(
      { field: "name", message: "Please enter your name." },
    );
  });

  it("rejects an email over the ordinary field limit", () => {
    const suffix = "@example.com";
    const email = `${"a".repeat(
      CONTACT_MAX_FIELD_LENGTH - suffix.length + 1,
    )}${suffix}`;

    expect(
      validateContactSubmission(buildSubmission({ email })),
    ).toContainEqual({
      field: "email",
      message: "Email address is too long.",
    });
  });

  it("preserves the existing fixed-date validation behavior", () => {
    expect(
      validateContactSubmission(
        buildSubmission({
          timing: "fixed-date",
          requiredDate: "2027-05-17",
        }),
      ),
    ).toEqual([]);

    expect(
      validateContactSubmission(
        buildSubmission({
          timing: "fixed-date",
          requiredDate: "17/05/2027",
        }),
      ),
    ).toContainEqual({
      field: "requiredDate",
      message: "Enter a valid date.",
    });
  });

  it("accepts a message exactly at the established limit", () => {
    expect(
      validateContactSubmission(
        buildSubmission({
          message: "A".repeat(CONTACT_MAX_MESSAGE_LENGTH),
        }),
      ),
    ).toEqual([]);
  });

  it("detects messages over the established 5000-character limit", () => {
    expect(
      validateContactSubmission(
        buildSubmission({
          message: "A".repeat(CONTACT_MAX_MESSAGE_LENGTH + 1),
        }),
      ),
    ).toContainEqual({
      field: "message",
      message: "Message is too long.",
    });
  });
});

describe("prepareContactSubmission", () => {
  it("sanitizes values, normalizes phone, deduplicates services, and derives setup", () => {
    expect(
      prepareContactSubmission(
        buildSubmission({
          name: " <b>Test Person</b> ",
          email: " test@example.com ",
          phone: "424 961 192",
          services: ["new-website", "new-website"],
          setup: "not-sure",
          message: " <script>ignored()</script>Project details remain here. ",
        }),
      ),
    ).toEqual({
      name: "Test Person",
      email: "test@example.com",
      phone: "+61424961192",
      services: ["new-website"],
      setup: "no-setup",
      message: "ignored()Project details remain here.",
      contactMethod: "email",
      timing: "one-month",
      requiredDate: "",
    });
  });

  it("keeps user-selected setup when the selected services require it", () => {
    expect(
      prepareContactSubmission(
        buildSubmission({
          services: ["hosting"],
          setup: "hosting",
        }),
      ).setup,
    ).toBe("hosting");
  });
});
