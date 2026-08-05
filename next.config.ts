import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        // Root OneSignal SW must be JS and allowed to control `/`.
        source: "/OneSignalSDKWorker.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/OneSignalSDKUpdaterWorker.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        // Legacy path — still served, but new installs use root worker.
        source: "/push/onesignal/OneSignalSDKWorker.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
