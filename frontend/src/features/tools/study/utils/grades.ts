export interface GradeResult { letter: string; gradePoint: number }

const GRADE_SCALE: readonly [number, string, number][] = [
  [8.5, 'A', 4], [8, 'B+', 3.5], [7, 'B', 3], [6.5, 'C+', 2.5],
  [5.5, 'C', 2], [5, 'D+', 1.5], [4, 'D', 1], [0, 'F', 0],
]

export function convertGrade(score: number): GradeResult | null {
  if (!Number.isFinite(score) || score < 0 || score > 10) return null
  const band = GRADE_SCALE.find(([minimum]) => score >= minimum)!
  return { letter: band[1], gradePoint: band[2] }
}

export function admissionScore(scores: readonly number[], regionalBonus: number, categoryBonus: number) {
  if (scores.length !== 3 || scores.some((score) => !Number.isFinite(score) || score < 0 || score > 10) ||
    !Number.isFinite(regionalBonus) || regionalBonus < 0 || !Number.isFinite(categoryBonus) || categoryBonus < 0) return null
  const raw = scores.reduce((sum, score) => sum + score, 0)
  const fullBonus = regionalBonus + categoryBonus
  const adjustedBonus = Math.round((raw >= 22.5 ? Math.max(0, (30 - raw) / 7.5) * fullBonus : fullBonus) * 100) / 100
  return { raw, fullBonus, adjustedBonus, total: Math.round((raw + adjustedBonus) * 100) / 100 }
}
