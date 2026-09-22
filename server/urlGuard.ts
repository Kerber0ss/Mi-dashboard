import { lookup } from 'node:dns/promises'
import type { LookupAddress } from 'node:dns'
import { isIP } from 'node:net'

export type LookupFn = (
  hostname: string,
  opts: { all: true },
) => Promise<LookupAddress[]>

/**
 * SSRF guard for the health probe.
 *
 * Rejects URLs whose scheme is not http/https and hostnames that resolve to
 * loopback, private, link-local, or otherwise non-routable addresses, so the
 * probe cannot be pointed at localhost or internal network services.
 */
export function isPrivateAddress(address: string): boolean {
  // ---- IPv4 -------------------------------------------------------------
  const v4 = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const [a, b, , d] = [Number(v4[1]), Number(v4[2]), Number(v4[3]), Number(v4[4])]
    if (a === 0) return true // 0.0.0.0/8
    if (a === 10) return true // 10/8
    if (a === 127) return true // loopback
    if (a === 169 && b === 254) return true // link-local 169.254/16
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16/12
    if (a === 192 && b === 168) return true // 192.168/16
    return false
  }

  // ---- IPv6 -------------------------------------------------------------
  const a = address.toLowerCase()
  // IPv4-mapped (::ffff:0:0/96) — inspect the embedded IPv4
  const mapped = a.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (mapped) return isPrivateAddress(mapped[1])
  if (a === '::1' || a === '::') return true // loopback / unspecified
  if (/^f[cd]/.test(a)) return true // fc00::/7 unique-local
  if (/^fe[89ab]/.test(a)) return true // fe80::/10 link-local
  return false
}

/**
 * Parse a URL and resolve its hostname via DNS, throwing when the URL is not
 * a probeable public http(s) URL. `resolveIp` is injectable for tests.
 */
export async function resolvePublicHttpUrl(
  raw: string,
  resolveIp: LookupFn = (host, opts) => lookup(host, opts),
): Promise<URL> {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    throw new Error(`invalid url: ${raw}`)
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`scheme not allowed: ${u.protocol}`)
  }
  // IP-literal hostnames skip DNS: validate the address directly
  const bare = u.hostname.startsWith('[') && u.hostname.endsWith(']') ? u.hostname.slice(1, -1) : u.hostname
  if (isIP(bare) !== 0) {
    if (isPrivateAddress(bare)) {
      throw new Error(`hostname is a private address: ${bare}`)
    }
    return u
  }
  const addrs = await resolveIp(u.hostname, { all: true })
  if (addrs.length === 0) throw new Error(`no addresses for ${u.hostname}`)
  for (const { address } of addrs) {
    if (isPrivateAddress(address)) {
      throw new Error(`hostname resolves to private address: ${address}`)
    }
  }
  return u
}
