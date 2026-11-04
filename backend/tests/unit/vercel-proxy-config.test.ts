import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repositoryRoot = new URL("../../../", import.meta.url);

describe("Vercel frontend API proxy", () => {
  it("uses the verified backend Production domain before the SPA fallback", () => {
    const config = JSON.parse(
      readFileSync(new URL("frontend/vercel.json", repositoryRoot), "utf8"),
    ) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(config.rewrites).toEqual([
      {
        source: "/api/:path*",
        destination: "https://paniversedeutsch-backend.vercel.app/api/:path*",
      },
      { source: "/(.*)", destination: "/index.html" },
    ]);
    expect(
      config.rewrites.some(({ destination }) =>
        destination.includes("git-main"),
      ),
    ).toBe(false);
  });
});
