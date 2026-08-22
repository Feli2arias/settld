import { describe, expect, it } from 'vitest'
import { WrongPasswordError, decryptSeed, encryptSeed } from './vault-crypto'

const SEED = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('cifrado de la wallet con contraseña', () => {
  it('lo que se cifra con una contraseña se abre con esa contraseña', async () => {
    const vault = await encryptSeed(SEED, 'una contraseña larga')
    expect(await decryptSeed(vault, 'una contraseña larga')).toBe(SEED)
  })

  it('la frase no queda a la vista en el bulto cifrado', async () => {
    const vault = await encryptSeed(SEED, 'una contraseña larga')
    const serialized = JSON.stringify(vault)

    expect(serialized).not.toContain('abandon')
    expect(serialized).not.toContain('una contraseña larga')
  })

  it('con la contraseña equivocada falla en vez de devolver basura', async () => {
    const vault = await encryptSeed(SEED, 'la correcta')
    await expect(decryptSeed(vault, 'la incorrecta')).rejects.toThrow(WrongPasswordError)
  })

  it('la misma frase y contraseña dan bultos distintos cada vez', async () => {
    const [a, b] = await Promise.all([
      encryptSeed(SEED, 'misma contraseña'),
      encryptSeed(SEED, 'misma contraseña')
    ])

    // Sal e IV nuevos en cada cifrado: dos cuentas con la misma contraseña no se
    // parecen en nada, y nadie puede deducir que comparten clave.
    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
    expect(a.cipher).not.toBe(b.cipher)

    expect(await decryptSeed(b, 'misma contraseña')).toBe(SEED)
  })

  it('un bulto manipulado no se abre', async () => {
    const vault = await encryptSeed(SEED, 'la correcta')
    const tampered = { ...vault, cipher: `A${vault.cipher.slice(1)}` }

    await expect(decryptSeed(tampered, 'la correcta')).rejects.toThrow(WrongPasswordError)
  })

  it('estira la contraseña lo suficiente como para que probar a lo bruto duela', async () => {
    const vault = await encryptSeed(SEED, 'una contraseña larga')
    expect(vault.iterations).toBeGreaterThanOrEqual(300_000)
  })
})
