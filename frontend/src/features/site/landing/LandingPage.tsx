import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router-dom'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { legacyToolPath } from '@/features/tools/hub/utils/tool-lookup'
import { HeroSection } from './components/HeroSection'
import { UseCasesSection } from './components/UseCasesSection'
import { PdfSection } from './components/PdfSection'
import { HowItWorksSection } from './components/HowItWorksSection'
import { PreferencesSection } from './components/PreferencesSection'
import { PrivacySection } from './components/PrivacySection'
import { ClosingSection } from './components/ClosingSection'

export function LandingPage() {
  const { t } = useTranslation('site')
  const [params] = useSearchParams()
  usePageTitle(t('landing.metaTitle'))
  const legacy = params.get('tool')
  if (legacy !== null) return <Navigate to={legacyToolPath('/', legacy)} replace />
  return <><HeroSection /><UseCasesSection /><PdfSection /><HowItWorksSection /><PreferencesSection /><PrivacySection /><ClosingSection /></>
}
