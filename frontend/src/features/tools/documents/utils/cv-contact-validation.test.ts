import { describe, expect, it } from 'vitest'
import { cvContactError } from './cv-contact-validation'

describe('optional CV contact validation', () => {
  it('allows omitted contact details', () => {
    for (const field of ['phone', 'email', 'link']) expect(cvContactError(field, '')).toBeNull()
  })
  it('requires a phone number of 8–15 digits without silently changing input', () => {
    expect(cvContactError('phone', '0901234567')).toBeNull()
    for (const value of ['090abc4567', '090 123 4567', '+84901234567', '123', '1234567890123456']) expect(cvContactError('phone', value)).toBe('cv.validation.phone')
  })
  it('requires an email address with a domain and no whitespace', () => {
    expect(cvContactError('email', 'an.nguyen+cv@example.com')).toBeNull()
    for (const value of ['nguyen', 'an@', '@example.com', 'an@example', 'an @example.com']) expect(cvContactError('email', value)).toBe('cv.validation.email')
  })
  it('accepts only web portfolio URLs', () => {
    expect(cvContactError('link', 'https://example.com/portfolio')).toBeNull()
    for (const value of ['example.com', 'javascript:alert(1)', 'https://example.com/a b']) expect(cvContactError('link', value)).toBe('cv.validation.link')
  })
})
