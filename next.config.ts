import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
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
