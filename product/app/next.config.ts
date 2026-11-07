import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Keys live in product/.env or product/.env.local (both gitignored). Next only reads env files
// from the folder it starts in (product/app with `npm run dev`, product with `next ... app`),
// so find the product folder (the one holding vision/) and load its files.
const productDir = [process.cwd(), path.resolve(process.cwd(), "..")].find((d) => existsSync(path.join(d, "vision")));
// forceReload: Next has already loaded its own folder's env files and would otherwise skip these.
if (productDir) loadEnvConfig(productDir, undefined, undefined, true);

const config: NextConfig = {
  // Workspace packages are TypeScript source; Next compiles them.
  transpilePackages: [
    "@rally/backfill",
    "@rally/fakes",
    "@rally/fixtures",
    "@rally/matching",
    "@rally/profiles",
    "@rally/ratings",
    "@rally/sessions",
    "@rally/types",
    "@rally/ui",
  ],
};

export default config;
