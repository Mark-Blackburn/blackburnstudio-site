import { TableClient } from "@azure/data-tables";
import { describe, expect, it, vi } from "vitest";
import { createAzureContactRateLimitStore } from "../src/azureContactRateLimiter";
import { createDurableContactRateLimiter } from "../src/contactRateLimiter";

// Exercise the real SDK deserializer without contacting Azure.
function sdkClient(status: number, code: string, includeErrorHeader: boolean) {
  const sendRequest = vi.fn(async (request: { method: string }) => {
    const values = new Map<string, string>([["content-type", "application/json"]]);
    if (includeErrorHeader) values.set("x-ms-error-code", code);
    return {
      request,
      status: request.method === "POST" ? 201 : status,
      headers: {
        get: (name: string) => values.get(name.toLowerCase()),
        has: (name: string) => values.has(name.toLowerCase()),
        set: (name: string, value: string) => { values.set(name.toLowerCase(), value); },
        delete: (name: string) => { values.delete(name.toLowerCase()); },
        toJSON: () => Object.fromEntries(values),
        [Symbol.iterator]: () => values.entries(),
      },
      bodyAsText: request.method === "POST" ? "" : JSON.stringify({
        "odata.error": { code, message: { lang: "en-US", value: "Synthetic storage error" } },
      }),
    };
  });
  const client = new TableClient(
    "https://synthetic.table.core.windows.net",
    "ContactRateLimits",
    { getToken: async () => ({ token: "test-token", expiresOnTimestamp: Date.now() + 60_000 }) },
    { httpClient: { sendRequest: (request) => sendRequest(request).then(response => ({ ...response, request })) }, retryOptions: { maxRetries: 0 } },
  );
  return { client, sendRequest };
}

describe("Azure Table SDK error contract", () => {
  it.each([true, false])("creates the first limiter record with error header present=%s", async (header) => {
    const { client, sendRequest } = sdkClient(404, "ResourceNotFound", header);
    const limiter = createDurableContactRateLimiter(
      createAzureContactRateLimitStore(client),
      "test-only-secret-with-at-least-32-bytes",
    );
    await expect(limiter.consume("synthetic@example.com")).resolves.toBe(true);
    expect(sendRequest.mock.calls.map(([request]) => request.method)).toEqual(["GET", "POST"]);
  });

  it.each([
    [404, "TableNotFound", true],
    [404, "TableNotFound", false],
    [403, "AuthorizationPermissionMismatch", true],
    [403, "ResourceNotFound", true],
    [404, "UnknownError", false],
  ] as const)("fails closed for SDK response %s/%s (header=%s)", async (status, code, header) => {
    const { client, sendRequest } = sdkClient(status, code, header);
    await expect(createAzureContactRateLimitStore(client).read("synthetic"))
      .rejects.toMatchObject({ statusCode: status });
    expect(sendRequest).toHaveBeenCalledTimes(1);
  });
});
