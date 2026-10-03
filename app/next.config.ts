import type { NextConfig } from "next";

// Keep in sync with src/lib/uploads.ts. A submission can carry a zip AND a video, so allow two files plus overhead.
const uploadMb = Number(process.env.MAX_UPLOAD_MB) || (process.env.VERCEL ? 4 : 25);

const nextConfig: NextConfig = {
  // PGlite loads a WASM bundle from disk; keep it out of the bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Migrations are read from disk at runtime, so make sure they ship with the serverless bundle.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  experimental: { serverActions: { bodySizeLimit: `${uploadMb * 2 + 1}mb` } },
};

export default nextConfig;
