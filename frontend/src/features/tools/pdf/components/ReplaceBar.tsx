import { Button, Form, Spinner } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { FindReplace } from '../hooks/useFindReplace'

/** Ô "Thay bằng" + chọn tất cả + nút thay. Chỉ hiện khi đã bật Thay thế ở tab Tìm. */
export function ReplaceBar({ replace }: { replace: FindReplace }) {
  const count = replace.selected.size
  return (
    <div className="erp-doc-search__replace">
      <Form.Control
        type="text"
        value={replace.replacement}
        placeholder="Thay bằng (để trống = chỉ che)"
        aria-label="Thay bằng"
        onChange={(event) => replace.setReplacement(event.target.value)}
      />
      <div className="erp-doc-search__replace-actions">
        <Form.Check
          id="doc-replace-all"
          type="checkbox"
          label={`Chọn tất cả (${replace.candidates})`}
          checked={replace.allSelected}
          disabled={replace.candidates === 0}
          onChange={(event) => replace.toggleAll(event.target.checked)}
        />
        <Button size="sm" variant="primary" disabled={count === 0 || replace.running} onClick={() => void replace.apply()}>
          {replace.running ? <Spinner size="sm" as="span" className="me-2" /> : <Icon name="arrow-left-right" className="me-2" />}
          Thay {count} chỗ đã chọn
        </Button>
      </div>
      <p className="erp-doc-search__note">
        <Icon name="info-circle" className="me-1" />
        Chỉ che trên bề mặt — chữ gốc vẫn còn trong tệp. Đoạn vắt qua hai dòng phải sửa tay bằng công cụ Sửa chữ.
      </p>
    </div>
  )
}
