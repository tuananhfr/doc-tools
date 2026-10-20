/** Apply on blur, so Vietnamese IME composition and the caret are not disturbed. */
export function capitalizeInitial(value: string, words = false): string {
  const upper = (word: string) => /\p{Lu}/u.test(word.slice(1)) ? word : word[0].toLocaleUpperCase() + word.slice(1)
  if (words) return value.replace(/\p{L}[\p{L}\p{M}]*/gu, upper)
  return value.replace(/(^[\s•–-]*|\n[\s•–-]*|[.!?][\s•–-]+)(\p{L}[\p{L}\p{M}]*)/gu, (_, prefix: string, word: string) => prefix + upper(word))
}
