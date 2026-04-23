/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
