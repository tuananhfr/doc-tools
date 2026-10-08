/** Loose shape check before a request; the backend's normalizeEmail is the real validation. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
