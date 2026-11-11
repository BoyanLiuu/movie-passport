import { defineConfig, devices } from "@playwright/test";

const PORT = 3202;
const baseURL = `http://127.0.0.1:${PORT}`;

// WebGL needs a GPU to run at a usable frame rate. On macOS the full Chromium build ("new
// headless") can use Metal; elsewhere Chromium falls back to SwiftShader (CPU), roughly 10 fps,
// so fewer pages run at once.
const gpu =
  process.platform === "darwin"
    ? {
        channel: "chromium",
        launchOptions: { args: ["--use-angle=metal", "--ignore-gpu-blocklist"] },
      }
    : {};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: process.platform === "darwin" ? 4 : 2,
  timeout: 60_000,
  // WebGL pages are heavy; give assertions headroom on a busy machine.
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...gpu } },
    { name: "mobile", use: { ...devices["Pixel 7"], ...gpu } },
  ],
  webServer: {
    // A production build with the globe test hook compiled in, written to .next-e2e so it never
    // replaces the real build; served on loopback only.
    command: `next build && next start -H 127.0.0.1 -p ${PORT}`,
    env: { NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_GLOBE_TEST_HOOK: "1" },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
