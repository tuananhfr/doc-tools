'use client'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { FlowOutput } from '@/features/tools/hub/types/flow.types'
import { postToHost, useEmbed } from './embed-state'

/** Only when the host page offered CDE storage; the file goes to the host in-browser, never to our server. */
export function SaveToHostButton({ output }: { output: FlowOutput }) {
  const { t } = useTranslation('common')
  const { capabilities } = useEmbed()
  if (!capabilities.includes('cde')) return null
  const save = () =>
    postToHost({
      type: 'save-to-cde',
      payload: { files: [new File([output.blob], output.name, { type: output.blob.type })] },
    })
  return (
    <Button variant="outline-secondary" onClick={save}>
      <Icon name="folder-plus" className="me-2" />
      {t('embed.saveToCde')}
    </Button>
  )
}
