import { Suspense, useEffect, useRef, type MouseEvent } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LandingHeader } from './components/LandingHeader'
import { LandingFooter } from './components/LandingFooter'

export function LandingLayout() {
  const { hash, pathname, search } = useLocation()
  const navigate = useNavigate()
  const pendingSection = useRef<string | null>(null)
  const scrollToSection = (id: string) => {
    const target = document.getElementById(id)
    if (!target) return
    const temporaryTabIndex = !target.hasAttribute('tabindex')
    if (temporaryTabIndex) {
      target.tabIndex = -1
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
    }
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'start' })
  }
  const onSectionClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return
    const url = new URL(anchor.href)
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search || !url.hash) return
    let id: string
    try { id = decodeURIComponent(url.hash.slice(1)) } catch { return }
    if (!document.getElementById(id)) return
    event.preventDefault()
    // Let the mobile menu close before moving focus to the chosen section.
    requestAnimationFrame(() => scrollToSection(id))
  }
  useEffect(() => {
    if (hash) {
      try { pendingSection.current = decodeURIComponent(hash.slice(1)) } catch { pendingSection.current = null }
      // Old shared section links still scroll correctly, then keep the clean page URL.
      navigate({ pathname, search, hash: '' }, { replace: true, preventScrollReset: true })
      return
    }
    const id = pendingSection.current
    if (!id) return
    // Focus after the router has finished changing the URL.
    const frame = requestAnimationFrame(() => { scrollToSection(id); pendingSection.current = null })
    return () => cancelAnimationFrame(frame)
  }, [hash, pathname, search, navigate])
  return (
    <div className="cn-site cn-landing-shell" onClickCapture={onSectionClick}>
      <Suspense fallback={<div className="cn-landing-header-placeholder" aria-busy="true" />}><LandingHeader /></Suspense>
      <div className="cn-landing-scroll">
        <main id="cn-main" tabIndex={-1} className="cn-landing">
          <Suspense fallback={<div className="cn-landing-placeholder" aria-busy="true" />}><Outlet /></Suspense>
        </main>
        <Suspense fallback={null}><LandingFooter /></Suspense>
      </div>
    </div>
  )
}
