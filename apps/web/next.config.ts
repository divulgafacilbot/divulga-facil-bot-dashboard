import type { NextConfig } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

if (apiBase && apiBase.startsWith("http")) {
  try {
    const url = new URL(apiBase);
    const protocol = url.protocol.replace(":", "") as "http" | "https";
    remotePatterns.push({
      protocol,
      hostname: url.hostname,
      port: url.port || "",
      pathname: "/**",
    });
  } catch {
    // Ignore invalid API base URL
  }
}

remotePatterns.push({
  protocol: "http",
  hostname: "localhost",
  port: "4000",
  pathname: "/**",
});

const nextConfig: NextConfig = {
  images: remotePatterns.length > 0 ? { remotePatterns } : undefined,
  async rewrites() {
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
