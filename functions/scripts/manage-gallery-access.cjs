// Operator-only tool. Never included in the Function deployment package.
// Reads non-secret gallery metadata as JSON from stdin; never accepts a token
// or secret as a command-line argument. Only create prints the new bearer link.
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { TableClient } = require("@azure/data-tables");
const { AzureCliCredential } = require("@azure/identity");
const { GALLERY_ID, hashGalleryToken, validRecord } = require("../dist/functions/src/galleryAccess.js");
const { createConfiguredGalleryAccess, GALLERY_PARTITION } = require("../dist/functions/src/azureGalleryAccess.js");

async function main() {
  const action = process.argv[2];
  if (!["create", "revoke"].includes(action)) throw new Error("Invalid action");
  const inputText = fs.readFileSync(0, "utf8");
  if (Buffer.byteLength(inputText) > 8192) throw new Error("Oversized input");
  const input = JSON.parse(inputText);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid input");
  const vault = process.env.GALLERY_KEY_VAULT_NAME;
  if (!vault || !/^[A-Za-z0-9-]{3,24}$/.test(vault)) throw new Error("Invalid vault");
  // Capture stdout, suppress CLI stderr; neither secret nor SDK errors are logged.
  const secret = execFileSync("az", ["keyvault", "secret", "show", "--vault-name", vault,
    "--name", "gallery-access-hmac-key", "--query", "value", "--output", "tsv"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim();
  const { origin } = createConfiguredGalleryAccess({ ...process.env, GALLERY_ACCESS_HMAC_KEY: secret });
  const client = new TableClient(process.env.GALLERY_TABLE_ENDPOINT, process.env.GALLERY_TABLE_NAME,
    new AzureCliCredential(), { retryOptions: { maxRetries: 2 } });
  const id = input.id ?? `g_${randomBytes(16).toString("base64url")}`;
  if (typeof id !== "string" || !GALLERY_ID.test(id)) throw new Error("Invalid ID");
  if (id === "g_7Rk3mN9xQ2vL8pT4") throw new Error("Reserved sample ID");

  if (action === "create") {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = Date.parse(input.expiresAt);
    const record = { id, title: input.title, clientDisplayName: input.clientDisplayName ?? "",
      message: input.message ?? "", status: "published", expiresAt,
      accessTokenHash: hashGalleryToken(secret, id, token), accessTokenVersion: 1, sessionVersion: 1 };
    if (!validRecord(record, id) || expiresAt <= Date.now() || expiresAt > Date.now() + 366 * 86400_000)
      throw new Error("Invalid gallery metadata or expiry");
    await client.createEntity({ partitionKey: GALLERY_PARTITION, rowKey: id, ...record });
    console.log(`${origin}/clients/${id}#access=${token}`);
  } else {
    const record = await client.getEntity(GALLERY_PARTITION, id);
    if (!validRecord(record, id) || !record.etag || record.etag === "*" ||
        !Number.isSafeInteger(record.sessionVersion + 1) || !Number.isSafeInteger(record.accessTokenVersion + 1))
      throw new Error("Invalid stored record");
    // Merge only these properties, with an exact ETag. Never recreate a deleted row.
    await client.updateEntity({ partitionKey: GALLERY_PARTITION, rowKey: id, status: "revoked",
      sessionVersion: record.sessionVersion + 1, accessTokenVersion: record.accessTokenVersion + 1 },
      "Merge", { etag: record.etag });
    console.log("Gallery link and sessions revoked.");
  }
}

main().catch(() => { console.error("Gallery operation failed; no credential or storage details printed."); process.exitCode = 1; });
