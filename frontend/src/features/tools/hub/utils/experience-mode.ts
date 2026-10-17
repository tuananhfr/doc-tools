export const EXPERIENCE_MODES = ['simple', 'guided', 'full'] as const
export type ExperienceMode = typeof EXPERIENCE_MODES[number]
export const DEFAULT_EXPERIENCE_MODE: ExperienceMode = 'guided'

export function experienceMode(raw: string | null): ExperienceMode {
  return raw === 'simple' || raw === 'full' ? raw : DEFAULT_EXPERIENCE_MODE
}
