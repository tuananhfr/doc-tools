import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { installMode, isAppleMobile } from '../utils/tool-install-hint'

/**
 * Nút nhỏ "Cài đặt vào màn hình chính" ở khung tiêu đề công cụ. Luôn có ở đó (khi cài được), kể cả khi
 * người dùng đã tắt thẻ gợi ý góc dưới (`ToolInstallHint`). Cài theo manifest riêng của công cụ
 * (`useToolAppManifest`), nên icon trên màn hình chính mở thẳng công cụ này.
 */
export function ToolInstallButton({ name, className }: { name: string; className?: string }) {
  const { t } = useTranslation('site')
  const { state, install } = useInstallPrompt()
  const [env, setEnv] = useState<{ framed: boolean; ios: boolean } | null>(null)
  const [steps, setSteps] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const tipId = useId()
  const stepsId = useId()

  // Đọc sau hydrate: HTML tĩnh không có nút này, khớp lần vẽ đầu.
  useEffect(() => {
    setEnv({ framed: window.parent !== window, ios: isAppleMobile(navigator.userAgent, navigator.maxTouchPoints) })
  }, [])

  useEffect(() => {
    if (!steps) return
    const closeOnKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSteps(false) }
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setSteps(false) }
    window.addEventListener('keydown', closeOnKey)
    window.addEventListener('pointerdown', closeOutside)
    return () => {
      window.removeEventListener('keydown', closeOnKey)
      window.removeEventListener('pointerdown', closeOutside)
    }
  }, [steps])

  if (!env) return null
  const mode = installMode({ promptReady: state === 'ready', standalone: state === 'installed', framed: env.framed, ios: env.ios })
  if (!mode) return null

  return (
    <div ref={root} className={`cn-tool-install${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="cn-tool-install__button"
        aria-label={t('toolInstall.title', { name })}
        aria-describedby={tipId}
        aria-expanded={mode === 'ios' ? steps : undefined}
        aria-controls={mode === 'ios' ? stepsId : undefined}
        onClick={() => (mode === 'prompt' ? void install() : setSteps(open => !open))}
      >
        <Icon name="download" />
      </button>
      <span id={tipId} role="tooltip" className="cn-tool-install__tip">{t('toolInstall.button')}</span>
      {mode === 'ios' && steps ? <p id={stepsId} className="cn-tool-install__steps">{t('toolInstall.iosSteps')}</p> : null}
    </div>
  )
}
