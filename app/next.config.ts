import type { NextConfig } from "next";

// Keep in sync with src/lib/uploads.ts. A submission can carry a zip AND a video, so allow two files plus overhead.
const uploadMb = Number(process.env.MAX_UPLOAD_MB) || (process.env.VERCEL ? 4 : 25);

const nextConfig: NextConfig = {
  // PGlite loads a WASM bundle from disk; keep it out of the bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Migrations are read from disk at runtime, so make sure they ship with the serverless bundle.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  experimental: { serverActions: { bodySizeLimit: `${uploadMb * 2 + 1}mb` } },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nobody may frame the site (clickjacking on the form or the admin). The CSP leaves scripts alone —
          // Next's inline bootstrap would need nonces — and locks down what doesn't need them.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
