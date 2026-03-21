import { PaymentRecord } from '@/types'

/**
 * Filter payments by a search query across multiple fields.
 * Case-insensitive match on: id, originator, corridor, status, currency.
 */
export function filterPayments(payments: PaymentRecord[], query: string): PaymentRecord[] {
  if (!query.trim()) return payments
  const q = query.toLowerCase()
  return payments.filter((p) =>
    p.id.toLowerCase().includes(q) ||
    p.originator.toLowerCase().includes(q) ||
    p.corridor.toLowerCase().includes(q) ||
    p.status.toLowerCase().includes(q) ||
    p.currency.toLowerCase().includes(q)
  )
}

/**
 * Determine the health status of a service node for a given payment.
 */
export function getNodeStatus(payment: PaymentRecord, svcKey: string): 'ok' | 'slow' | 'failed' {
  if (svcKey === 'sanctions' && (payment.sanctionsCheckStatus === 'timeout' || payment.sanctionsCheckStatus === 'failed'))
    return 'failed'
  if (svcKey === 'legacy' && payment.retryCount > 2) return 'slow'
  if (svcKey === 'settlement' && !payment.status.includes('recovered') && !payment.status.includes('completed'))
    return 'failed'
  return 'ok'
}
