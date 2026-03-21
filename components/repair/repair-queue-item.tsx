'use client'

import { RepairQueueItem as RepairQueueItemType } from '@/types'

const severityBadge: Record<string, string> = {
  critical: 'bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/30',
  high: 'bg-[#d97706]/10 text-[#d97706] border-[#d97706]/30',
  medium: 'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/30',
  low: 'bg-[#64748b]/10 text-[#64748b] border-[#64748b]/30',
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  queued: { label: 'Queued', cls: 'bg-[#64748b]/10 text-[#64748b]' },
  ai_proposed: { label: 'AI Proposed', cls: 'bg-[#2563eb]/10 text-[#2563eb]' },
  human_review: { label: 'In Review', cls: 'bg-[#d97706]/10 text-[#d97706]' },
  approved: { label: 'Approved', cls: 'bg-[#0d9488]/10 text-[#0d9488]' },
  applied: { label: 'Applied', cls: 'bg-[#0d9488]/10 text-[#0d9488]' },
  verified: { label: 'Verified', cls: 'bg-[#0d9488]/10 text-[#0d9488]' },
  rejected: { label: 'Rejected', cls: 'bg-[#dc2626]/10 text-[#dc2626]' },
}

interface Props {
  item: RepairQueueItemType
  selected: boolean
  onClick: () => void
}

export function RepairQueueItem({ item, selected, onClick }: Props) {
  const sev = severityBadge[item.severity] ?? severityBadge.low
  const stat = statusBadge[item.status] ?? statusBadge.queued
  const amount = (item.amount / 1_000_000).toFixed(1)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        selected
          ? 'border-[#0d9488] bg-[#0d9488]/5 shadow-[0_0_10px_rgba(13,148,136,0.1)]'
          : 'border-[#e2e8f0] hover:border-[#cbd5e1] bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${sev}`}>
          {item.severity}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${stat.cls}`}>
          {stat.label}
        </span>
      </div>
      <div className="text-[13px] font-semibold text-[#0f172a] truncate">
        {item.exceptionType.replace(/_/g, ' ')}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[12px] text-[#64748b] font-mono">{item.paymentId}</span>
        <span className="text-[12px] font-semibold text-[#0f172a]">${amount}M</span>
      </div>
      <div className="text-[11px] text-[#64748b] mt-1 truncate">{item.originator}</div>
    </button>
  )
}
