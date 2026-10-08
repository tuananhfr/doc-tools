export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

/**
 * Length only, counted in code points like the backend; the server also refuses common passwords
 * and the email itself, which the form shows when it answers.
 */
export function passwordLengthProblem(password: string): 'PASSWORD_TOO_SHORT' | 'PASSWORD_TOO_LONG' | null {
  const length = [...password.normalize('NFC')].length
  if (length < PASSWORD_MIN) return 'PASSWORD_TOO_SHORT'
  if (length > PASSWORD_MAX) return 'PASSWORD_TOO_LONG'
  return null
}
