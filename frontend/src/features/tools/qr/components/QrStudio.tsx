import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageStudio } from '@/features/tools/image/components/ImageStudio'

type CodeTool = 'create' | 'bank' | 'barcode' | 'manager'
const TOOLS = ['qr-create', 'qr-read', 'barcode-create', 'vietqr', 'code-manager']
const IDS = { create: 'qr-create', bank: 'vietqr', barcode: 'barcode-create', manager: 'code-manager' } as const

/** Shared QR reference frame; the online mode states its network requirement explicitly. */
export function QrStudio({ kind, online = kind === 'manager', children }: { kind: CodeTool; online?: boolean; children: ReactNode }) {
  const { t: s } = useTranslation('qr', { keyPrefix: 'codeStudio' })
  const { t: read } = useTranslation('qr', { keyPrefix: 'readStudio' })
  const guide = online && kind === 'create' ? 'manager' : kind
  return <div className="cn-codestudio">
    <ImageStudio toolId={IDS[kind]} icon={kind === 'barcode' ? 'upc' : 'qr-code'} title={s(`${kind}.title`)} subtitle={s(`${kind}.subtitle`)} heroNote={read('heroNote')}
      trustLabels={[s('free'), s('easy'), s('noAccount'), s(online ? 'online' : 'local')]}
      category={{ title: read('category'), icon: 'qr-code', path: '/ma-qr', tools: TOOLS, relatedTitle: read('related') }}
      steps={([1, 2, 3, 4, 5] as const).map(n => s(`${guide}.steps.${n}`))}
      tips={([1, 2, 3, 4] as const).map(n => s(`${guide}.tips.${n}`))}
      faq={([1, 2, 3] as const).map(n => ({ q: s(`${guide}.faq.${n}.q`), a: s(`${guide}.faq.${n}.a`) }))}>
      {children}
    </ImageStudio>
  </div>
}

export function CodeWorkspace({ inputTitle, previewTitle, input, preview }: { inputTitle: string; previewTitle: string; input: ReactNode; preview: ReactNode }) {
  return <div className="cn-codestudio-workspace">
    <section className="cn-idstudio-panel cn-codestudio-input"><h2>{inputTitle}</h2>{input}</section>
    <section className="cn-idstudio-panel cn-codestudio-output"><h2>{previewTitle}</h2>{preview}</section>
  </div>
}
