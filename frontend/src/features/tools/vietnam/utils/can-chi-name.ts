import { translateKey } from '@/i18n/runtime'

/** "Bính Dần" theo ngôn ngữ trang; ghép bằng mẫu `terms.canChi` vì tiếng Hán / Nhật viết liền không dấu cách. */
export function canChiName(stem: number, branch: number): string {
  return translateKey('vietnam:terms.canChi', {
    stem: translateKey(`vietnam:terms.stems.${stem}`),
    branch: translateKey(`vietnam:terms.branches.${branch}`),
  })
}
