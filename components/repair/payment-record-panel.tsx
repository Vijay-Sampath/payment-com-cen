'use client'

import { PaymentSnapshot } from '@/types'

interface Props {
  snapshot: PaymentSnapshot
  label?: string
}

const sections: { title: string; fields: { key: keyof PaymentSnapshot; label: string }[] }[] = [
  {
    title: 'Message Header',
    fields: [
      { key: 'messageType', label: 'Message Type' },
      { key: 'instructionId', label: 'Instruction ID' },
      { key: 'transactionRef', label: 'Transaction Ref' },
      { key: 'uetr', label: 'UETR' },
      { key: 'settlementDate', label: 'Settlement Date' },
      { key: 'valueDate', label: 'Value Date' },
      { key: 'priority', label: 'Priority' },
    ],
  },
  {
    title: 'Ordering Customer',
    fields: [
      { key: 'originatorName', label: 'Name' },
      { key: 'originatorAccount', label: 'Account' },
      { key: 'originatorBic', label: 'BIC' },
      { key: 'originatorAddress', label: 'Address' },
    ],
  },
  {
    title: 'Beneficiary',
    fields: [
      { key: 'beneficiaryName', label: 'Name' },
      { key: 'beneficiaryAccount', label: 'Account' },
      { key: 'beneficiaryBic', label: 'BIC' },
      { key: 'beneficiaryAddress', label: 'Address' },
    ],
  },
  {
    title: 'Intermediary Institutions',
    fields: [
      { key: 'orderingInstitutionBic', label: 'Ordering Institution' },
      { key: 'intermediaryBic', label: 'Intermediary' },
      { key: 'accountWithInstitutionBic', label: 'Account With Institution' },
    ],
  },
  {
    title: 'Financial Details',
    fields: [
      { key: 'amount', label: 'Amount' },
      { key: 'currency', label: 'Currency' },
      { key: 'exchangeRate', label: 'Exchange Rate' },
      { key: 'chargeBearer', label: 'Charge Bearer' },
    ],
  },
  {
    title: 'Compliance',
    fields: [
      { key: 'sanctionsScreeningResult', label: 'Sanctions Result' },
      { key: 'sanctionsListChecked', label: 'Lists Checked' },
      { key: 'screeningTimestamp', label: 'Screening Time' },
      { key: 'amlRiskScore', label: 'AML Risk Score' },
    ],
  },
  {
    title: 'Status',
    fields: [
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'failureCode', label: 'Failure Code' },
      { key: 'failureDescription', label: 'Failure Description' },
      { key: 'retryCount', label: 'Retry Count' },
      { key: 'queuePosition', label: 'Queue Position' },
    ],
  },
  {
    title: 'Remittance',
    fields: [
      { key: 'purposeOfPayment', label: 'Purpose' },
      { key: 'remittanceInfo', label: 'Remittance Info' },
    ],
  },
]

const monoFields = new Set<keyof PaymentSnapshot>([
  'instructionId', 'transactionRef', 'uetr',
  'originatorAccount', 'originatorBic',
  'beneficiaryAccount', 'beneficiaryBic',
  'orderingInstitutionBic', 'intermediaryBic', 'accountWithInstitutionBic',
])

function formatValue(key: keyof PaymentSnapshot, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (key === 'amount' && typeof value === 'number') return `$${(value / 1_000_000).toFixed(2)}M`
  if (key === 'amlRiskScore' && typeof value === 'number') return `${value}/100`
  return String(value)
}

function statusBadge(key: keyof PaymentSnapshot, value: unknown) {
  if (key === 'sanctionsScreeningResult') {
    const v = String(value)
    const colors = v === 'PASS' ? 'bg-[#0d9488]/10 text-[#0d9488]'
      : v === 'FAIL' ? 'bg-[#dc2626]/10 text-[#dc2626]'
      : v === 'TIMEOUT' ? 'bg-[#d97706]/10 text-[#d97706]'
      : 'bg-[#64748b]/10 text-[#64748b]'
    return <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${colors}`}>{v}</span>
  }
  if (key === 'paymentStatus') {
    const v = String(value)
    const colors = v === 'ACSP' || v === 'ACCC' ? 'bg-[#0d9488]/10 text-[#0d9488]'
      : v === 'RJCT' ? 'bg-[#dc2626]/10 text-[#dc2626]'
      : v === 'HELD' ? 'bg-[#d97706]/10 text-[#d97706]'
      : v === 'CANC' ? 'bg-[#64748b]/10 text-[#64748b]'
      : 'bg-[#2563eb]/10 text-[#2563eb]'
    return <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${colors}`}>{v}</span>
  }
  if (key === 'priority') {
    const v = String(value)
    const colors = v === 'URGENT' ? 'bg-[#dc2626]/10 text-[#dc2626]'
      : v === 'NORMAL' ? 'bg-[#2563eb]/10 text-[#2563eb]'
      : 'bg-[#64748b]/10 text-[#64748b]'
    return <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${colors}`}>{v}</span>
  }
  return null
}

export function PaymentRecordPanel({ snapshot, label }: Props) {
  return (
    <div className="space-y-3">
      {label && (
        <div className="text-[11px] uppercase tracking-wider text-[#64748b] font-semibold">{label}</div>
      )}
      {sections.map((section) => (
        <div key={section.title} className="border border-[#e2e8f0] rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-[#f1f5f9] border-b border-[#e2e8f0]">
            <span className="text-[11px] font-bold text-[#0f172a] uppercase tracking-wider">{section.title}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0 px-3 py-2">
            {section.fields.map(({ key, label: fieldLabel }) => {
              const value = snapshot[key]
              const badge = statusBadge(key, value)
              return (
                <div key={key} className="flex items-baseline justify-between py-1 border-b border-[#f1f5f9] last:border-0">
                  <span className="text-[11px] text-[#64748b] font-medium shrink-0 mr-2">{fieldLabel}</span>
                  {badge || (
                    <span className={`text-[12px] text-[#0f172a] text-right truncate ${monoFields.has(key) ? 'font-mono' : ''}`}>
                      {formatValue(key, value)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
