/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Type', value: 'application/javascript' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
      {
        source: '/api/gtfs-rt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=15, stale-while-revalidate=30' },
        ],
      },
    ]
  },
}

export default nextConfig
