import { describe, expect, it } from "vitest";

import {
  isValidEmail,
  isValidRequiredDate,
  parseAustralianPhone,
} from "@/lib/contact/sharedValidation";

describe("parseAustralianPhone", () => {
  it.each([
    ["0424 961 192", "+61424961192", "0424 961 192", "mobile"],
    ["0424961192", "+61424961192", "0424 961 192", "mobile"],
    ["+61 424 961 192", "+61424961192", "0424 961 192", "mobile"],
    ["+61424961192", "+61424961192", "0424 961 192", "mobile"],
    ["+61 (0)424 961 192", "+61424961192", "0424 961 192", "mobile"],
    ["61424961192", "+61424961192", "0424 961 192", "mobile"],
    ["424961192", "+61424961192", "0424 961 192", "mobile"],
    ["424 961 192", "+61424961192", "0424 961 192", "mobile"],
  ] as const)(
    "accepts mobile format %s",
    (input, canonical, display, type) => {
      const parsed = parseAustralianPhone(input);

      expect(parsed.valid).toBe(true);
      if (parsed.valid) {
        expect(parsed.canonical).toBe(canonical);
        expect(parsed.display).toBe(display);
        expect(parsed.type).toBe(type);
      }
    },
  );

  it.each([
    ["03 5428 1234", "+61354281234", "03 5428 1234", "landline"],
    ["0354281234", "+61354281234", "03 5428 1234", "landline"],
    ["+61 3 5428 1234", "+61354281234", "03 5428 1234", "landline"],
    ["61354281234", "+61354281234", "03 5428 1234", "landline"],
    ["354281234", "+61354281234", "03 5428 1234", "landline"],
  ] as const)(
    "accepts landline format %s",
    (input, canonical, display, type) => {
      const parsed = parseAustralianPhone(input);

      expect(parsed.valid).toBe(true);
      if (parsed.valid) {
        expect(parsed.canonical).toBe(canonical);
        expect(parsed.display).toBe(display);
        expect(parsed.type).toBe(type);
      }
    },
  );

  it.each([
    "42496119",
    "04249611922",
    "123456789",
    "phone number text",
    "+1 555 123 4567",
  ])("rejects invalid number %s", (input) => {
    expect(parseAustralianPhone(input)).toEqual({ valid: false });
  });
});

describe("isValidEmail", () => {
  it.each([
    "\rattacker@example.com",
    "attacker\u0000@example.com",
    "attacker\u0001@example.com",
    "attacker\u001F@example.com",
    "attacker\u007F@example.com",
    "attacker\u009F@example.com",
    "attacker@example.com\r",
    "\u00A0test@example.com",
    "test@example.com\u00A0",
    "\u2028test@example.com",
    "test@example.com\u2029",
  ])("rejects control character email %s", (input) => {
    expect(isValidEmail(input)).toBe(false);
  });

  it.each([
    "test@example.com",
    " test@example.com ",
    "mark@example.co.uk",
    "test+tag@example.com",
  ])("accepts normal email %s", (input) => {
    expect(isValidEmail(input)).toBe(true);
  });

  it("normalizes only outer ASCII spaces", () => {
    expect(isValidEmail("  test@example.com  ")).toBe(true);
  });

  it.each([
    "attacker@example.com?bcc=evil%40example.com",
    "attacker@example.com&bcc=evil",
    "attacker@example.com#fragment",
    "attacker@example..com",
    "attacker@-example.com",
    "attacker@example-.com",
    "attacker..name@example.com",
    "attacker@example.com<script>",
    "attacker@exämple.com",
  ])("rejects email values that are not transport-safe addresses", (input) => {
    expect(isValidEmail(input)).toBe(false);
  });

  it("enforces local-part, domain-label, and total address limits", () => {
    const validAtMaximumLength = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
    const overMaximumLength = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}`;

    expect(validAtMaximumLength).toHaveLength(254);
    expect(isValidEmail(validAtMaximumLength)).toBe(true);
    expect(isValidEmail(`a${"b".repeat(64)}@example.com`)).toBe(false);
    expect(isValidEmail(`attacker@${"a".repeat(64)}.com`)).toBe(false);
    expect(overMaximumLength).toHaveLength(255);
    expect(isValidEmail(overMaximumLength)).toBe(false);
  });
});

describe("isValidRequiredDate", () => {
  it.each(["", "2027-02-28", "2028-02-29", "2027-04-30"])(
    "accepts valid required date %j",
    (input) => {
      expect(isValidRequiredDate(input)).toBe(true);
    },
  );

  it.each([
    "2027-02-29",
    "2027-02-30",
    "2027-02-31",
    "2027-04-31",
    "2027-13-01",
    "2027-00-10",
    "2027-01-00",
    "17/05/2027",
  ])("rejects invalid required date %s", (input) => {
    expect(isValidRequiredDate(input)).toBe(false);
  });
});
