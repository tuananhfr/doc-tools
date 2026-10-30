import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').trim().replace(/\/+$/, '')
if (basePath && !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+$/.test(basePath)) throw new Error('NEXT_PUBLIC_BASE_PATH must be empty or an absolute path without a trailing slash')
// Mirrors parseEmbedHosts (src/features/embed/embed-mode.ts); a .mjs config cannot import the TS helper. Everyone else may not frame the site.
const embedHosts = (process.env.NEXT_PUBLIC_EMBED_HOSTS ?? '').split(',').map(item => item.trim()).filter(Boolean).flatMap((item) => {
  try { return [new URL(item).origin] } catch { return [] }
})
const config = {
  basePath,
  allowedDevOrigins: ['127.0.0.1'],
  // scripts/deploy.sh builds into .next-new and renames it only after a green build; `next start` keeps reading .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  skipTrailingSlashRedirect: Boolean(basePath),
  reactStrictMode: true,
  agentRules: false,
  poweredByHeader: false,
  // The root layout sits under app/[lang]; unmatched URLs need app/global-not-found.tsx.
  experimental: { globalNotFound: true },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: ["frame-ancestors 'self'", ...embedHosts].join(' ') }],
      },
      {
        source: '/vendor/office/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/vendor/office/:app/index.html',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
      {
        source: '/vendor/office/:app/:file(.*\\.wasm)',
        headers: [{ key: 'Content-Type', value: 'application/wasm' }],
      },
    ]
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:3003'
    return [
      { source: '/api/v1/codes/:path*', destination: backend + '/api/v1/codes/:path*' },
      { source: '/api/v1/tools/:path*', destination: backend + '/api/v1/tools/:path*' },
      { source: '/api/v1/rules/:path*', destination: backend + '/api/v1/rules/:path*' },
      { source: '/api/v1/sources/:path*', destination: backend + '/api/v1/sources/:path*' },
      { source: '/api/v1/contributions/:path*', destination: backend + '/api/v1/contributions/:path*' },
      { source: '/api/v1/auth/:path*', destination: backend + '/api/v1/auth/:path*' },
      { source: '/api/v1/me', destination: backend + '/api/v1/me' },
      { source: '/api/v1/me/:path*', destination: backend + '/api/v1/me/:path*' },
      { source: '/api/v1/admin/:path*', destination: backend + '/api/v1/admin/:path*' },
      { source: '/api/v1/ai/:path*', destination: backend + '/api/v1/ai/:path*' },
      { source: '/api/v1/ent/:path*', destination: backend + '/api/v1/ent/:path*' },
      { source: '/api/v1/landings/:path*', destination: backend + '/api/v1/landings/:path*' },
      { source: '/api/v1/read/:path*', destination: backend + '/api/v1/read/:path*' },
      { source: '/api/v1/templates/:path*', destination: backend + '/api/v1/templates/:path*' },
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
    // pptxgenjs's ES bundle (client-only, dynamically imported) references `node:fs`/`node:https`
    // behind runtime environment checks it never takes in the browser; its own package.json
    // `browser` field would normally no-op these, but that field is ignored once `exports` is
    // present (no `browser` condition in pptxgenjs's exports map). Webpack treats a `node:`-scheme
    // request as a protocol, not a normal specifier, so `resolve.fallback` alone can't catch it -
    // strip the scheme first so it falls through to the plain `fs`/`https` fallbacks below.
    if (!isServer) {
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^node:/, resource => {
        resource.request = resource.request.replace(/^node:/, '')
      }))
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, module: false, crypto: false, https: false }
    }
    return config
  },
}
export default config
