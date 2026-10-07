import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').trim().replace(/\/+$/, '')
if (basePath && !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+$/.test(basePath)) throw new Error('NEXT_PUBLIC_BASE_PATH must be empty or an absolute path without a trailing slash')
const config = {
  basePath,
  skipTrailingSlashRedirect: Boolean(basePath),
  reactStrictMode: true,
  agentRules: false,
  poweredByHeader: false,
  // The root layout sits under app/[lang]; unmatched URLs need app/global-not-found.tsx.
  experimental: { globalNotFound: true },
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:3003'
    return [
      { source: '/api/v1/tools/:path*', destination: backend + '/api/v1/tools/:path*' },
      { source: '/api/v1/rules/:path*', destination: backend + '/api/v1/rules/:path*' },
      { source: '/api/v1/contributions/:path*', destination: backend + '/api/v1/contributions/:path*' },
      { source: '/api/v1/auth/:path*', destination: backend + '/api/v1/auth/:path*' },
      { source: '/api/v1/me', destination: backend + '/api/v1/me' },
      { source: '/api/v1/me/:path*', destination: backend + '/api/v1/me/:path*' },
      { source: '/api/v1/admin/:path*', destination: backend + '/api/v1/admin/:path*' },
      { source: '/api/v1/ai/:path*', destination: backend + '/api/v1/ai/:path*' },
    ]
  },
  webpack(config, { isServer, webpack }) {
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/hooks\/useHubPrefs$/, resource => {
      resource.request = fileURLToPath(new URL('./src/runtime/useHydratedHubPrefs.ts', import.meta.url))
    }))
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(new RegExp('@embedpdf/pdfium/pdfium[.]wasm'), resource => {
      resource.request = require.resolve('@embedpdf/pdfium/pdfium.wasm') + '?url'
    }))
    config.module.rules.unshift({ resourceQuery: /url/, type: 'asset/resource', generator: { filename: 'static/media/[name].[contenthash][ext]' } })
    for (const rule of config.module.rules) {
      if (rule.loader?.includes('next-image-loader')) rule.resourceQuery = { not: [/url/] }
    }
    if (!isServer) config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, module: false, crypto: false }
    return config
  },
}
export default config
