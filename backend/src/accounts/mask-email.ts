/** `nguyen@gmail.com` → `n***@gmail.com`: the owner recognises it, a stranger holding the old mailbox cannot use it. */
export function maskEmail(email: string) {
  const at = email.lastIndexOf('@')
  return `${email.slice(0, 1)}***${email.slice(at)}`
}
