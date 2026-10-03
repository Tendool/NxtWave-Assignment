import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite loads a WASM bundle from disk; keep it out of the bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Migrations are read from disk at runtime, so make sure they ship with the serverless bundle.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
};

export default nextConfig;
