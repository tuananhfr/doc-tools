import type { SignedRulesState } from '../hooks/useSignedRules'
import { formatRuleDate } from '../services/signed-rules'

interface RuleStatusProps<T> {
  rules: SignedRulesState<T>
  /** Tên bộ số liệu chèn vào câu báo trước, ví dụ "bảng giá điện". */
  label: string
  /** Câu riêng của trang khi hệ thống chưa có gói nào đang hiệu lực; bỏ trống = không báo (gói phụ như thuế). */
  noneText?: string
}

/** Trạng thái gói đã ký, đặt cạnh nút "Áp dụng" — nút chỉ hiện khi `rules.state === 'ready'`. */
export function RuleStatus<T>({ rules, label, noneText }: RuleStatusProps<T>) {
  const upcoming = rules.state === 'ready' || rules.state === 'none' ? rules.upcoming : null
  return <>
    {rules.state === 'loading' ? <p className="mt-3" role="status">Đang tải số liệu đã ký…</p> : null}
    {rules.state === 'none' && noneText ? <p className="mt-3">{noneText}</p> : null}
    {rules.state === 'invalid' ? <p className="mt-3" role="alert">Gói số liệu trên hệ thống không qua bước kiểm tra (chữ ký, hạn hoặc định dạng) nên không được dùng. Hãy báo quản trị viên.</p> : null}
    {rules.state === 'unavailable' ? <p className="mt-3">Không tải được số liệu đã ký từ máy chủ. Bạn vẫn có thể tự nhập.</p> : null}
    {upcoming ? <p className="mt-2">Từ {formatRuleDate(upcoming.effectiveFrom)} áp dụng {label} mới theo {upcoming.source.title}.</p> : null}
  </>
}
