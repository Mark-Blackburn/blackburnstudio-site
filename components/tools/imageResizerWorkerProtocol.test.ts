import { describe, expect, it } from "vitest";

import { isImageResizerWorkerResponse } from "@/components/tools/imageResizerWorkerProtocol";

describe("isImageResizerWorkerResponse", () => {
  it("accepts a documented worker response envelope", () => {
    expect(
      isImageResizerWorkerResponse({
        type: "ready",
        requestId: "initialize-1",
      }),
    ).toBe(true);
  });

  it.each([
    null,
    {},
    { type: "unknown", requestId: "request-1" },
    { type: "ready" },
    { type: "ready", requestId: 1 },
  ])("rejects an unknown or malformed response: %j", (value) => {
    expect(isImageResizerWorkerResponse(value)).toBe(false);
  });
});