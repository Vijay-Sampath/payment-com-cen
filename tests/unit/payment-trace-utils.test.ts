import { describe, expect, it } from 'vitest'
import { filterPayments, getNodeStatus } from '@/lib/payment-trace-utils'
import { PaymentRecord } from '@/types'

// --- Fixtures ---

function makePayment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: 'FT20250319-00001',
    uetr: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    originator: 'Siemens AG',
    beneficiary: 'Acme Corp',
    amount: 5_000_000,
    currency: 'USD',
    originBic: 'BOFAUS3NXXX',
    destBic: 'DEUTDEFFXXX',
    status: 'stuck',
    corridor: 'USD/EUR',
    timestamp: '2025-03-19T23:17:03.847Z',
    sanctionsCheckStatus: 'timeout',
    retryCount: 3,
    ...overrides,
  }
}

const payments: PaymentRecord[] = [
  makePayment({ id: 'FT-001', originator: 'Siemens AG', corridor: 'USD/GBP', status: 'stuck', currency: 'USD' }),
  makePayment({ id: 'FT-002', originator: 'Rio Tinto', corridor: 'USD/JPY', status: 'recovered', currency: 'USD' }),
  makePayment({ id: 'FT-003', originator: 'Merck KGaA', corridor: 'USD/SGD', status: 'failed', currency: 'SGD' }),
  makePayment({ id: 'FT-004', originator: 'BMW Group', corridor: 'EUR/GBP', status: 'completed', currency: 'EUR' }),
  makePayment({ id: 'FT-005', originator: 'Siemens AG', corridor: 'USD/EUR', status: 'stuck', currency: 'USD' }),
]

// ================================================================
// filterPayments
// ================================================================
describe('filterPayments', () => {
  it('returns all payments when query is empty', () => {
    expect(filterPayments(payments, '')).toHaveLength(5)
  })

  it('returns all payments when query is whitespace', () => {
    expect(filterPayments(payments, '   ')).toHaveLength(5)
  })

  it('filters by payment ID', () => {
    const result = filterPayments(payments, 'FT-003')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('FT-003')
  })

  it('filters by originator (case-insensitive)', () => {
    const result = filterPayments(payments, 'siemens')
    expect(result).toHaveLength(2)
    expect(result.every((p) => p.originator === 'Siemens AG')).toBe(true)
  })

  it('filters by corridor', () => {
    const result = filterPayments(payments, 'USD/JPY')
    expect(result).toHaveLength(1)
    expect(result[0].originator).toBe('Rio Tinto')
  })

  it('filters by status', () => {
    const result = filterPayments(payments, 'stuck')
    expect(result).toHaveLength(2)
    expect(result.every((p) => p.status === 'stuck')).toBe(true)
  })

  it('filters by currency', () => {
    const result = filterPayments(payments, 'SGD')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('FT-003')
  })

  it('is case-insensitive across all fields', () => {
    expect(filterPayments(payments, 'RIO TINTO')).toHaveLength(1)
    expect(filterPayments(payments, 'usd/gbp')).toHaveLength(1)
    expect(filterPayments(payments, 'RECOVERED')).toHaveLength(1)
    expect(filterPayments(payments, 'eur')).toHaveLength(2) // EUR/GBP corridor + EUR currency
  })

  it('returns empty array when nothing matches', () => {
    expect(filterPayments(payments, 'NONEXISTENT')).toHaveLength(0)
  })

  it('matches partial strings', () => {
    const result = filterPayments(payments, 'mer')
    // Matches 'Merck KGaA'
    expect(result).toHaveLength(1)
    expect(result[0].originator).toBe('Merck KGaA')
  })

  it('handles empty payments array', () => {
    expect(filterPayments([], 'anything')).toHaveLength(0)
  })
})

// ================================================================
// getNodeStatus
// ================================================================
describe('getNodeStatus', () => {
  describe('sanctions node', () => {
    it('returns "failed" when sanctions check timed out', () => {
      const p = makePayment({ sanctionsCheckStatus: 'timeout' })
      expect(getNodeStatus(p, 'sanctions')).toBe('failed')
    })

    it('returns "failed" when sanctions check failed', () => {
      const p = makePayment({ sanctionsCheckStatus: 'failed' })
      expect(getNodeStatus(p, 'sanctions')).toBe('failed')
    })

    it('returns "ok" when sanctions check passed', () => {
      const p = makePayment({ sanctionsCheckStatus: 'passed' })
      expect(getNodeStatus(p, 'sanctions')).toBe('ok')
    })

    it('returns "ok" when sanctions check pending', () => {
      const p = makePayment({ sanctionsCheckStatus: 'pending' })
      expect(getNodeStatus(p, 'sanctions')).toBe('ok')
    })
  })

  describe('legacy node', () => {
    it('returns "slow" when retryCount > 2', () => {
      const p = makePayment({ retryCount: 3 })
      expect(getNodeStatus(p, 'legacy')).toBe('slow')
    })

    it('returns "ok" when retryCount <= 2', () => {
      const p = makePayment({ retryCount: 2 })
      expect(getNodeStatus(p, 'legacy')).toBe('ok')
    })

    it('returns "ok" when retryCount is 0', () => {
      const p = makePayment({ retryCount: 0 })
      expect(getNodeStatus(p, 'legacy')).toBe('ok')
    })
  })

  describe('settlement node', () => {
    it('returns "failed" for stuck status', () => {
      const p = makePayment({ status: 'stuck' })
      expect(getNodeStatus(p, 'settlement')).toBe('failed')
    })

    it('returns "failed" for failed status', () => {
      const p = makePayment({ status: 'failed' })
      expect(getNodeStatus(p, 'settlement')).toBe('failed')
    })

    it('returns "ok" for recovered status', () => {
      const p = makePayment({ status: 'recovered' })
      expect(getNodeStatus(p, 'settlement')).toBe('ok')
    })

    it('returns "ok" for completed status', () => {
      const p = makePayment({ status: 'completed' })
      expect(getNodeStatus(p, 'settlement')).toBe('ok')
    })
  })

  describe('other nodes', () => {
    it('returns "ok" for channel', () => {
      const p = makePayment()
      expect(getNodeStatus(p, 'channel')).toBe('ok')
    })

    it('returns "ok" for fx', () => {
      const p = makePayment()
      expect(getNodeStatus(p, 'fx')).toBe('ok')
    })

    it('returns "ok" for routing', () => {
      const p = makePayment()
      expect(getNodeStatus(p, 'routing')).toBe('ok')
    })

    it('returns "ok" for unknown node key', () => {
      const p = makePayment()
      expect(getNodeStatus(p, 'unknown-node')).toBe('ok')
    })
  })
})
