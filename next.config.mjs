/** @type {import('next').NextConfig} */
const nextConfig = {
  // `standalone` output produces a minimal self-contained server bundle,
  // which is what most deployment platforms (Docker, Fly, Railway, etc.) expect.
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    // Keep these packages out of the bundler so native/heavy deps load at runtime.
    serverComponentsExternalPackages: ["bullmq", "ioredis", "nodemailer", "@prisma/client", "bcryptjs"],
  },
};

export default nextConfig;
