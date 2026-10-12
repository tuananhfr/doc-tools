// Self-signed certificate made in memory for each test run, so no private key is committed and no openssl
// binary is needed (it is not on PATH outside Git Bash on Windows). Covers example.com, *.example.com and the
// documentation address the tests dial. node:crypto has no X.509 builder, so the DER is assembled by hand.
const crypto = require('node:crypto')

const len = (n) => n < 0x80 ? Buffer.from([n]) : n < 0x100 ? Buffer.from([0x81, n]) : Buffer.from([0x82, n >> 8, n & 0xff])
const tlv = (tag, ...parts) => { const body = Buffer.concat(parts); return Buffer.concat([Buffer.from([tag]), len(body.length), body]) }
const seq = (...parts) => tlv(0x30, ...parts)
const oid = (dotted) => {
  const [a, b, ...rest] = dotted.split('.').map(Number)
  const bytes = [a * 40 + b]
  for (const value of rest) {
    const chunk = [value & 0x7f]
    for (let v = value >> 7; v > 0; v >>= 7) chunk.unshift((v & 0x7f) | 0x80)
    bytes.push(...chunk)
  }
  return tlv(0x06, Buffer.from(bytes))
}
const utcTime = (date) => tlv(0x17, Buffer.from(date.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'))
const name = (cn) => seq(tlv(0x31, seq(oid('2.5.4.3'), tlv(0x0c, Buffer.from(cn)))))
const ECDSA_SHA256 = seq(oid('1.2.840.10045.4.3.2'))

function makeTestTls({ dns = ['example.com', '*.example.com'], ip = '93.184.216.34' } = {}) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
  const now = Date.now()
  const altNames = seq(
    ...dns.map((host) => tlv(0x82, Buffer.from(host))),
    tlv(0x87, Buffer.from(ip.split('.').map(Number))),
  )
  const extensions = tlv(0xa3, seq(
    seq(oid('2.5.29.19'), tlv(0x04, seq(tlv(0x01, Buffer.from([0xff]))))),
    seq(oid('2.5.29.17'), tlv(0x04, altNames)),
  ))
  const serial = crypto.randomBytes(8)
  serial[0] &= 0x7f
  const tbs = seq(
    tlv(0xa0, tlv(0x02, Buffer.from([2]))),
    tlv(0x02, serial),
    ECDSA_SHA256,
    name(dns[0]),
    seq(utcTime(new Date(now - 86_400_000)), utcTime(new Date(now + 86_400_000))),
    name(dns[0]),
    publicKey.export({ type: 'spki', format: 'der' }),
    extensions,
  )
  const signature = crypto.sign('sha256', tbs, privateKey)
  const der = seq(tbs, ECDSA_SHA256, tlv(0x03, Buffer.from([0]), signature))
  const cert = `-----BEGIN CERTIFICATE-----\n${der.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n`
  return { key: privateKey.export({ type: 'pkcs8', format: 'pem' }), cert }
}

module.exports = { makeTestTls }
