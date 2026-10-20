import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/adapter-pg", "pg", "@prisma/client"],
  images: {
    /*
     * next/image refuses any remote host not listed here. Driver photos,
     * vehicle images and fleet documents are stored as external URLs, so the
     * hosts that serve them have to be allowed explicitly.
     */
    remotePatterns: [
      // Supabase Storage — public bucket URLs.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Generated initials avatars used by the sample driver seed.
      { protocol: "https", hostname: "ui-avatars.com", pathname: "/api/**" },
    ],
  },
};

export default nextConfig;
