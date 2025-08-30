// web-application/next.config.js
/** @type {import('next').NextConfig} */
const { withBundleAnalyzer } = require('@next/bundle-analyzer');

const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Experimental features
  experimental: {
    // Enable app directory
    //appDir: true,
    // Enable server components
    serverComponentsExternalPackages: [],
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Public runtime config
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  },
  
  // Server runtime config
  serverRuntimeConfig: {
    secret: process.env.SECRET,
  },
  
  // Image optimization
  images: {
    domains: ['localhost', 'example.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add custom webpack configurations here
    
    // Handle CSV files
    config.module.rules.push({
      test: /\.csv$/,
      use: ['csv-loader'],
    });
    
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Separate chunk for chart libraries
          charts: {
            name: 'charts',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](echarts|plotly\.js|d3|chart\.js)/,
            priority: 30,
            reuseExistingChunk: true,
          },
          // Separate chunk for UI libraries
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@mui|@emotion)/,
            priority: 25,
            reuseExistingChunk: true,
          },
          // Separate chunk for utility libraries
          utils: {
            name: 'utils',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](lodash|moment|uuid)/,
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },
  
  // Headers configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // Rewrites configuration
  async rewrites() {
    return [
      // API proxy
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:3001'}/api/:path*`,
      },
      // Webview panel rewrites
      {
        source: '/webview/:webviewSlug/:path*',
        destination: '/webview/:webviewSlug/:path*',
      },
    ];
  },
  
  // Redirects configuration
  async redirects() {
    return [
      // Redirect root to workspace selector
      {
        source: '/',
        destination: '/workspace-selector',
        permanent: false,
      },
      // Legacy route redirects
      {
        source: '/dashboard/:slug*',
        destination: '/workspace/:workspaceSlug/dashboard/:slug*',
        permanent: true,
      },
    ];
  },
  
  // Output configuration
  output: 'standalone',
  
  // Compression
  compress: true,
  
  // Power by header
  poweredByHeader: false,
  
  // Generate ETags
  generateEtags: true,
  
  // Development configuration
  ...(process.env.NODE_ENV === 'development' && {
    // Enable source maps in development
    productionBrowserSourceMaps: false,
  }),
  
  // Production configuration
  ...(process.env.NODE_ENV === 'production' && {
    // Disable source maps in production
    productionBrowserSourceMaps: false,
    // Enable static optimization
    optimizeFonts: true,
  }),
};

// Bundle analyzer configuration
const withAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withAnalyzer(nextConfig);