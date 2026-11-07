import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Keys live in product/.env or product/.env.local (both gitignored), one level above the app.
// Next only reads env files from its own folder, so load the product folder's too.
loadEnvConfig(path.resolve(process.cwd(), ".."));

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
