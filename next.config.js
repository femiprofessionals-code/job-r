/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't block deploys on type or lint issues. We check types locally and
  // during CI separately; production deploys should fail only on real build
  // errors, not strict-mode gripes.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.greenhouse.io' },
      { protocol: 'https', hostname: 'logo.clearbit.com' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
};

module.exports = nextConfig;
