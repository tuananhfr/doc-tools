/**
 * Dung chung cho script kiem thu DocTools (Playwright + Chrome that cua may).
 *
 * Repo KHONG cai playwright (CI khong can) nen tim theo thu tu:
 *   1. PLAYWRIGHT_DIR=<thu muc node_modules co playwright>
 *   2. node_modules cua repo (neu ai do da cai tay)
 *   3. cache cua npx — chay `npx -y playwright@1.62.0 --version` mot lan la co.
 * Trinh duyet la Chrome da cai (`channel: 'chrome'`), khong tai Chromium rieng.
 *
 * Tep mau sinh bang `node scripts/doc-tools/make-fixtures.mjs` vao FIXTURES
 * (mac dinh thu muc tam cua he thong) — khong commit tep nhi phan vao repo.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.join(os.tmpdir(), 'erpcons-doc-tools')

export const FIX = (process.env.FIXTURES ?? path.join(ROOT, 'fixtures')).replaceAll('\\', '/').replace(/\/?$/, '/')
// `/doc-tools` la trang chon cong cu ("Chuyen Nho"); cac script tha tep can TRINH CHINH SUA.
export const BASE = process.env.BASE ?? 'http://localhost:3000/doc-tools/chinh-sua-pdf'
export const ORIGIN = new URL(BASE).origin
/** Trang chon cong cu — suy tu BASE de van dung khi app nam trong thu muc con (`/erpcons/`). */
export const HUB = BASE.replace(/\/[^/]+\/?$/, '')
/** Cung trang chon cong cu nhung TRONG khung app (`/tools`) — phai co phien, xem `mockSession`. */
export const APP_HUB = HUB.replace(/\/doc-tools$/, '/tools')

/**
 * Gia mot phien DA DANG NHAP (dev noi Drupal that, khong co tai khoan thu).
 *
 * Ban trong khung app o `APP_HUB` (`/tools`), ma khung app goi them ca chuc API
 * (roles, badges, notifications...). De chung roi xuong Drupal that voi tu cach
 * khach la an 401 -> app coi nhu het phien va day ve /login. Tra 404 cho moi thu
 * ngoai `/me`: khung app chiu duoc 404, con du lieu gia sai hinh dang thi vo.
 */
export async function mockSession(target) {
  await target.route('**/api/v1/**', (route) => {
    if (new URL(route.request().url()).pathname.endsWith('/api/v1/me')) {
      // Hinh dang `AccountState` cua backend Chuyen Nho, khong phai `/me` cua Drupal: `email: null` lam AccountButton vo ca trang.
      return route.fulfill({ json: { ok: true, user: { id: 'qa', email: 'qa@example.test', displayName: 'QA', publicAttribution: false, hasPassword: true }, plan: { pro: false, endsAt: null }, capabilities: ['tool.use'], staff: null } })
    }
    return route.fulfill({ status: 404, json: { ok: false, message: 'qa: not mocked' } })
  })
}

/** Thu muc anh chup / tep tai ve cua mot script (QA_OUT de doi goc). */
export function outDir(name) {
  const dir = (process.env.QA_OUT ?? path.join(ROOT, 'out')).replaceAll('\\', '/').replace(/\/?$/, '/') + name + '/'
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function npxCaches() {
  const cache = process.env.npm_config_cache ?? (process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA ?? '', 'npm-cache') : path.join(os.homedir(), '.npm'))
  const root = path.join(cache, '_npx')
  if (!fs.existsSync(root)) return []
  return fs
    .readdirSync(root)
    .map((dir) => path.join(root, dir, 'node_modules'))
    .filter((dir) => fs.existsSync(path.join(dir, 'playwright', 'package.json')))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
}

function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_DIR, path.resolve(import.meta.dirname, '../../../node_modules'), ...npxCaches()].filter(Boolean)
  for (const dir of candidates) {
    try {
      return createRequire(path.join(dir, 'noop.js'))('playwright')
    } catch {
      // thu cho tiep theo
    }
  }
  throw new Error('Khong tim thay playwright. Chay `npx -y playwright@1.62.0 --version` mot lan, hoac dat PLAYWRIGHT_DIR.')
}

export const { chromium } = loadPlaywright()
