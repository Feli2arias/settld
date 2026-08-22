import { describe, expect, it } from 'vitest'
import { WrongPasswordError, decryptSeed, encryptSeed } from './vault-crypto'

const SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('encrypting the wallet with a password', () => {
  it('what is encrypted with a password opens with that password', async () => {
    const vault = await encryptSeed(SEED, 'a nice long password')
    expect(await decryptSeed(vault, 'a nice long password')).toBe(SEED)
  })

  it('the phrase is not visible inside the encrypted bundle', async () => {
    const vault = await encryptSeed(SEED, 'a nice long password')
    const serialized = JSON.stringify(vault)

    expect(serialized).not.toContain('abandon')
    expect(serialized).not.toContain('a nice long password')
  })

  it('fails with the wrong password instead of returning garbage', async () => {
    const vault = await encryptSeed(SEED, 'the right one')
    await expect(decryptSeed(vault, 'the wrong one')).rejects.toThrow(WrongPasswordError)
  })

  it('the same phrase and password produce a different bundle every time', async () => {
    const [a, b] = await Promise.all([
      encryptSeed(SEED, 'same password'),
      encryptSeed(SEED, 'same password')
    ])

    // Fresh salt and IV on every encryption: two accounts with the same password look
    // nothing alike, and nobody can tell they share a key.
    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
    expect(a.cipher).not.toBe(b.cipher)

    expect(await decryptSeed(b, 'same password')).toBe(SEED)
  })

  it('a tampered bundle does not open', async () => {
    const vault = await encryptSeed(SEED, 'the right one')
    const tampered = { ...vault, cipher: `A${vault.cipher.slice(1)}` }

    await expect(decryptSeed(tampered, 'the right one')).rejects.toThrow(WrongPasswordError)
  })

  it('stretches the password enough that brute-forcing hurts', async () => {
    const vault = await encryptSeed(SEED, 'a nice long password')
    expect(vault.iterations).toBeGreaterThanOrEqual(300_000)
  })
})
