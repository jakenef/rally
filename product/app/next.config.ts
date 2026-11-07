import type { NextConfig } from "next";

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
