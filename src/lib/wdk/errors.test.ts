import { describe, expect, it, vi } from 'vitest'
import { describeWalletError, isPreflightFailure, retryPreflight } from './errors'

const FALLBACK = "We couldn't complete the payment"

describe('describeWalletError', () => {
  it('translates the rate-limited bundler, the failure that actually happens', () => {
    expect(describeWalletError(new Error('sendRPCRequest(pimlico_getUserOperationGasPrice) failed'), FALLBACK))
      .toBe('The payment network is busy right now. Wait a few seconds and try again.')
  })

  it('never lets a library error through, whatever it says', () => {
    for (const raw of [
      'bundler eth_getUserOperationByHash rpc call failed',
      'Public API key rate limit exceeded',
      'reverted at 0xd077a400968890eacc75cdc901f0356c943e4fdb',
      'invalid opcode (SELFDESTRUCT)'
    ]) {
      const shown = describeWalletError(new Error(raw), FALLBACK)
      expect(shown).not.toBe(raw)
      expect(shown).not.toMatch(/rpc|0x|_[a-zA-Z]/i)
    }
  })

  it('explains the fee ceiling as a wait, because that is what it is', () => {
    expect(describeWalletError(new Error('Exceeded maximum fee cost for transfer operation'), FALLBACK))
      .toMatch(/charging more/)
  })

  it('says plainly when there is not enough money', () => {
    expect(describeWalletError(new Error('insufficient balance for transfer'), FALLBACK))
      .toMatch(/don't have enough/)
  })

  it('lets our own sentences through untouched', () => {
    expect(describeWalletError(new Error('That username is taken'), FALLBACK))
      .toBe('That username is taken')
  })

  it('falls back when there is nothing to read', () => {
    expect(describeWalletError(new Error(''), FALLBACK)).toBe(FALLBACK)
    expect(describeWalletError(undefined, FALLBACK)).toBe(FALLBACK)
  })
})

describe('isPreflightFailure', () => {
  it('recognises the calls that happen before anything is signed', () => {
    expect(isPreflightFailure(new Error('sendRPCRequest(pimlico_getUserOperationGasPrice) failed'))).toBe(true)
    expect(isPreflightFailure(new Error('estimateUserOperationGas reverted'))).toBe(true)
  })

  it('refuses to call a submitted operation retryable', () => {
    expect(isPreflightFailure(new Error('eth_sendUserOperation failed: rate limit exceeded'))).toBe(false)
    expect(isPreflightFailure(new Error('bundler eth_getUserOperationByHash rpc call failed'))).toBe(false)
  })
})

describe('retryPreflight', () => {
  it('gives a rate-limited pricing call another chance', async () => {
    vi.useFakeTimers()

    let calls = 0
    const promise = retryPreflight(async () => {
      calls++
      if (calls < 3) throw new Error('sendRPCRequest(pimlico_getUserOperationGasPrice) failed')
      return 'quoted'
    })

    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe('quoted')
    expect(calls).toBe(3)

    vi.useRealTimers()
  })

  it('gives up after the last attempt and throws the real error', async () => {
    vi.useFakeTimers()

    let calls = 0
    const promise = retryPreflight(async () => {
      calls++
      throw new Error('sendRPCRequest(pimlico_getUserOperationGasPrice) failed')
    }, { attempts: 2 })

    const settled = expect(promise).rejects.toThrow(/getUserOperationGasPrice/)
    await vi.runAllTimersAsync()
    await settled

    expect(calls).toBe(2)
    vi.useRealTimers()
  })

  it('never repeats an operation that may already have sent money', async () => {
    let calls = 0

    await expect(retryPreflight(async () => {
      calls++
      throw new Error('eth_sendUserOperation failed: rate limit exceeded')
    })).rejects.toThrow()

    expect(calls).toBe(1)
  })
})
