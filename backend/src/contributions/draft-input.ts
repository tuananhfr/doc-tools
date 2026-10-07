import { contributionRisk, parseContributionInput, type ContributionInput } from './contribution-input'

export interface DraftInput { contribution: ContributionInput; uncertainties: string[] }

const MAX_UNCERTAINTIES = 20
const MAX_UNCERTAINTY_LENGTH = 1000

/**
 * The agent's draft must already be a valid contribution, so submitting a subset of it can never fail
 * validation later. The reason goes back to the agent verbatim, so it can fix the call and retry.
 */
export function parseDraftInput(value: Record<string, unknown>): DraftInput | string {
  const contribution = parseContributionInput({
    toolId: value.toolId, domain: value.domain, baseSnapshotId: value.baseSnapshotId ?? null,
    proposedChanges: value.changes, sourceRefs: value.sources ?? [], jurisdiction: value.jurisdiction ?? null,
  })
  if (!contribution) {
    return 'Nháp không hợp lệ: cần toolId, domain, 1–50 changes {field (chữ-số . _ -), before, after khác nhau, ≤ 5000 ký tự}, '
      + 'tối đa 10 sources {url https công khai, type OFFICIAL_WEB|OFFICIAL_DOCUMENT|OFFICIAL_API|OTHER}; '
      + 'không chứa email, số điện thoại, khoá/mật khẩu hay địa chỉ nội bộ.'
  }
  if (contributionRisk(contribution.domain) === 'HIGH' && !contribution.sourceRefs.length) {
    return 'Lĩnh vực này bắt buộc có ít nhất một nguồn chính thức trong sources.'
  }
  const raw = value.uncertainties ?? []
  if (!Array.isArray(raw) || raw.length > MAX_UNCERTAINTIES || raw.some((item) => typeof item !== 'string' || item.length > MAX_UNCERTAINTY_LENGTH)) {
    return `uncertainties phải là mảng tối đa ${MAX_UNCERTAINTIES} chuỗi, mỗi chuỗi ≤ ${MAX_UNCERTAINTY_LENGTH} ký tự.`
  }
  return { contribution, uncertainties: (raw as string[]).map((item) => item.trim()).filter(Boolean) }
}
