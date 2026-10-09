import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LandingHeader } from './components/LandingHeader'
import { LandingFooter } from './components/LandingFooter'

export function LandingLayout() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { hash } = useLocation()
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = hash ? document.getElementById(hash.slice(1)) : null
      if (target) target.scrollIntoView({ block: 'start' })
      else scrollRef.current?.scrollTo({ top: 0 })
    })
    return () => cancelAnimationFrame(frame)
  }, [hash])
  return (
    <div className="cn-site cn-landing-shell">
      <Suspense fallback={<div className="cn-landing-header-placeholder" aria-busy="true" />}><LandingHeader /></Suspense>
      <div ref={scrollRef} className="cn-landing-scroll">
        <main id="cn-main" tabIndex={-1} className="cn-landing">
          <Suspense fallback={<div className="cn-landing-placeholder" aria-busy="true" />}><Outlet /></Suspense>
        </main>
        <Suspense fallback={null}><LandingFooter /></Suspense>
      </div>
    </div>
  )
}
