const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Necessary for unzipper and Azure SDK (Node.js-only modules) in Route Handlers
  serverExternalPackages: ['@azure/storage-blob', 'unzipper', '@prisma/client', 'pg'],

  experimental: {
    // Allow large file uploads
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
};

module.exports = nextConfig;
