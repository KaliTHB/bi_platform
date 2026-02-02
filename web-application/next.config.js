// web-application/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Optimize for development and build performance
  experimental: {
    // Disable instrumentation hook to prevent Windows permission issues
    instrumentationHook: false,
    // Enable modern bundling
    esmExternals: true,
  },
  
  // Environment variables that will be available on both client and server
  env: {
    CUSTOM_BUILD_TIME: new Date().toISOString(),
  },
  
  // Image optimization configuration
  images: {
    domains: ['localhost', '127.0.0.1'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Webpack configuration for better performance and Windows compatibility
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix for Windows development - prevents EPERM errors
    if (dev && process.platform === 'win32') {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
        ignored: [
          '**/node_modules',
          '**/.git',
          '**/.next/**',
          '**/out/**',
          '**/.vscode/**',
        ],
      };
    }
    
    // Optimize bundle splitting for better performance
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendors',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              enforce: true,
            },
            // Common chunk for shared code
            common: {
              minChunks: 2,
              chunks: 'all',
              name: 'common',
              priority: 5,
              enforce: true,
            },
            // MUI chunk
            mui: {
              name: 'mui',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              priority: 15,
              enforce: true,
            },
            // Redux chunk
            redux: {
              name: 'redux',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](redux|@reduxjs|react-redux|redux-persist)[\\/]/,
              priority: 15,
              enforce: true,
            },
          },
        },
      };
    }
    
    // Add resolve fallbacks for browser compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Bundle analyzer (only when ANALYZE=true)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: true,
        })
      );
    }
    
    return config;
  },
  
  // Security and performance headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
      // Cache headers for static assets
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },
  
  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
      // Redirect old URLs if needed
      {
        source: '/dashboard/home',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  
  // Rewrites for API proxy or URL masking
  async rewrites() {
    return [
      // Example: Proxy API calls to avoid CORS in development
      ...(process.env.NODE_ENV === 'development' ? [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
        }
      ] : []),
    ];
  },
  
  // Output configuration
  output: 'standalone',
  
  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
    
    // Enable SWC emotion plugin for styled-components
    styledComponents: true,
    
    // Enable relay support if needed
    relay: undefined,
  },
  
  // Custom build ID for cache busting
  generateBuildId: async () => {
    // Use git commit hash if available, otherwise use timestamp
    try {
      const { execSync } = require('child_process');
      const gitHash = execSync('git rev-parse HEAD').toString().trim();
      return gitHash.substring(0, 8);
    } catch {
      return `build-${Date.now()}`;
    }
  },
  
  // Power pack features (if available)
  poweredByHeader: false,
  compress: true,
  
  // TypeScript configuration
  typescript: {
    // Dangerously allow builds to complete with TypeScript errors
    // ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    // Don't run ESLint during builds in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  
  // Internationalization (i18n) - if needed later
  // i18n: {
  //   locales: ['en-US', 'es-ES'],
  //   defaultLocale: 'en-US',
  // },
  
  // Server runtime configuration
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: 'secret',
  },
  
  // Public runtime configuration
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
};

// Optional: Add bundle analyzer dependency check
if (process.env.ANALYZE === 'true') {
  try {
    require('webpack-bundle-analyzer');
  } catch (e) {
    console.warn('⚠️  webpack-bundle-analyzer not installed. Run: npm install --save-dev webpack-bundle-analyzer');
  }
}

module.exports = nextConfig;