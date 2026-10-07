import { promises as dns } from 'node:dns'

export type DnsCheckState = 'ok' | 'missing' | 'warning' | 'error'
export interface DnsCheck { name: string; host: string; state: DnsCheckState; value: string | null; hint: string }

const TIMEOUT_MS = 5000

function withTimeout<T>(promise: Promise<T>) {
  return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS).unref())])
}

async function txt(host: string) {
  try { return (await withTimeout(dns.resolveTxt(host))).map((chunks) => chunks.join('')) }
  catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENODATA' || code === 'ENOTFOUND') return []
    throw error
  }
}

async function check(name: string, host: string, run: () => Promise<Omit<DnsCheck, 'name' | 'host'>>): Promise<DnsCheck> {
  try { return { name, host, ...await run() } }
  catch (error) { return { name, host, state: 'error', value: null, hint: `Không tra được DNS: ${error instanceof Error ? error.message : String(error)}` } }
}

/** Live lookups of what direct delivery needs; the admin compares them with `mail dkim-keygen` output. */
export async function checkMailDns(domain: string, selector: string | null): Promise<DnsCheck[]> {
  return Promise.all([
    check('MX', domain, async () => {
      const records = await withTimeout(dns.resolveMx(domain)).catch(() => [])
      return records.length
        ? { state: 'ok', value: records.sort((a, b) => a.priority - b.priority).map((r) => `${r.priority} ${r.exchange}`).join(', '), hint: 'Hộp thư nhận phản hồi của tên miền.' }
        : { state: 'missing', value: null, hint: 'Tên miền chưa có MX, thư trả lời sẽ không về được.' }
    }),
    check('SPF', domain, async () => {
      const spf = (await txt(domain)).filter((value) => value.toLowerCase().startsWith('v=spf1'))
      if (!spf.length) return { state: 'missing', value: null, hint: 'Thêm bản ghi TXT v=spf1 có ip4 của máy chủ gửi.' }
      if (spf.length > 1) return { state: 'warning', value: spf.join(' | '), hint: 'Có nhiều bản ghi SPF; chỉ được một, gộp lại.' }
      return { state: 'ok', value: spf[0], hint: 'Kiểm ip4 của máy chủ gửi có trong bản ghi.' }
    }),
    check('DKIM', selector ? `${selector}._domainkey.${domain}` : `(chưa đặt selector)._domainkey.${domain}`, async () => {
      if (!selector) return { state: 'missing', value: null, hint: 'Chưa đặt MAIL_DKIM_SELECTOR; chạy npm run mail -- dkim-keygen.' }
      const key = (await txt(`${selector}._domainkey.${domain}`)).find((value) => value.includes('p='))
      return key ? { state: 'ok', value: `${key.slice(0, 60)}…`, hint: 'Khoá công khai phải khớp khoá riêng trong MAIL_DKIM_KEY_FILE.' } : { state: 'missing', value: null, hint: 'Chưa có bản ghi DKIM cho selector này.' }
    }),
    check('DMARC', `_dmarc.${domain}`, async () => {
      const record = (await txt(`_dmarc.${domain}`)).find((value) => value.toLowerCase().startsWith('v=dmarc1'))
      return record ? { state: 'ok', value: record, hint: 'Nâng p=none lên quarantine khi báo cáo cho thấy SPF/DKIM đều đạt.' } : { state: 'missing', value: null, hint: 'Thêm _dmarc TXT v=DMARC1; p=none để bắt đầu nhận báo cáo.' }
    }),
  ])
}
