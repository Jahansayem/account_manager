import type { NextConfig } from "next";

// Bundle analyzer setup
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Use Turbopack only in development for faster builds
  // Note: Turbopack is disabled in production for better compatibility
  ...(process.env.NODE_ENV === 'development' && {
    turbopack: {
      root: __dirname,
    },
  }),
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize CSS loading
    optimizeCss: true,
    // Enable server actions if needed
    serverActions: {
      bodySizeLimit: '2mb'
    },
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // Bundle optimization
  webpack: (config, { isServer }) => {
    // Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
  
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // ESLint configuration for build - temporarily disabled for deployment
  eslint: {
    ignoreDuringBuilds: false, // Enable linting during builds
  },
  
  // TypeScript configuration for build - temporarily disabled for deployment
  typescript: {
    ignoreBuildErrors: false, // Enable type checking during builds
  },
  
  // Output for better Vercel deployment
  output: 'standalone',
  
  // Vercel deployment optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Disable source maps in production for smaller builds
    productionBrowserSourceMaps: false,
  }),
};

export default withBundleAnalyzer(nextConfig);
