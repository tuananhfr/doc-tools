import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuickItem } from '../../hooks/useQuickSources'
import type { OcrQualityFlag } from '../../types/ocr-result.types'

export function OcrQualityPreview({ items }: { items: QuickItem[] }) {
  const { t } = useTranslation('ocr')
  const [flags, setFlags] = useState<OcrQualityFlag[]>([])
  const first = items[0], page = first?.pages[0]
  useEffect(() => {
    let live = true
    setFlags([])
    if (!first || !page) return
    void (async () => {
      const [{ renderPreview }, { inspectOcrImage }] = await Promise.all([import('../../services/page-preview'), import('../../services/ocr-quality')])
      const canvas = await renderPreview(first.source, page, 1)
      try {
        const result = await inspectOcrImage(canvas, first.source)
        if (live) setFlags(result)
      } finally { canvas.width = 1; canvas.height = 1 }
    })().catch(() => undefined)
    return () => { live = false }
  }, [first, page])
  return flags.length ? <ul className="cn-ocr-review__warnings">{flags.map(flag => <li key={flag}>{t(`quality.${flag}`)}</li>)}</ul> : null
}
