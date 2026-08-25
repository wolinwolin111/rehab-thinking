import type { NextConfig } from "next";
import { REHABMIND_PRIVATE_API_HEADERS, REHABMIND_SECURITY_HEADERS } from "./src/infrastructure/http/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/", headers: [...REHABMIND_SECURITY_HEADERS] },
      { source: "/:path*", headers: [...REHABMIND_SECURITY_HEADERS] },
      { source: "/api/pilot/:path*", headers: [...REHABMIND_PRIVATE_API_HEADERS] },
      { source: "/admin", headers: [...REHABMIND_PRIVATE_API_HEADERS] },
      { source: "/admin/:path*", headers: [...REHABMIND_PRIVATE_API_HEADERS] },
      { source: "/test", headers: [...REHABMIND_PRIVATE_API_HEADERS] },
      { source: "/test/:path*", headers: [...REHABMIND_PRIVATE_API_HEADERS] },
    ];
  },
};

export default nextConfig;
