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

  it.each([
    {
      label: "a leading hole",
      services: (() => {
        const services = new Array<string>(2);
        services[1] = "new-website";
        return services;
      })(),
    },
    {
      label: "a trailing hole",
      services: (() => {
        const services = ["new-website"];
        services.length = 2;
        return services;
      })(),
    },
    { label: "only holes", services: new Array<string>(2) },
    {
      label: "an explicit undefined entry",
      services: ["new-website", undefined],
    },
  ])("rejects services with $label", ({ services }) => {
    expect(
      decodeContactSubmissionRequest({
        ...buildSubmission(),
        services,
      }),
    ).toBeNull();
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
  "Mark\u007FInjected",
  "Mark\u0085Injected",
  "Mark\u009FInjected",
  "Mark\u2028Injected",
  "Mark\u2029Injected",
])("rejects control characters in the single-line name", (name) => {
  expect(validateContactSubmission(buildSubmission({ name }))).toContainEqual(
    { field: "name", message: "Please enter your name." },
  );
});

it("accepts ordinary Unicode characters in the name", () => {
  expect(
    validateContactSubmission(
      buildSubmission({ name: "José François" }),
    ),
  ).toEqual([]);
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

  it("prioritizes phone length over phone format", () => {
    const errors = validateContactSubmission(
      buildSubmission({
        phone: `+61${"1".repeat(CONTACT_MAX_FIELD_LENGTH)}`,
      }),
    );

    expect(errors.filter((error) => error.field === "phone")).toEqual([
      { field: "phone", message: "Phone number is too long." },
    ]);
  });

  it("returns a single format error for a normal-length invalid phone", () => {
    const errors = validateContactSubmission(
      buildSubmission({ phone: "123" }),
    );

    expect(errors.filter((error) => error.field === "phone")).toEqual([
      {
        field: "phone",
        message: "Enter a valid Australian phone number.",
      },
    ]);
  });

  it("returns a single required-phone error when phone is empty and preferred", () => {
    const errors = validateContactSubmission(
      buildSubmission({ contactMethod: "phone", phone: "" }),
    );

    expect(errors.filter((error) => error.field === "phone")).toEqual([
      {
        field: "phone",
        message: "Please provide a phone number if phone is preferred.",
      },
    ]);
  });

  it("returns no phone error when phone is empty and email is preferred", () => {
    const errors = validateContactSubmission(
      buildSubmission({ contactMethod: "email", phone: "" }),
    );

    expect(errors.filter((error) => error.field === "phone")).toEqual([]);
  });

  it("returns no phone error for a valid Australian phone", () => {
    const errors = validateContactSubmission(
      buildSubmission({ phone: "0412 345 678" }),
    );

    expect(errors.filter((error) => error.field === "phone")).toEqual([]);
  });

  it("accepts a normal valid service", () => {
    expect(
      validateContactSubmission(
        buildSubmission({ services: ["new-website"] }),
      ),
    ).toEqual([]);
  });

  it.each([
    "x".repeat(CONTACT_MAX_FIELD_LENGTH + 1),
    `new-website${" ".repeat(
      CONTACT_MAX_FIELD_LENGTH - "new-website".length + 1,
    )}`,
    `new-website${"<i></i>".repeat(70)}`,
  ])("rejects an oversized raw service entry", (service) => {
    expect(service.length).toBeGreaterThan(CONTACT_MAX_FIELD_LENGTH);
    expect(
      validateContactSubmission(buildSubmission({ services: [service] })),
    ).toEqual([
      {
        field: "services",
        message: "One or more services are invalid.",
      },
    ]);
  });

  it.each(["phone", " phone "])(
    "requires a phone for normalized contact method %j",
    (contactMethod) => {
      expect(
        validateContactSubmission(
          buildSubmission({ contactMethod, phone: "" }),
        ),
      ).toContainEqual({
        field: "phone",
        message: "Please provide a phone number if phone is preferred.",
      });
    },
  );

  it("accepts a normalized phone contact method with a valid phone", () => {
    const submission = buildSubmission({
      contactMethod: " phone ",
      phone: "0412 345 678",
    });

    expect(validateContactSubmission(submission)).toEqual([]);
    expect(prepareContactSubmission(submission).contactMethod).toBe("phone");
  });

  it.each(["email", "either"])(
    "allows an empty phone for contact method %s",
    (contactMethod) => {
      expect(
        validateContactSubmission(
          buildSubmission({ contactMethod, phone: "" }),
        ),
      ).toEqual([]);
    },
  );

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

    expect(
      validateContactSubmission(
        buildSubmission({
          timing: "fixed-date",
          requiredDate: "2027-02-30",
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
