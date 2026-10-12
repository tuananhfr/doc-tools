import { BlockList, isIP } from 'node:net'

// Everything that is not the public Internet. Wider than ai/api-base.ts: NAT64, 6to4 and Teredo can embed
// or route to an internal IPv4 address, and documentation ranges are never a real article host.
const BLOCKED = new BlockList()
const IPV4: readonly (readonly [string, number])[] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]
const IPV6: readonly (readonly [string, number])[] = [
  ['::', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['100::', 64], ['2001::', 23], ['2001:db8::', 32],
  ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
]
for (const [network, prefix] of IPV4) BLOCKED.addSubnet(network, prefix, 'ipv4')
for (const [network, prefix] of IPV6) BLOCKED.addSubnet(network, prefix, 'ipv6')

/** True when the server must not connect to this address; anything that is not an IP literal counts as blocked. */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address)
  if (!family) return true
  // BlockList already matches ::ffff:a.b.c.d against IPv4 rules; the dotted form is checked explicitly as well.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)
  if (mapped) return BLOCKED.check(mapped[1], 'ipv4')
  return BLOCKED.check(address, family === 4 ? 'ipv4' : 'ipv6')
}
