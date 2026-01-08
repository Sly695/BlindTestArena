/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour Render
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_WS_URL: process.env.NEXT_PUBLIC_API_WS_URL,
  },
};

export default nextConfig;
