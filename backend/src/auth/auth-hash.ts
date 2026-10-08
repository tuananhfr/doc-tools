import { createHmac } from 'node:crypto'
import { configuration } from '../config/configuration'

/** Keys for codes and rate limits are stored keyed, so a database dump does not list the emails or IPs. */
export function authHash(value: string) { return createHmac('sha256', configuration().visitHashSecret).update(value).digest('hex') }

/** The `auth_otps.email_hash` of an address; also used to void its codes when the address leaves an account. */
export function emailCodeKey(email: string) { return authHash(`email:${email}`) }
