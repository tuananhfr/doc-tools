import { useTranslation } from 'react-i18next'
import { INTERPRETATION_SOURCES, INTERPRETATION_VERSION, type InterpretationKind } from '../config/interpretation-sources'
import { SPREAD_METHOD_NOTE } from '../config/draw-spreads'
import { NUMEROLOGY_METHOD_NOTE } from '../config/numerology-method'
import { CONCLUSION_METHOD_NOTE, CONCLUSION_VERSION } from '../config/conclusion-method'

export function ReadingSources({ kind }: { kind: InterpretationKind }) {
  const { t } = useTranslation('entertainment')
  return <details className="cn-ent-source cn-ent-reading-source">
    <summary>{t('reading.sources')}</summary>
    <div lang="vi" dir="ltr">
      <p>Nội dung tiếng Việt do Chuyện Nhỏ biên soạn để tham khảo và tự suy ngẫm. Các liên kết dưới đây là tài liệu đối chiếu, không phải xác nhận của tác giả nguồn đối với kết quả này.</p>
      <p>{kind === 'numerology' ? NUMEROLOGY_METHOD_NOTE : SPREAD_METHOD_NOTE}</p>
      <p>{CONCLUSION_METHOD_NOTE}</p>
      {kind === 'cards' ? <p>Các cách xem bài Tây có thể gán ý nghĩa khác nhau cho cùng một lá. Bộ này chọn một cách đọc tham khảo, viết lại bằng tiếng Việt kèm ví dụ. Bồi (J), Đầm (Q), Già (K) có thể chỉ tính cách hoặc vai trò, không xác định giới tính, ngoại hình hay danh tính của một người.</p> : null}
      <ul>{INTERPRETATION_SOURCES[kind].map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul>
      <p className="cn-ent-reading-version">Phiên bản bộ nội dung: {INTERPRETATION_VERSION}</p>
      <p className="cn-ent-reading-version">Phiên bản kết luận: {CONCLUSION_VERSION}</p>
    </div>
  </details>
}
