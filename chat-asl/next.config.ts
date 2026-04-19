import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ua-parser-js"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
        pathname: "/wiki/Special:Redirect/file/**",
      },
    ],
  },
};

export default nextConfig;
