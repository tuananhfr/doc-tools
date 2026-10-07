import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
// A custom PostCSS config switches off Next's defaults, so restate them with the same plugins and browser target.
const { MODERN_BROWSERSLIST_TARGET } = require('next/dist/shared/lib/constants')

const config = {
  plugins: [
    'next/dist/compiled/postcss-flexbugs-fixes',
    [
      'next/dist/compiled/postcss-preset-env',
      {
        browsers: MODERN_BROWSERSLIST_TARGET,
        autoprefixer: { flexbox: 'no-2009' },
        stage: 3,
        features: { 'custom-properties': false },
      },
    ],
    // Override mode appends [dir="rtl"] overrides for Arabic; the few rules it cannot override get [dir] prefixes, so LTR specificity rises there.
    ['postcss-rtlcss', { mode: 'override' }],
  ],
}

export default config
