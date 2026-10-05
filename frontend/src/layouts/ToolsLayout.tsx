import { Suspense, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Loading } from '@/components/ui'
import { PUBLIC_TOOLS_BRANCH, ToolsBranchOutlet, toolNeedsFullWidth } from '@/features/tools/hub'
import { SiteHeader } from '@/features/site/components/SiteHeader'
import { SiteFooter } from '@/features/site/components/SiteFooter'
import { AuthBrandPanel } from './components/AuthBrandPanel'

export function ToolsLayout() {
  const { tool: slug } = useParams()
  const { pathname, hash } = useLocation()
  const isTool = slug !== undefined
  const split = isTool && !toolNeedsFullWidth(slug)
  useEffect(() => {
    if (isTool) return
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) {
      target.scrollIntoView({ block: 'start' })
      if (target instanceof HTMLInputElement) target.focus({ preventScroll: true })
    } else document.querySelector('.erp-tools-guest')?.scrollTo({ top: 0 })
  }, [pathname, hash, isTool])

  return (
    <div className={`cn-site cn-shell${isTool ? ' cn-shell--tool' : ''}`}>
      <SiteHeader showPreferences={!isTool} />
      <div className={`erp-tools-frame${split ? ' erp-tools-frame--split' : ''}`}>
        {split ? <AuthBrandPanel headlineTag="p" /> : null}
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
