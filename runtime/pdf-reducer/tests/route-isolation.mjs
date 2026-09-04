import { spawn } from "node:child_process";
import { createServer } from "node:net";

import { chromium } from "playwright";

const port = await new Promise((resolvePort, rejectPort) => {
  const probe = createServer();
  probe.once("error", rejectPort);
  probe.listen(0, "127.0.0.1", () => {
    const address = probe.address();
    if (!address || typeof address === "string") {
      probe.close(() => rejectPort(new Error("Could not allocate a port")));
      return;
    }
    const selectedPort = address.port;
    probe.close((error) => (error ? rejectPort(error) : resolvePort(selectedPort)));
  });
});
const origin = `http://127.0.0.1:${port}`;
const routes = [
  "/",
  "/tools",
  "/tools/image-resizer",
  "/tools/qr-code-generator",
];
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)],
  { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
);
let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk;
});

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next server exited early:\n${serverOutput}`);
    }
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Next server did not start:\n${serverOutput}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const evidence = [];
  for (const route of routes) {
    const page = await browser.newPage();
    const runtimeRequests = [];
    page.on("request", (request) => {
      if (request.url().includes("/runtime/pdf-reducer/")) {
        runtimeRequests.push(request.url());
      }
    });
    const response = await page.goto(`${origin}${route}`, {
      waitUntil: "networkidle",
    });
    if (!response?.ok()) {
      throw new Error(`${route} returned ${response?.status() ?? "no response"}`);
    }
    evidence.push({ route, runtimeRequests });
    await page.close();
  }
  if (evidence.some(({ runtimeRequests }) => runtimeRequests.length > 0)) {
    throw new Error(`PDF runtime leaked onto unrelated routes: ${JSON.stringify(evidence)}`);
  }
  const mjsResponse = await fetch(
    `${origin}/runtime/pdf-reducer/1.0.0/pdf-reducer.mjs`,
  );
  const wasmResponse = await fetch(
    `${origin}/runtime/pdf-reducer/1.0.0/pdf-reducer.wasm`,
  );
  const contentTypes = {
    mjs: mjsResponse.headers.get("content-type"),
    wasm: wasmResponse.headers.get("content-type"),
  };
  if (
    !mjsResponse.ok ||
    !contentTypes.mjs?.includes("javascript") ||
    !wasmResponse.ok ||
    contentTypes.wasm !== "application/wasm"
  ) {
    throw new Error(`Unexpected runtime MIME types: ${JSON.stringify(contentTypes)}`);
  }
  console.log(JSON.stringify({ routes: evidence, contentTypes }, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
