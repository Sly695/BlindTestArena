/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour déploiement
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
