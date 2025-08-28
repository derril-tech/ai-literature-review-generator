/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true
  },
  eslint: {
    ignoreDuringBuilds: false
  }
};

module.exports = nextConfig;

