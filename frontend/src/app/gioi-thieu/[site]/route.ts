import { fetchLanding, LANDING_REVALIDATE_SECONDS } from '@/features/site-landing/server/load-landing'
import { landingErrorPage, renderLanding } from '@/features/site-landing/server/render-landing'

export const runtime = 'nodejs'

const html = (body: string, status: number, cacheControl: string) => new Response(body, {
  status,
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cacheControl, 'x-content-type-options': 'nosniff' },
})

/**
 * One self-contained HTML page per host site (styles inline, no script), so a host proxying just
 * this URL shows it complete. Host sites cache it too; proxy samples in docs/landing-host-proxy.md.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  const found = await fetchLanding(site)
  if (found.status === 'missing') return html(landingErrorPage('Không tìm thấy trang', 'Trang giới thiệu này chưa được xuất bản hoặc đã bị gỡ.'), 404, 'no-store')
  // 503 lets a host's proxy_cache_use_stale keep serving the last good copy.
  if (found.status === 'unavailable') return html(landingErrorPage('Tạm thời không mở được', 'Vui lòng thử lại sau ít phút.'), 503, 'no-store')
  return html(await renderLanding(found.landing), 200, `public, max-age=${LANDING_REVALIDATE_SECONDS}, stale-while-revalidate=600`)
}
