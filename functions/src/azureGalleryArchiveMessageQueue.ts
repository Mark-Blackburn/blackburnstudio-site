import { DefaultAzureCredential } from "@azure/identity";
import type { ArchiveMessageQueue, QueueReceipt } from "./galleryArchiveQueueConsumer";

const XML = /<([A-Za-z]+)>([^<]*)<\/\1>/g;
function fields(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of xml.matchAll(XML)) result[match[1]] = match[2];
  return result;
}
function xmlValue(xml: string, name: string): string {
  const match = xml.match(new RegExp("<" + name + ">([^<]*)<\\/" + name + ">"));
  if (!match) throw new Error("Malformed Azure queue response: " + name);
  return match[1];
}

/** Managed-identity Storage Queue REST client. No connection string or account key. */
export function createAzureArchiveMessageQueue(environment: NodeJS.ProcessEnv = process.env): ArchiveMessageQueue {
  const endpoint = new URL(environment.GALLERY_ARCHIVE_QUEUE_ENDPOINT ?? "");
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
      endpoint.pathname !== "/" || endpoint.search || endpoint.hash)
    throw new Error("Invalid gallery archive queue endpoint");
  const credential = new DefaultAzureCredential();
  const base = endpoint.origin + "/gallery-archive-jobs/messages";
  async function request(method: string, url: string): Promise<Response> {
    const token = await credential.getToken("https://storage.azure.com/.default");
    if (!token) throw new Error("Archive queue identity unavailable");
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token.token}`,
        "x-ms-version": "2023-11-03",
        "x-ms-date": new Date().toUTCString(),
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Archive queue ${method} failed: ${response.status}`);
    return response;
  }
  return {
    async receive(visibilitySeconds) {
      const response = await request("GET", base + "?numofmessages=1&visibilitytimeout=" + visibilitySeconds);
      const xml = await response.text();
      if (!xml.includes("<QueueMessage>")) return null;
      const id = xmlValue(xml, "MessageId");
      const popReceipt = xmlValue(xml, "PopReceipt");
      const text = Buffer.from(xmlValue(xml, "MessageText"), "base64").toString("utf8");
      const dequeueCount = Number(xmlValue(xml, "DequeueCount"));
      if (!/^[0-9]+$/.test(String(dequeueCount)) || dequeueCount < 1 ||
          !id || !popReceipt || text.length > 2048)
        throw new Error("Invalid archive queue receipt");
      return { id, popReceipt, text, dequeueCount };
    },
    async renew(receipt, visibilitySeconds) {
      const url = base + "/" + encodeURIComponent(receipt.id) +
        "?popreceipt=" + encodeURIComponent(receipt.popReceipt) +
        "&visibilitytimeout=" + visibilitySeconds;
      const response = await request("PUT", url);
      const xml = await response.text();
      return { ...receipt, popReceipt: xmlValue(xml, "PopReceipt") };
    },
    async delete(receipt) {
      await request("DELETE", base + "/" + encodeURIComponent(receipt.id) +
        "?popreceipt=" + encodeURIComponent(receipt.popReceipt));
    },
  };
}
