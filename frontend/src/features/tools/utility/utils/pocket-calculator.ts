/** Decimal arithmetic as fractions: no eval and no binary floating point in calculations. */
type Fraction = { n: bigint; d: bigint }
export type CalculatorResult = { ok: true; value: string } | { ok: false; error: 'incomplete' | 'invalid' | 'zero' | 'large' }

function fraction(n: bigint, d = 1n): Fraction {
  if (d === 0n) throw new Error('zero')
  if (d < 0n) { n = -n; d = -d }
  let a = n < 0n ? -n : n, b = d
  while (b) { const remainder = a % b; a = b; b = remainder }
  const gcd = a || 1n
  const value = { n: n / gcd, d: d / gcd }
  if (value.n.toString().length > 250 || value.d.toString().length > 250) throw new Error('large')
  return value
}

function decimal(value: Fraction): string {
  const negative = value.n < 0n
  const n = negative ? -value.n : value.n
  // Keep twelve decimal places, rounding halves away from zero.
  const scale = 10n ** 12n
  const scaled = (n * scale * 2n + value.d) / (value.d * 2n)
  const whole = scaled / scale, rest = String(scaled % scale).padStart(12, '0').replace(/0+$/, '')
  return `${negative && scaled ? '-' : ''}${whole}${rest ? `.${rest}` : ''}`
}

export function calculateExpression(expression: string): CalculatorResult {
  const source = expression.replace(/\s/g, '').replaceAll(',', '.').replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')
  if (!source) return { ok: false, error: 'incomplete' }
  if (source.length > 400) return { ok: false, error: 'large' }
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+*/()%\-]/g) ?? []
  if (tokens.join('') !== source) return { ok: false, error: 'invalid' }
  let position = 0, depth = 0
  const take = () => tokens[position++]
  const peek = () => tokens[position]
  const primary = (): Fraction => {
    if (++depth > 50) throw new Error('large')
    let value: Fraction
    const token = take()
    if (!token) throw new Error('incomplete')
    if (token === '+' || token === '-') {
      value = primary()
      if (token === '-') value = { n: -value.n, d: value.d }
    } else if (token === '(') {
      value = sum()
      if (take() !== ')') throw new Error('incomplete')
    } else if (/^(?:\d|\.)/.test(token)) {
      if (token.length > 60) throw new Error('large')
      const [whole, rest = ''] = token.split('.')
      value = fraction(BigInt((whole || '0') + rest), 10n ** BigInt(rest.length))
    } else throw new Error('invalid')
    while (peek() === '%') { take(); value = fraction(value.n, value.d * 100n) }
    depth--
    return value
  }
  const product = (): Fraction => {
    let left = primary()
    while (peek() === '*' || peek() === '/') {
      const operator = take(), right = primary()
      left = operator === '*' ? fraction(left.n * right.n, left.d * right.d) : fraction(left.n * right.d, left.d * right.n)
    }
    return left
  }
  const sum = (): Fraction => {
    let left = product()
    while (peek() === '+' || peek() === '-') {
      const operator = take(), right = product()
      left = fraction(left.n * right.d + (operator === '+' ? 1n : -1n) * right.n * left.d, left.d * right.d)
    }
    return left
  }
  try {
    const result = sum()
    if (position !== tokens.length) return { ok: false, error: 'invalid' }
    return { ok: true, value: decimal(result) }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid'
    return { ok: false, error: reason === 'zero' || reason === 'large' || reason === 'incomplete' ? reason : 'invalid' }
  }
}
