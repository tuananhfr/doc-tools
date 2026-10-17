import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FlowOutput } from '@/features/tools/hub'

/** Preview actual generated content, without claiming Word layout fidelity. */
export function ConvertedFilePreview({ output }: { output: FlowOutput }) {
  const { t: c } = useTranslation('pdf', { keyPrefix: 'conversionStudio' })
  const [preview, setPreview] = useState<{ output: FlowOutput; text?: string; url?: string; failed?: boolean } | null>(null)
  const word = output.name.toLowerCase().endsWith('.docx')
  const image = output.blob.type.startsWith('image/')
  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(output.blob)
      setPreview({ output, url })
      return () => URL.revokeObjectURL(url)
    }
    if (!word) return
    let active = true
    void (async () => {
      const { unzipSync, strFromU8 } = await import('fflate')
      const entries = unzipSync(new Uint8Array(await output.blob.arrayBuffer()), { filter: file => file.name === 'word/document.xml' })
      const xml = entries['word/document.xml']
      if (!xml) throw new Error('document')
      const doc = new DOMParser().parseFromString(strFromU8(xml), 'application/xml')
      if (doc.querySelector('parsererror')) throw new Error('xml')
      const text = Array.from(doc.getElementsByTagName('w:p'), p => Array.from(p.getElementsByTagName('w:t'), t => t.textContent ?? '').join('')).join('\n').slice(0, 20_000)
      if (active) setPreview({ output, text })
    })().catch(() => { if (active) setPreview({ output, failed: true }) })
    return () => { active = false }
  }, [output, word, image])
  if (!word && !image) return null
  const ready = preview?.output === output ? preview : null
  return <div className="cn-fileconversion-result-preview">{!ready ? <p role="status">{c('loadingResult')}</p> : ready.failed ? <p>{c('previewFailed')}</p> : ready.url ? <img src={ready.url} alt={c('result')} /> : <><p className="cn-flowstudio-hint">{c('wordExcerpt')}</p><pre>{ready.text}</pre></>}</div>
}
