import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Skills and the system prompt are read from disk at request time, so tracing has to
  // ship the markdown alongside the serverless bundle.
  outputFileTracingIncludes: {
    "/api/chat": ["./lib/skills/**/*.md", "./lib/agents/*.md"],
  },
  async headers() {
    const allowedParentDomains = [
      "https://marketplace-app.sitecorecloud.io",
      "https://pages.sitecorecloud.io",
      "https://xmapps.sitecorecloud.io",
    ];

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${allowedParentDomains.join(" ")}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
