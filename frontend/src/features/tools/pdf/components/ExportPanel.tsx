import { useId, useState, type ReactNode } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { LoginNudge } from '@/features/tools/hub'
import { DEFAULT_PDF_OUTPUT, type ImageFormat, type PageRef, type PdfOutput, type SourceFile } from '../types/doc-tools.types'
import type { BatchFormat, ExportKind, ExportProgress, OfficeKind } from '../hooks/useDocExport'
import { groupByOrigin, type BatchGroup } from '../utils/batch-groups'
import { hasMarkups } from '../utils/markup-geometry'
import { EXPORT_SECTION } from '../utils/export-sections'
import { parsePageRanges } from '../utils/page-ops'
import { redactBoxes } from '../utils/redaction'
import { rangeLabel } from '../utils/split-groups'
import { ExportStatus } from './ExportStatus'
import { PdfOutputFields } from './PdfOutputFields'

type Scope = 'all' | 'selected'
type SplitMode = 'ranges' | 'each'

interface ExportPanelProps {
  pages: PageRef[]
  selected: string[]
  name: string
  defaultName: string
  onNameChange: (name: string) => void
  busy: ExportKind | null
  progress: ExportProgress | null
  onCancel: () => void
  onExportPdf: (pages: PageRef[], name: string, output: PdfOutput) => void
  onSplit: (groups: { label: string; pages: PageRef[] }[], name: string, output: PdfOutput) => void
  onExportImages: (pages: PageRef[], format: ImageFormat, dpi: number, name: string) => void
  onExportOffice: (kind: OfficeKind, pages: PageRef[], name: string) => void
  onExportBatch: (groups: BatchGroup[], format: BatchFormat, options: { output: PdfOutput; image: { format: ImageFormat; dpi: number } }, name: string) => void
  sources: Record<string, SourceFile>
  /** Khổ giấy trang ảnh — chỉ có khi tài liệu có trang ảnh. */
  sheetFields?: ReactNode
  /** Lượt xuất vừa xong — mời đăng nhập ngay dưới nút đó; `null` = không mời. */
  nudge: ExportKind | null
  onDismissNudge: () => void
}

// Nhãn trong ô chọn chỉ để số: cột hẹp 320px cắt mất "— cân bằng"; ý nghĩa đưa xuống dòng gợi ý.
const DPI_OPTIONS = [
  { value: 96, label: '96 DPI', hint: 'Xem trên màn hình, tệp nhẹ nhất.' },
  { value: 150, label: '150 DPI', hint: 'Cân bằng độ nét và dung lượng.' },
  { value: 300, label: '300 DPI', hint: 'Đủ nét để in.' },
]

const BATCH_OPTIONS: { value: BatchFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word (.docx)' },
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'image', label: 'Ảnh từng trang' },
]

/**
 * Nút đang chạy chỉ đổi sang icon TĨNH — tiến độ đã có ở `ExportStatus` ngay dưới.
 * Spinner quay bắt trang vẽ lại liên tục: đo với lưới 500 trang, xuất ảnh chậm ~3 lần.
 */
function BusyIcon({ active, icon }: { active: boolean; icon: string }) {
  return <Icon name={active ? 'hourglass-split' : icon} className="me-2" />
}

/**
 * Xuất tài liệu đang dựng. Số trang trong ô "Tách" là vị trí HIỆN TẠI trên
 * lưới (sau khi đã sắp xếp), không phải số trang của tệp gốc.
 */
export function ExportPanel({
  pages,
  selected,
  name,
  defaultName,
  onNameChange,
  busy,
  progress,
  onCancel,
  onExportPdf,
  onSplit,
  onExportImages,
  onExportOffice,
  onExportBatch,
  sources,
  sheetFields,
  nudge,
  onDismissNudge,
}: ExportPanelProps) {
  const ids = useId()
  const [scope, setScope] = useState<Scope>('all')
  const [splitMode, setSplitMode] = useState<SplitMode>('ranges')
  const [ranges, setRanges] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [format, setFormat] = useState<ImageFormat>('jpeg')
  const [dpi, setDpi] = useState(150)
  const [pdfOutput, setPdfOutput] = useState<PdfOutput>(DEFAULT_PDF_OUTPUT)
  const [batchFormat, setBatchFormat] = useState<BatchFormat>('pdf')

  const selectedSet = new Set(selected)
  const effectiveScope: Scope = scope === 'selected' && selected.length === 0 ? 'all' : scope
  const scopedPages = effectiveScope === 'selected' ? pages.filter((page) => selectedSet.has(page.id)) : pages
  const redactedCount = scopedPages.filter((page) => redactBoxes(page.markups).length > 0).length
  const batchGroups = groupByOrigin(scopedPages, sources)
  const fileName = name.trim() || defaultName
  const disabled = busy !== null || pages.length === 0

  // Tiến độ / lời mời hiện ngay dưới nút vừa bấm — chỗ mắt người dùng đang nhìn.
  const statusFor = (...kinds: ExportKind[]) => {
    if (busy) return kinds.includes(busy) ? <ExportStatus busy={busy} progress={progress} onCancel={onCancel} /> : null
    return nudge && kinds.includes(nudge) ? <LoginNudge onDismiss={onDismissNudge} /> : null
  }

  const submitSplit = () => {
    if (splitMode === 'each') {
      onSplit(pages.map((page, index) => ({ label: String(index + 1), pages: [page] })), fileName, pdfOutput)
      return
    }
    const parsed = parsePageRanges(ranges, pages.length)
    if (!parsed.ok) {
      setRangeError(parsed.message)
      return
    }
    setRangeError(null)
    onSplit(parsed.groups.map((group) => ({ label: rangeLabel(group), pages: group.map((index) => pages[index]) })), fileName, pdfOutput)
  }

  return (
    <div>
      <section className="erp-doc-export__section">
        <Form.Group controlId={`${ids}-name`}>
          <Form.Label className="erp-doc-export__label">Tên tệp xuất</Form.Label>
          <Form.Control value={name} placeholder={defaultName} maxLength={120} onChange={(event) => onNameChange(event.target.value)} />
        </Form.Group>

        <fieldset className="erp-doc-export__scope">
          <legend className="erp-doc-export__label">Phạm vi</legend>
          <Form.Check
            type="radio"
            id={`${ids}-all`}
            name={`${ids}-scope`}
            label={`Tất cả (${pages.length} trang)`}
            checked={effectiveScope === 'all'}
            onChange={() => setScope('all')}
          />
          <Form.Check
            type="radio"
            id={`${ids}-selected`}
            name={`${ids}-scope`}
            label={`Trang đã chọn (${selected.length})`}
            checked={effectiveScope === 'selected'}
            disabled={selected.length === 0}
            onChange={() => setScope('selected')}
          />
        </fieldset>

        {sheetFields}

        <PdfOutputFields value={pdfOutput} hasMarkups={hasMarkups(pages)} disabled={busy !== null} onChange={setPdfOutput} />

        {redactedCount > 0 ? (
          <p className="erp-doc-export__note erp-doc-export__note--redact">
            <Icon name="exclamation-triangle" className="me-1" />
            {redactedCount} trang có vùng xoá thật sẽ được dựng lại thành ảnh: phần dưới khung đen bị xoá hẳn, liên kết và ô form trên
            trang đó cũng không còn.
          </p>
        ) : null}

        <Button className="w-100 erp-doc-export__cta" disabled={disabled} onClick={() => onExportPdf(scopedPages, fileName, pdfOutput)}>
          <BusyIcon active={busy === 'pdf'} icon="download" />
          Tải PDF ({scopedPages.length} trang)
        </Button>
        {statusFor('pdf')}
      </section>

      <section className="erp-doc-export__section" id={EXPORT_SECTION.split}>
        <h2 className="erp-doc-export__title">
          <Icon name="scissors" className="me-2" />
          Tách PDF
        </h2>
        <Form.Check
          type="radio"
          id={`${ids}-ranges`}
          name={`${ids}-split`}
          label="Theo khoảng trang"
          checked={splitMode === 'ranges'}
          onChange={() => setSplitMode('ranges')}
        />
        {splitMode === 'ranges' ? (
          <Form.Group controlId={`${ids}-range-input`} className="erp-doc-export__ranges">
            <Form.Label visuallyHidden>Khoảng trang</Form.Label>
            <Form.Control
              value={ranges}
              placeholder="Ví dụ: 1-3, 5, 8-10"
              isInvalid={!!rangeError}
              aria-describedby={`${ids}-range-help`}
              onChange={(event) => {
                setRanges(event.target.value)
                setRangeError(null)
              }}
            />
            <Form.Control.Feedback type="invalid">{rangeError}</Form.Control.Feedback>
            <Form.Text id={`${ids}-range-help`}>Mỗi nhóm cách nhau dấu phẩy thành một tệp.</Form.Text>
          </Form.Group>
        ) : null}
        <Form.Check
          type="radio"
          id={`${ids}-each`}
          name={`${ids}-split`}
          label={`Mỗi trang một tệp (${pages.length} tệp)`}
          checked={splitMode === 'each'}
          onChange={() => setSplitMode('each')}
        />
        <Button variant="outline-secondary" className="w-100 mt-2" disabled={disabled} onClick={submitSplit}>
          <BusyIcon active={busy === 'split'} icon="file-earmark-zip" />
          Tách và tải .zip
        </Button>
        {statusFor('split')}
      </section>

      <section className="erp-doc-export__section" id={EXPORT_SECTION.image}>
        <h2 className="erp-doc-export__title">
          <Icon name="file-earmark-image" className="me-2" />
          Xuất ảnh
        </h2>
        <div className="erp-doc-export__row">
          <Form.Group controlId={`${ids}-format`}>
            <Form.Label className="erp-doc-export__label">Định dạng</Form.Label>
            <Form.Select value={format} onChange={(event) => setFormat(event.target.value as ImageFormat)}>
              <option value="jpeg">JPG</option>
              <option value="png">PNG</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId={`${ids}-dpi`}>
            <Form.Label className="erp-doc-export__label">Độ phân giải</Form.Label>
            <Form.Select value={dpi} onChange={(event) => setDpi(Number(event.target.value))}>
              {DPI_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </div>
        <Form.Text className="erp-doc-export__hint">{DPI_OPTIONS.find((option) => option.value === dpi)?.hint}</Form.Text>
        <Button
          variant="outline-secondary"
          className="w-100 mt-2"
          disabled={disabled}
          onClick={() => onExportImages(scopedPages, format, dpi, fileName)}
        >
          <BusyIcon active={busy === 'image'} icon="images" />
          {scopedPages.length === 1 ? 'Tải ảnh' : `Tải ${scopedPages.length} ảnh (.zip)`}
        </Button>
        {statusFor('image')}
      </section>

      <section className="erp-doc-export__section">
        <h2 className="erp-doc-export__title">
          <Icon name="file-earmark-word" className="me-2" />
          Chuyển sang Word / Excel
        </h2>
        <p className="erp-doc-export__note">
          Dựng lại từ chữ trong PDF — bố cục phức tạp có thể lệch; dấu tay, số trang, watermark không đi theo.
        </p>
        <div className="erp-doc-export__pair">
          <Button variant="outline-secondary" disabled={disabled} onClick={() => onExportOffice('word', scopedPages, fileName)}>
            <BusyIcon active={busy === 'word'} icon="file-earmark-word" />
            Tải Word
          </Button>
          <Button variant="outline-secondary" disabled={disabled} onClick={() => onExportOffice('excel', scopedPages, fileName)}>
            <BusyIcon active={busy === 'excel'} icon="file-earmark-spreadsheet" />
            Tải Excel
          </Button>
        </div>
        {statusFor('word', 'excel')}
      </section>

      {batchGroups.length > 1 ? (
        <section className="erp-doc-export__section">
          <h2 className="erp-doc-export__title">
            <Icon name="collection" className="me-2" />
            Xử lý từng tệp riêng
          </h2>
          <p className="erp-doc-export__note">
            {batchGroups.length} tệp gốc — mỗi tệp ra một tệp riêng theo đúng thiết lập ở trên (nén, số trang, watermark, dấu tay), gói chung
            một .zip. Không ghép các tệp lại với nhau.
          </p>
          <Form.Group controlId={`${ids}-batch-format`}>
            <Form.Label className="erp-doc-export__label">Xuất thành</Form.Label>
            <Form.Select value={batchFormat} onChange={(event) => setBatchFormat(event.target.value as BatchFormat)}>
              {BATCH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          {batchFormat === 'image' ? (
            <Form.Text className="erp-doc-export__hint">Định dạng và độ phân giải theo mục Xuất ảnh ({format === 'png' ? 'PNG' : 'JPG'}, {dpi} DPI).</Form.Text>
          ) : null}
          <Button
            variant="outline-secondary"
            className="w-100 mt-2"
            disabled={disabled}
            onClick={() => onExportBatch(batchGroups, batchFormat, { output: pdfOutput, image: { format, dpi } }, fileName)}
          >
            <BusyIcon active={busy === 'batch'} icon="file-earmark-zip" />
            Xuất {batchGroups.length} tệp (.zip)
          </Button>
          {statusFor('batch')}
        </section>
      ) : null}
    </div>
  )
}
