// Logic thuan cua bang gate phat hanh WP7: doc/ghi CSV (UTF-8 BOM, LF nhu moi CSV trong docs/s0-audit)
// va tinh trang thai. Khong chay lenh, khong doc dia: read() duoc truyen vao de test duoc.
import path from 'node:path'

export const HEADER = ['test_id', 'source', 'priority', 'scenario', 'device', 'expected', 'owner_wp', 'duplicate_of', 'local_checks', 'manual_remainder', 'actual', 'evidence', 'status']

export function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index++ }
      else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(cell); cell = '' }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += char
  }
  if (cell !== '' || row.length > 0) { row.push(cell.replace(/\r$/, '')); rows.push(row) }
  const [head, ...body] = rows
  return body.filter((cells) => cells.some((value) => value !== '')).map((cells) => Object.fromEntries(head.map((key, index) => [key, cells[index] ?? ''])))
}

const quote = (value) => (/[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value)

export function toCsv(rows, header = HEADER) {
  return '\uFEFF' + [header.join(','), ...rows.map((row) => header.map((key) => quote(String(row[key] ?? ''))).join(','))].join('\n') + '\n'
}

/**
 * ok: true = dat, false = hong, null = khong chay duoc (thieu file cua WP truoc, thieu DB...).
 * Khong co kiem tra nao thi chi co the MANUAL (con phan lam tay) hoac BLOCKED — khong bao gio PASS.
 */
export function gateStatus(checks, manual) {
  if (checks.length === 0) return manual ? 'MANUAL' : 'BLOCKED'
  if (checks.some((check) => check.ok === false)) return 'FAIL'
  if (checks.some((check) => check.ok !== true)) return 'BLOCKED'
  return manual ? 'PARTIAL_PASS' : 'PASS'
}

/** results: [{ file, ok }] tu vitest JSON. spec: { file } (ten file) hoac { has } (chuoi phai co trong file test). */
export function matchTestFiles(results, spec, read) {
  const tokens = spec.has === undefined ? [] : [spec.has].flat()
  const hits = results.filter((item) => (spec.file ? item.file.replaceAll('\\', '/').endsWith('/' + spec.file) : tokens.every((token) => read(item.file).includes(token))))
  if (hits.length === 0) return { ok: null, detail: 'khong co file test khop' }
  const broken = hits.filter((item) => !item.ok)
  return { ok: broken.length === 0, detail: `${hits.length - broken.length}/${hits.length} file dat` + (broken.length ? ': hong ' + broken.map((item) => path.basename(item.file.replaceAll('\\', '/'))).join(', ') : '') }
}

export function describeCheck(check) {
  if (check.kind === 'vitest') return check.file ? `vitest:${check.file}` : `vitest(has):${[check.has].flat().join('&')}`
  if (check.kind === 'backend') return `backend:${check.file}`
  return `script:${check.name}`
}
