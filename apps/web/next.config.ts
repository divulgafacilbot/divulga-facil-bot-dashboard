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

// Add common marketplace image domains
const marketplaceDomains = [
  'http2.mlstatic.com', // Mercado Livre
  'cf.shopee.com.br', // Shopee Brazil
  'm.media-amazon.com', // Amazon
  'a-static.mlcdn.com.br', // Mercado Livre CDN
];

marketplaceDomains.forEach((hostname) => {
  remotePatterns.push({
    protocol: 'https',
    hostname,
    pathname: '/**',
  });
});

const nextConfig: NextConfig = {
  images: remotePatterns.length > 0 ? { remotePatterns } : undefined,

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Experimental features for performance
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
  },

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

  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
