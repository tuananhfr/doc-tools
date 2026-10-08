import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

// N=2^15, r=8 needs 32 MiB per hash, so maxmem is raised above Node's 32 MiB default.
const COST = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const KEY_LENGTH = 32

// Short on purpose: length already rules out most of the leaked-password lists; these are the long ones people still pick.
const COMMON = new Set([
  '12345678', '123456789', '1234567890', '0123456789', '87654321', '11111111', '00000000', '88888888', '66666666',
  '12341234', '11223344', '12121212', '123123123', 'password', 'password1', 'password123', 'passw0rd', 'iloveyou',
  'qwertyui', 'qwerty123', 'qwertyuiop', 'asdfghjk', 'abc12345', 'abcd1234', '1qaz2wsx', 'zaq12wsx', 'aa123456',
  'matkhau123', 'anhyeuem', 'emyeuanh', 'yeuemnhieu', 'chuyennho', 'chuyennho123', 'admin123', 'administrator',
])

export type PasswordProblem = 'PASSWORD_TOO_SHORT' | 'PASSWORD_TOO_LONG' | 'PASSWORD_COMMON'

/** NFC so the same Vietnamese password typed with different keyboards hashes the same. */
const prepare = (password: string) => password.normalize('NFC')

/** Policy agreed for Chuyện Nhỏ: 8–128 characters, no composition rules, not a common password or the email. */
export function passwordProblem(password: string, email: string): PasswordProblem | null {
  const value = prepare(password)
  const length = [...value].length
  if (length < PASSWORD_MIN) return 'PASSWORD_TOO_SHORT'
  if (length > PASSWORD_MAX) return 'PASSWORD_TOO_LONG'
  const folded = value.toLowerCase()
  if (COMMON.has(folded) || folded === email || folded === email.split('@')[0]) return 'PASSWORD_COMMON'
  return null
}

function derive(password: string, salt: Buffer, cost: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(prepare(password), salt, KEY_LENGTH, { ...cost, maxmem: COST.maxmem }, (error, key) => error ? reject(error) : resolve(key))
  })
}

/** Self-describing `scrypt$N$r$p$salt$key` so the cost can be raised later without breaking stored hashes. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await derive(password, salt, COST)
  return ['scrypt', COST.N, COST.r, COST.p, salt.toString('base64url'), key.toString('base64url')].join('$')
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, key] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !key) return false
  const expected = Buffer.from(key, 'base64url')
  const actual = await derive(password, Buffer.from(salt, 'base64url'), { N: Number(n), r: Number(r), p: Number(p) })
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

let dummy: Promise<string> | null = null
/**
 * Hash checked when the email has no account (or no password yet), so a wrong email takes as long
 * as a wrong password and the response time does not reveal which emails are registered.
 */
export function dummyHash() { return dummy ??= hashPassword(randomBytes(16).toString('hex')) }
