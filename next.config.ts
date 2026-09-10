import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
} as any);

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
