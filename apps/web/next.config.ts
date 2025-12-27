import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!apiBase || apiBase.startsWith("/")) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiBase.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
