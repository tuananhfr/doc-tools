export interface SiteShareData {
  title: string
  url: string
}

export function currentSiteShare(): SiteShareData {
  const heading = document.querySelector('#cn-main h1')?.textContent?.trim()
  return { title: heading || document.title, url: window.location.href }
}

export function siteShareLinks(data: SiteShareData) {
  const facebook = new URL('https://www.facebook.com/sharer/sharer.php')
  facebook.searchParams.set('u', data.url)
  const telegram = new URL('https://t.me/share/url')
  telegram.searchParams.set('url', data.url)
  telegram.searchParams.set('text', data.title)
  return { facebook: facebook.href, telegram: telegram.href }
}

export function canShareSite(data: SiteShareData): boolean {
  if (!window.isSecureContext || typeof navigator.share !== 'function') return false
  try {
    return typeof navigator.canShare !== 'function' || navigator.canShare(data)
  } catch {
    return false
  }
}

export async function shareSite(data: SiteShareData): Promise<boolean> {
  try {
    await navigator.share(data)
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false
    throw error
  }
}
