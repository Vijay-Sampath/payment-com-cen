'use client'

import { motion } from 'framer-motion'
import { PaymentSnapshot, RepairQueueItem } from '@/types'

interface Props {
  item: RepairQueueItem
}

interface FieldDef {
  key: keyof PaymentSnapshot
  label: string
}

const sectionDefs: { title: string; fields: FieldDef[] }[] = [
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

function formatValue(key: keyof PaymentSnapshot, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (key === 'amount' && typeof value === 'number') return `$${(value / 1_000_000).toFixed(2)}M`
  if (key === 'amlRiskScore' && typeof value === 'number') return `${value}/100`
  return String(value)
}

const monoKeys = new Set<keyof PaymentSnapshot>([
  'instructionId', 'transactionRef', 'uetr',
  'originatorAccount', 'originatorBic',
  'beneficiaryAccount', 'beneficiaryBic',
  'orderingInstitutionBic', 'intermediaryBic', 'accountWithInstitutionBic',
])

export function PaymentComparisonView({ item }: Props) {
  const original = item.originalPayment
  const repaired = item.repairedPayment

  // Count changed fields
  const allFields = sectionDefs.flatMap((s) => s.fields)
  const totalFields = allFields.length
  const changedFields = allFields.filter(({ key }) => {
    const ov = formatValue(key, original[key])
    const rv = formatValue(key, repaired[key])
    return ov !== rv
  }).length

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[16px] font-bold text-[#0f172a]">Full Payment Record</h3>
          <span className="text-[11px] font-mono text-[#64748b]">{item.paymentId}</span>
        </div>
        <p className="text-[13px] text-[#64748b]">
          {item.originator} → {item.beneficiary} · {item.corridor}
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#2563eb]/5 border border-[#2563eb]/15">
        <span className="text-[12px] font-semibold text-[#2563eb]">
          {changedFields} field{changedFields !== 1 ? 's' : ''} modified
        </span>
        <span className="text-[12px] text-[#64748b]">out of {totalFields} total</span>
      </div>

      {/* Comparison table */}
      {sectionDefs.map((section) => {
        const hasChanges = section.fields.some(({ key }) =>
          formatValue(key, original[key]) !== formatValue(key, repaired[key])
        )

        return (
          <div key={section.title} className="border border-[#e2e8f0] rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-[#f1f5f9] border-b border-[#e2e8f0] flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#0f172a] uppercase tracking-wider">{section.title}</span>
              {hasChanges && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#2563eb]/10 text-[#2563eb]">MODIFIED</span>
              )}
            </div>
            <div className="divide-y divide-[#f1f5f9]">
              {/* Column headers */}
              <div className="grid grid-cols-[140px_1fr_24px_1fr] gap-1 px-3 py-1 bg-[#f8fafc]">
                <span className="text-[10px] font-semibold text-[#64748b] uppercase">Field</span>
                <span className="text-[10px] font-semibold text-[#64748b] uppercase">Original</span>
                <span />
                <span className="text-[10px] font-semibold text-[#64748b] uppercase">Repaired</span>
              </div>
              {section.fields.map(({ key, label }) => {
                const ov = formatValue(key, original[key])
                const rv = formatValue(key, repaired[key])
                const changed = ov !== rv
                const isMono = monoKeys.has(key)

                return (
                  <div
                    key={key}
                    className={`grid grid-cols-[140px_1fr_24px_1fr] gap-1 px-3 py-1.5 items-center ${changed ? 'bg-[#fefce8]/50' : ''}`}
                  >
                    <span className="text-[11px] text-[#64748b] font-medium truncate">{label}</span>
                    <span className={`text-[12px] break-all ${isMono ? 'font-mono' : ''} ${changed ? 'text-[#dc2626] line-through bg-[#dc2626]/5 px-1 rounded' : 'text-[#94a3b8]'}`}>
                      {ov}
                    </span>
                    <span className="text-[#64748b] text-center text-[11px]">
                      {changed ? '→' : ''}
                    </span>
                    <span className={`text-[12px] break-all ${isMono ? 'font-mono' : ''} ${changed ? 'text-[#0d9488] font-bold bg-[#0d9488]/5 px-1 rounded' : 'text-[#94a3b8]'}`}>
                      {rv}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </motion.div>
  )
}
