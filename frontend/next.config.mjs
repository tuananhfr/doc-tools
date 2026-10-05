import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const config = {
  reactStrictMode: true,
  agentRules: false,
  poweredByHeader: false,
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:3003'
    return [{ source: '/api/v1/tools/:path*', destination: backend + '/api/v1/tools/:path*' }]
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
