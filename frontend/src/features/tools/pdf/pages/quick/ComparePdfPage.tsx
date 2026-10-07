import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { compareTask } from '../../services/compare-task'

const ACCEPT: readonly QuickKind[] = ['pdf']

/** SO SÁNH TÀI LIỆU — so chữ hai bản PDF theo từng dòng; tệp đứng trước là bản cũ. */
export default function ComparePdfPage() {
  const { t } = useTranslation('pdf')
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const [ignoreSpace, setIgnoreSpace] = useState(true)
  const [ignoreCase, setIgnoreCase] = useState(false)

  const [before, after] = quick.items
  const count = quick.items.length
  const blocked = count < 2 ? t('compare.blockedTooFew') : count > 2 ? t('compare.blockedTooMany') : null

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      reorder
      pickerTitle={t('compare.pickerTitle')}
      runLabel={t('compare.run')}
      runIcon="layout-split"
      blocked={blocked}
      task={() => compareTask(before, after, { ignoreSpace, ignoreCase })}
      options={
        <>
          <div className="erp-flow-field">
            <span className="erp-flow-field__label">{t('compare.orderLabel')}</span>
            <p className="erp-flow-field__hint">
              {count === 2 ? (
                <>
                  <Trans ns="pdf" i18nKey="compare.oldFile" values={{ name: before.source.name }} components={{ strong: <strong /> }} />
                  <br />
                  <Trans ns="pdf" i18nKey="compare.newFile" values={{ name: after.source.name }} components={{ strong: <strong /> }} />
                  <br />
                  {t('compare.swapHint')}
                </>
              ) : (
                t('compare.orderHint')
              )}
            </p>
          </div>
          <Form.Check id={`${ids}-space`} type="checkbox" label={t('compare.ignoreSpace')} checked={ignoreSpace} onChange={(event) => setIgnoreSpace(event.target.checked)} />
          <Form.Check id={`${ids}-case`} type="checkbox" label={t('compare.ignoreCase')} checked={ignoreCase} onChange={(event) => setIgnoreCase(event.target.checked)} />
          <p className="erp-flow-field__hint">{t('compare.note')}</p>
        </>
      }
    />
  )
}
