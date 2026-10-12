import { Injectable } from '@nestjs/common'
import { systemResolver, type SafeFetchNetwork } from '../net/safe-fetch'

/** A provider so tests can swap DNS and the dial target; production uses the system resolver and real sockets. */
@Injectable()
export class ReadNetwork implements SafeFetchNetwork {
  resolve = systemResolver
}
