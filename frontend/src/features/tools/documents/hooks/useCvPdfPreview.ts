import { useEffect, useMemo, useState } from 'react'
import type { PrintDocument } from '../types/print-document'

/** The preview and PDF download share the very same generated file. */
export function useCvPdfPreview(build: () => Promise<PrintDocument>) {
  const getPdf = useMemo(() => {
    let pending: Promise<Blob> | undefined
    return () => pending ??= build().then(async document => (await import('../services/document-pdf')).documentPdf(document)).catch(error => { pending = undefined; throw error })
  }, [build])
  const [result, setResult] = useState<{ key: typeof getPdf; urls: string[]; failed?: boolean }>()
  useEffect(() => {
    let active = true
    const urls: string[] = []
    const timer = window.setTimeout(() => {
      void (async () => {
        const blob = await getPdf()
        if (!active) return
        const renderer = await import('@/features/tools/pdf/services/pdf-render')
        const source = { id: crypto.randomUUID(), kind: 'pdf' as const, mime: 'application/pdf' as const, name: 'CV.pdf', size: blob.size, pageCount: 1, bytes: new Uint8Array(await blob.arrayBuffer()) }
        try {
          const pdf = await renderer.openPdf(source)
          for (let index = 0; index < pdf.numPages && active; index++) {
            const canvas = await renderer.renderPdfPage(source, index, { scale: 1.5, maxArea: 1_500_000 })
            try {
              const image = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
              if (!image) throw new Error('CV_PREVIEW')
              if (!active) return
              urls.push(URL.createObjectURL(image))
            } finally { canvas.width = 0; canvas.height = 0 }
          }
          if (active) setResult({ key: getPdf, urls: [...urls] })
        } finally { renderer.releaseDocument(source.id) }
      })().catch(() => { if (active) setResult({ key: getPdf, urls: [], failed: true }) })
    }, 450)
    return () => { active = false; window.clearTimeout(timer); urls.forEach(url => URL.revokeObjectURL(url)) }
  }, [getPdf])
  return { getPdf, pages: result?.key === getPdf ? result.urls : [], failed: result?.key === getPdf && result.failed }
}
