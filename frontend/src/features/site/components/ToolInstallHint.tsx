import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { toolIconPath } from '../config/tool-app'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { closeHint, hintMode, isAppleMobile, parseHintPrefs, TOOL_INSTALL_HINT_KEY, type ToolInstallHintPrefs } from '../utils/tool-install-hint'

function readPrefs(): ToolInstallHintPrefs {
  try {
    return parseHintPrefs(localStorage.getItem(TOOL_INSTALL_HINT_KEY))
  } catch {
    return parseHintPrefs(null) // Chế độ riêng tư chặn bộ nhớ: vẫn gợi ý, chỉ không nhớ được lựa chọn.
  }
}

function savePrefs(prefs: ToolInstallHintPrefs) {
  try {
    localStorage.setItem(TOOL_INSTALL_HINT_KEY, JSON.stringify(prefs))
  } catch {
    /* bỏ qua */
  }
}

/**
 * Thẻ nhỏ góc dưới trang công cụ: "Thêm <công cụ> vào màn hình chính". Icon trong thẻ chính là
 * icon sẽ nằm trên màn hình chính. Cài ở đây dùng manifest của công cụ (`useToolAppManifest`).
 */
export function ToolInstallHint({ slug, name }: { slug: string; name: string }) {
  const { t } = useTranslation('site')
  const { state, install } = useInstallPrompt()
  const [prefs, setPrefs] = useState<ToolInstallHintPrefs | null>(null)
  const [env, setEnv] = useState({ framed: true, ios: false })
  const [steps, setSteps] = useState(false)

  // Đọc sau hydrate: HTML tĩnh không có thẻ này, khớp lần vẽ đầu.
  useEffect(() => {
    setEnv({ framed: window.parent !== window, ios: isAppleMobile(navigator.userAgent, navigator.maxTouchPoints) })
    setPrefs(readPrefs())
  }, [])

  if (!prefs) return null
  const mode = hintMode({ slug, prefs, promptReady: state === 'ready', standalone: state === 'installed', framed: env.framed, ios: env.ios })
  if (!mode) return null

  const update = (next: ToolInstallHintPrefs) => {
    savePrefs(next)
    setPrefs(next)
  }

  return (
    <aside className="cn-tool-install-hint" aria-label={t('toolInstall.label')}>
      <img src={toolIconPath(slug, 'icon-96')} width={44} height={44} alt="" className="cn-tool-install-hint__icon" />
      <div className="cn-tool-install-hint__text">
        <strong>{t('toolInstall.title', { name })}</strong>
        <span>{steps ? t('toolInstall.iosSteps') : t('toolInstall.detail')}</span>
        <div className="cn-tool-install-hint__actions">
          {mode === 'prompt'
            ? <button type="button" className="cn-button" onClick={() => void install()}><Icon name="plus-square" />{t('toolInstall.add')}</button>
            : !steps ? <button type="button" className="cn-button" onClick={() => setSteps(true)}><Icon name="box-arrow-up" />{t('toolInstall.how')}</button> : null}
          <button type="button" className="cn-tool-install-hint__never" onClick={() => update({ ...prefs, never: true })}>{t('toolInstall.never')}</button>
        </div>
      </div>
      <button type="button" className="cn-tool-install-hint__close" aria-label={t('toolInstall.close')} onClick={() => update(closeHint(prefs, slug))}><Icon name="x-lg" /></button>
    </aside>
  )
}
