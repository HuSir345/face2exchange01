/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['s1.imagehub.cc', 's.coze.cn'],
    unoptimized: true
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp']
  }
}

module.exports = nextConfig 