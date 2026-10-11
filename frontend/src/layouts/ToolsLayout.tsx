import { Suspense, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Loading } from '@/components/ui'
import { PUBLIC_TOOLS_BRANCH, ToolsBranchOutlet } from '@/features/tools/hub'
import { SiteHeader } from '@/features/site/components/SiteHeader'
import { SiteFooter } from '@/features/site/components/SiteFooter'

export function ToolsLayout() {
  const { tool: slug } = useParams()
  const { pathname, hash, state } = useLocation()
  const isTool = slug !== undefined
  useEffect(() => {
    if (isTool) return
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) {
      target.scrollIntoView({ block: 'start' })
      if (target instanceof HTMLInputElement) target.focus({ preventScroll: true })
    } else {
      const scrollTop = typeof state?.catalogScroll === 'number' && Number.isFinite(state.catalogScroll) ? Math.max(0, state.catalogScroll) : 0
      let secondFrame = 0
      const firstFrame = requestAnimationFrame(() => { secondFrame = requestAnimationFrame(() => document.querySelector('.erp-tools-guest')?.scrollTo({ top: scrollTop })) })
      return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame) }
    }
  }, [pathname, hash, isTool, state])

  return (
    <div className={`cn-site cn-shell${isTool ? ' cn-shell--tool' : ''}`}>
      <SiteHeader showPreferences={!isTool} />
      <div className="erp-tools-frame">
        <div className="erp-tools-guest">
          <main id="cn-main" tabIndex={-1} className={`erp-tools-guest__main${isTool ? '' : ' cn-site-main'}`}>
            <Suspense fallback={<Loading />}><ToolsBranchOutlet branch={PUBLIC_TOOLS_BRANCH} /></Suspense>
          </main>
          {isTool ? null : <SiteFooter />}
        </div>
      </div>
    </div>
  )
}
