// Load environment variables from the root .env file
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import webpack from 'webpack';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from multiple locations
// Load from frontend/.env first
dotenv.config({ path: resolve(__dirname, '.env') });
// Then load from parent Dteams/.env (won't override existing vars)
dotenv.config({ path: resolve(__dirname, '../.env'), override: false });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_ZAP_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_ZAP_CONTRACT_ADDRESS,
    NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS,
  },
  
  // Webpack configuration
  webpack: (config, { isServer, dev, webpack }) => {
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser'),
      zlib: require.resolve('browserify-zlib'),
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/')
    };

    // Add plugin to provide process
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer']
      })
    );

    // Fixes npm packages that depend on `node:` protocol
    config.ignoreWarnings = [/Failed to parse source map/];
    
    // Add rule for source maps
    if (dev) {
      config.devtool = 'source-map';
    }

    // Disable cache in development to avoid serialization warnings
    if (dev) {
      config.cache = false;
    }

    // Prevent debug package from running in the browser
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'debug': false,
        'engine.io-client': false,
        'socket.io-client': false,
        '@metamask/sdk': false,
      };
    }

    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': join(__dirname, 'src'),
      // Fix multiple versions of lit-html
      'lit-html': 'lit-html',
      'lit-html/': 'lit-html/',
      'lit-element': 'lit-element',
      'lit': 'lit'
    };
    
    // Ignore specific warnings
    config.ignoreWarnings = [
      { module: /node_modules\/@reown/ },
      { file: /node_modules\/@reown/ },
      { module: /node_modules\/@wagmi\/connectors\/node_modules/ },
      { file: /node_modules\/@wagmi\/connectors\/node_modules/ },
      { module: /@walletconnect/ },
      { file: /@walletconnect/ },
      // Ignore cache serialization warnings
      { module: /cache/ },
      // Ignore source map warnings
      { module: /source-map/ }
    ];

    // Disable cache for specific loaders
    if (config.module && config.module.rules) {
      config.module.rules.forEach(rule => {
        if (rule.use && Array.isArray(rule.use)) {
          rule.use.forEach(useItem => {
            if (useItem.loader && useItem.loader.includes('next-swc-loader')) {
              useItem.options = {
                ...(useItem.options || {}),
                cache: false
              };
            }
          });
        }
      });
    }
    
    // Configure fallbacks for Node.js core modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // Node.js core modules
      fs: false,
      net: false,
      tls: false,
      // Polyfills
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      zlib: require.resolve('browserify-zlib'),
      buffer: require.resolve('buffer/'),
      process: require.resolve('process/browser'),
      util: require.resolve('util/'),
      url: require.resolve('url/'),
      querystring: require.resolve('querystring-es3'),
      assert: require.resolve('assert/')
    };

    // Add polyfills and define globals
    config.plugins = [
      ...(config.plugins || []),
      // ProvidePlugin for process and Buffer
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      }),
      // Single source of truth for process.env
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG || ''),
        // Inject SMTP credentials for email functionality
        'process.env.SMTP_USERNAME': JSON.stringify(process.env.SMTP_USERNAME || ''),
        'process.env.SMTP_PASSWORD': JSON.stringify(process.env.SMTP_PASSWORD || ''),
        'process.env.SMTP_ENDPOINT': JSON.stringify(process.env.SMTP_ENDPOINT || 'email-smtp.us-east-1.amazonaws.com'),
        'process.env.FROM_EMAIL': JSON.stringify(process.env.FROM_EMAIL || 'noreply@example.com'),
        // Other commonly used env vars
        'process.env.DATABASE_URL': JSON.stringify(process.env.DATABASE_URL || ''),
        'process.env.JWT_SECRET': JSON.stringify(process.env.JWT_SECRET || ''),
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID || ''),
        'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(process.env.GOOGLE_CLIENT_SECRET || ''),
        'process.env.FRONTEND_URL': JSON.stringify(process.env.FRONTEND_URL || 'http://localhost:3000'),
        'process.env.BACKEND_URL': JSON.stringify(process.env.BACKEND_URL || 'http://localhost:3002'),
      })
    ];

    // Set up process fallback for browser
    if (!isServer) {
      config.resolve.fallback.process = require.resolve('process/browser');
    }

    // Add rule to handle .mjs files
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
  // Add polyfills for node modules
  experimental: {
    esmExternals: 'loose',
  },
  // Add support for source maps in production
  productionBrowserSourceMaps: true,
  // Enable SWC minification
  swcMinify: true,
  // Disable TypeScript type checking during build (helps with some module resolution issues)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;