import { describe, it, expect } from 'vitest'
import { isPrivateAddress, resolvePublicHttpUrl } from './urlGuard.js'

const publicLookup = async (host: string) => [{ address: '93.184.216.34', family: 4 }]
const privateLookup = async () => [{ address: '10.1.2.3', family: 4 }]
const multiLookup = async () => [
  { address: '93.184.216.34', family: 4 },
  { address: '192.168.1.1', family: 4 },
]
const emptyLookup = async () => []

describe('isPrivateAddress', () => {
  it('rejects loopback, private, link-local and unspecified IPv4', () => {
    for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.0.1', '0.0.0.0']) {
      expect(isPrivateAddress(ip), ip).toBe(true)
    }
  })
  it('accepts public IPv4', () => {
    for (const ip of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '172.15.255.255', '169.255.0.1']) {
      expect(isPrivateAddress(ip), ip).toBe(false)
    }
  })
  it('rejects IPv6 loopback, unique-local, link-local and mapped v4', () => {
    for (const ip of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'febf::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1']) {
      expect(isPrivateAddress(ip), ip).toBe(true)
    }
  })
  it('accepts public IPv6', () => {
    for (const ip of ['2606:2800:220:1:248:1893:25c8:1946', 'fec0::1']) {
      expect(isPrivateAddress(ip), ip).toBe(false)
    }
  })
})

describe('resolvePublicHttpUrl', () => {
  it('passes a public URL through', async () => {
    const u = await resolvePublicHttpUrl('https://example.com/path', publicLookup)
    expect(u.hostname).toBe('example.com')
  })
  it('rejects non-http schemes', async () => {
    await expect(resolvePublicHttpUrl('ftp://example.com', publicLookup)).rejects.toThrow('scheme not allowed')
    await expect(resolvePublicHttpUrl('file:///etc/passwd', publicLookup)).rejects.toThrow('scheme not allowed')
  })
  it('rejects malformed URLs', async () => {
    await expect(resolvePublicHttpUrl('not a url', publicLookup)).rejects.toThrow('invalid url')
  })
  it('rejects private IP literals without DNS', async () => {
    await expect(resolvePublicHttpUrl('http://10.1.2.3', publicLookup)).rejects.toThrow('private address')
    await expect(resolvePublicHttpUrl('http://[::1]', publicLookup)).rejects.toThrow('private address')
  })
  it('allows public IP literals without DNS', async () => {
    const u = await resolvePublicHttpUrl('http://8.8.8.8', publicLookup)
    expect(u.hostname).toBe('8.8.8.8')
  })
  it('rejects hostnames that resolve to a private address', async () => {
    await expect(resolvePublicHttpUrl('http://internal.corp', privateLookup)).rejects.toThrow('private address')
  })
  it('rejects when any resolved address is private', async () => {
    await expect(resolvePublicHttpUrl('http://dual.example', multiLookup)).rejects.toThrow('private address')
  })
  it('rejects empty DNS results', async () => {
    await expect(resolvePublicHttpUrl('http://nx.example', emptyLookup)).rejects.toThrow('no addresses')
  })
})
