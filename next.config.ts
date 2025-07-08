import type {NextConfig} from 'next';
 
const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
  },
  allowedDevOrigins: [
      'https://6000-firebase-studio-1751330697604.cluster-c3a7z3wnwzapkx3rfr5kz62dac.cloudworkstations.dev',
      'https://9000-firebase-studio-1751330697604.cluster-c3a7z3wnwzapkx3rfr5kz62dac.cloudworkstations.dev'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn1.epicgames.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.wikia.nocookie.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
};
 
export default nextConfig;
