import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  transpilePackages: ['@uiw/react-md-editor', '@uiw/react-markdown-preview'],
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'production' || process.env.BUILD_DIST === 'true' ? '/api' : 'http://localhost:3000/api'),
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || (process.env.NODE_ENV === 'production' || process.env.BUILD_DIST === 'true' ? '' : 'http://localhost:3000')
  }
};

export default nextConfig;
