import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { compareTask } from '../../services/compare-task'

const ACCEPT: readonly QuickKind[] = ['pdf']

/** SO SÁNH TÀI LIỆU — so chữ hai bản PDF theo từng dòng; tệp đứng trước là bản cũ. */
export default function ComparePdfPage() {
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const [ignoreSpace, setIgnoreSpace] = useState(true)
  const [ignoreCase, setIgnoreCase] = useState(false)

  const [before, after] = quick.items
  const count = quick.items.length
  const blocked = count < 2 ? 'Cần đúng hai tệp: bản cũ và bản mới.' : count > 2 ? 'Chỉ so được hai tệp mỗi lượt — bỏ bớt tệp thừa.' : null

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      reorder
      pickerTitle="Chọn hai tệp PDF: bản cũ và bản mới"
      runLabel="So sánh"
      runIcon="layout-split"
      blocked={blocked}
      task={() => compareTask(before, after, { ignoreSpace, ignoreCase })}
      options={
        <>
          <div className="erp-flow-field">
            <span className="erp-flow-field__label">Thứ tự so</span>
            <p className="erp-flow-field__hint">
              {count === 2 ? (
                <>
                  Bản cũ: <strong>{before.source.name}</strong>
                  <br />
                  Bản mới: <strong>{after.source.name}</strong>
                  <br />
                  Dùng nút dời trong danh sách tệp để đổi bên.
                </>
              ) : (
                'Tệp đứng trước là bản cũ, tệp đứng sau là bản mới.'
              )}
            </p>
          </div>
          <Form.Check id={`${ids}-space`} type="checkbox" label="Bỏ qua khác biệt về khoảng trắng" checked={ignoreSpace} onChange={(event) => setIgnoreSpace(event.target.checked)} />
          <Form.Check id={`${ids}-case`} type="checkbox" label="Bỏ qua chữ hoa / chữ thường" checked={ignoreCase} onChange={(event) => setIgnoreCase(event.target.checked)} />
          <p className="erp-flow-field__hint">So chữ theo từng dòng, kết quả xác định — không dùng AI, tệp không rời máy bạn. Tệp scan cần chạy "Nhận dạng chữ (OCR)" trước.</p>
        </>
      }
    />
  )
}
