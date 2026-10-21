import { spawnSync } from "node:child_process";
import { copyFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
// Never mix cached Hybrid server-action manifests with an exported artifact.
rmSync(new URL("../.next/", import.meta.url), { recursive: true, force: true });
rmSync(new URL("../out/", import.meta.url), { recursive: true, force: true });
// Webpack bundles the existing TypeScript image-resizer Web Worker. Turbopack
// currently copies that new-URL asset as raw TypeScript instead.
const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build", "--webpack"],
  {
    cwd: root,
    env: { ...process.env, BLACKBURN_STATIC_EXPORT: "1" },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
copyFileSync(
  new URL("../deploy/staticwebapp.config.json", import.meta.url),
  new URL("../out/staticwebapp.config.json", import.meta.url),
);
