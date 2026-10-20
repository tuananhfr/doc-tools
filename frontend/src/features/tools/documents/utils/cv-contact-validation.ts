export function cvContactError(field: string, value: string): 'cv.validation.phone' | 'cv.validation.email' | 'cv.validation.link' | null {
  if (!value.trim()) return null // Contact details are optional.
  if (field === 'phone' && !/^[0-9]{8,15}$/.test(value)) return 'cv.validation.phone'
  if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'cv.validation.email'
  if (field === 'link') {
    try {
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol) || /\s/.test(value)) return 'cv.validation.link'
    } catch { return 'cv.validation.link' }
  }
  return null
}
