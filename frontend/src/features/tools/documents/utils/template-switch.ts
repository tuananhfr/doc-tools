import type { CvTemplateId } from '../config/cv-templates'
import type { CvDraft } from '../models/cv'

/** Đổi mẫu CV chỉ đổi cách trình bày — mọi ô người dùng đã gõ giữ nguyên (spec v3 UI03, v2 CN-006). */
export function withCvTemplate(draft: CvDraft, template: CvTemplateId): CvDraft {
  return draft.template === template ? draft : { ...draft, template }
}

export interface FormSwitchState<K extends string> {
  kind: K
  values: Record<string, string>
  /** Bản đang soạn của các loại khác, chỉ trong RAM — đổi loại rồi quay lại là còn nguyên. */
  drafts: Partial<Record<K, Record<string, string>>>
}

export function switchFormKind<K extends string>(state: FormSwitchState<K>, next: K, defaults: (kind: K) => Record<string, string>): FormSwitchState<K> {
  if (next === state.kind) return state
  const drafts = { ...state.drafts, [state.kind]: state.values } as Partial<Record<K, Record<string, string>>>
  return { kind: next, values: drafts[next] ?? defaults(next), drafts }
}

/** Khác giá trị mặc định (bỏ khoảng trắng hai đầu) mới tính là đã gõ. */
export function formEdited(values: Record<string, string>, defaults: Record<string, string>): boolean {
  return Object.entries(values).some(([key, value]) => value.trim() !== (defaults[key] ?? '').trim())
}

/** Cảnh báo rời trang phải tính cả nháp đã cất của loại khác — chúng cũng mất khi rời. */
export function anyFormEdited<K extends string>(state: FormSwitchState<K>, defaults: (kind: K) => Record<string, string>): boolean {
  if (formEdited(state.values, defaults(state.kind))) return true
  return (Object.entries(state.drafts) as [K, Record<string, string> | undefined][]).some(([kind, values]) => kind !== state.kind && values !== undefined && formEdited(values, defaults(kind)))
}
