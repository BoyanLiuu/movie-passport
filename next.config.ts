import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The Playwright build (with the opt-in globe test hook) goes to its own folder so it never
  // overwrites, or ships as, the real build. See playwright.config.ts.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Always defined, so Next inlines it as a literal and the minifier drops the globe test hook from
  // normal builds (an undefined NEXT_PUBLIC_ variable would be left as a runtime lookup).
  env: { NEXT_PUBLIC_GLOBE_TEST_HOOK: process.env.NEXT_PUBLIC_GLOBE_TEST_HOOK === "1" ? "1" : "0" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
