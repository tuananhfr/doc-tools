import { LanguagePicker } from '@/features/tools/hub/components/LanguagePicker'
import { ThemeSelector } from './ThemeSelector'

export function LandingPreferences() {
  return <div className="cn-landing-preferences"><LanguagePicker /><ThemeSelector compact /></div>
}
