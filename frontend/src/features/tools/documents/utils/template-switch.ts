import type { CvTemplateId } from '../config/cv-templates'
import type { CvDraft } from '../models/cv'

/** Đổi mẫu CV chỉ đổi cách trình bày — mọi ô người dùng đã gõ giữ nguyên (spec v3 UI03, v2 CN-006). */
export function withCvTemplate(draft: CvDraft, template: CvTemplateId): CvDraft {
  return draft.template === template ? draft : { ...draft, template }
}
