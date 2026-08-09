import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: { optimizePackageImports: ["@phosphor-icons/react"] },
  outputFileTracingIncludes: {
    "/api/guide": ["./public/fonts/*.ttf"],
    "/api/thematic-guide": ["./public/fonts/*.ttf"],
    "/api/og": ["./public/fonts/*.ttf"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
