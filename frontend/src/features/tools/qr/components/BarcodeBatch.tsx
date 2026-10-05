import { useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Icon, useToast } from '@/components/ui'
import { describeError, downloadOutput, FilePicker, megabytes, TOOL_LIMITS, useDownloadNudge } from '@/features/tools/hub'
import { BARCODE_BATCH_LIMIT } from '../config/barcode-kinds'
import type { BarcodeEngine, BarcodeLook } from '../services/barcode-render'
import { readFirstColumn } from '../services/batch-file'
import type { BarcodeKind } from '../types/barcode.types'
import { readBatch } from '../utils/barcode-batch'

interface BarcodeBatchProps {
  kind: BarcodeKind
  look: BarcodeLook
  engine: BarcodeEngine | null
}

const ACCEPT = '.csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
/** Bảng lỗi chỉ hiện chừng này dòng — đủ để thấy kiểu lỗi; số đếm vẫn là của cả lô. */
const SHOWN_ERRORS = 50

type ExportType = 'pdf' | 'png' | 'svg'

/**
 * HÀNG LOẠT — đọc cột đầu của CSV / XLSX, kiểm từng dòng TRƯỚC khi vẽ. Dòng sai
 * hiện kèm số dòng + lý do và bị loại khỏi tệp ra; không có dòng nào bị "sửa giúp".
 */
export function BarcodeBatch({ kind, look, engine }: BarcodeBatchProps) {
  const toast = useToast()
  const nudge = useDownloadNudge()
  const [file, setFile] = useState<{ name: string; values: string[] } | null>(null)
  const [reading, setReading] = useState(false)
  const [progress, setProgress] = useState<{ type: ExportType; done: number; total: number } | null>(null)

  // Đổi loại mã sau khi đã chọn tệp: kiểm lại cùng dữ liệu, không bắt chọn lại tệp.
  const batch = useMemo(() => (file ? readBatch(kind, file.values) : null), [file, kind])
  const valid = batch?.rows.flatMap((row) => (row.check.ok ? [{ kind, value: row.check.value }] : [])) ?? []
  const invalid = batch?.rows.filter((row) => !row.check.ok) ?? []

  const open = async (files: File[]) => {
    const picked = files[0]
    if (!picked) return
    if (picked.size > TOOL_LIMITS.fileBytes) {
      toast.error(`Tệp lớn hơn ${megabytes(TOOL_LIMITS.fileBytes)}.`)
      return
    }
    setReading(true)
    try {
      setFile({ name: picked.name, values: await readFirstColumn(picked) })
    } catch (error) {
      toast.error(describeError(error, 'Không đọc được tệp này.').message)
    } finally {
      setReading(false)
    }
  }

  const exportAs = async (type: ExportType) => {
    if (!engine || valid.length === 0) return
    setProgress({ type, done: 0, total: valid.length })
    try {
      const stem = `${valid.length} mã vạch`
      const blob =
        type === 'pdf'
          ? await engine.pdf(valid, look)
          : await engine.zip(valid, type, look, (done) => setProgress({ type, done, total: valid.length }))
      // Hai gói zip ghi rõ loại — cùng tên thì tải cả hai về chỉ phân biệt được bằng "(1)".
      downloadOutput({ name: type === 'pdf' ? `${stem}.pdf` : `${stem} (${type.toUpperCase()}).zip`, blob })
      nudge.onDownloaded()
    } catch (error) {
      toast.error(describeError(error, 'Không dựng được tệp.').message)
    } finally {
      setProgress(null)
    }
  }

  return (
    <>
      <FilePicker
        accept={ACCEPT}
        multiple={false}
        title="Chọn tệp CSV hoặc Excel (.xlsx)"
        hint={`Mỗi dòng một mã, lấy cột đầu tiên · tối đa ${BARCODE_BATCH_LIMIT} dòng`}
        compact={file !== null}
        loading={reading ? { done: 0, total: 1 } : null}
        disabled={reading || progress !== null}
        onFiles={(files) => void open(files)}
      />

      {batch && file ? (
        <div className="erp-barcode-batch">
          <p className="erp-barcode-batch__file">
            <Icon name="file-earmark-spreadsheet" />
            {file.name}
          </p>
          <ul className="erp-barcode-batch__stats">
            <li className="erp-barcode-stat erp-barcode-stat--ok">
              <Icon name="check-circle" />
              {valid.length} mã hợp lệ
            </li>
            {invalid.length > 0 ? (
              <li className="erp-barcode-stat erp-barcode-stat--bad">
                <Icon name="x-circle" />
                {invalid.length} dòng sai — bị loại
              </li>
            ) : null}
            {batch.header ? <li className="erp-barcode-stat">Bỏ dòng tiêu đề “{batch.header}”</li> : null}
            {batch.dropped > 0 ? (
              <li className="erp-barcode-stat erp-barcode-stat--bad">
                <Icon name="exclamation-triangle" />
                Bỏ {batch.dropped} dòng vượt trần {BARCODE_BATCH_LIMIT}
              </li>
            ) : null}
          </ul>

          {invalid.length > 0 ? (
            <div className="erp-barcode-errors">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th scope="col">Dòng</th>
                    <th scope="col">Giá trị</th>
                    <th scope="col">Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {invalid.slice(0, SHOWN_ERRORS).map((row) => (
                    <tr key={row.line}>
                      <td>{row.line}</td>
                      <td className="erp-barcode-errors__value">{row.raw}</td>
                      <td>{row.check.ok ? '' : row.check.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invalid.length > SHOWN_ERRORS ? <p className="erp-barcode-muted">… và {invalid.length - SHOWN_ERRORS} dòng sai nữa.</p> : null}
            </div>
          ) : null}

          <div className="erp-barcode-actions">
            {(['pdf', 'png', 'svg'] as const).map((type) => (
              <Button
                key={type}
                variant={type === 'pdf' ? 'primary' : 'outline-secondary'}
                disabled={!engine || valid.length === 0 || progress !== null}
                onClick={() => void exportAs(type)}
              >
                <Icon name={type === 'pdf' ? 'file-earmark-pdf' : 'file-earmark-zip'} className="me-2" />
                {progress?.type === type
                  ? `Đang dựng ${progress.done}/${progress.total}…`
                  : type === 'pdf'
                    ? `PDF (${valid.length} trang)`
                    : `Gói ${type.toUpperCase()} (.zip)`}
              </Button>
            ))}
          </div>
          {nudge.extra}
        </div>
      ) : null}
    </>
  )
}
