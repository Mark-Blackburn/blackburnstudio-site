import { describe, expect, it } from "vitest";

import {
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
