'use client'

import { useApp } from '@/lib/store'

export function RepairAuditLog() {
  const { state } = useApp()
  const { queue } = state.repair

  // Build audit entries from queue status changes
  const entries = queue
    .filter((item) => item.status !== 'queued' && item.status !== 'ai_proposed')
    .map((item) => ({
      timestamp: item.approvedAt ?? item.aiProposal.proposedAt,
      action: item.status === 'approved' ? 'Approved' :
        item.status === 'applied' ? 'Applied' :
        item.status === 'verified' ? 'Verified' :
        item.status === 'rejected' ? 'Rejected' : 'Reviewed',
      itemId: item.id,
      paymentId: item.paymentId,
      approver: item.approvedBy ?? 'System',
      pattern: item.makerChecker,
    }))

  // Also include AI proposals as entries
  const proposalEntries = queue.map((item) => ({
    timestamp: item.aiProposal.proposedAt,
    action: 'AI Proposed',
    itemId: item.id,
    paymentId: item.paymentId,
    approver: 'AI Engine',
    pattern: item.makerChecker,
  }))

  const allEntries = [...proposalEntries, ...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  if (allEntries.length === 0) return null

  return (
    <div className="glass p-4">
      <h3 className="text-[15px] font-bold text-[#0f172a] mb-3">Repair Audit Log</h3>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {allEntries.map((entry, i) => (
          <div key={i} className="flex items-center gap-3 text-[12px] py-1.5 border-b border-[#e2e8f0] last:border-0">
            <span className="font-mono text-[#64748b] shrink-0 w-16 tabular-nums">
              {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
            </span>
            <span className={`font-semibold shrink-0 w-20 ${
              entry.action === 'Approved' ? 'text-[#0d9488]' :
              entry.action === 'Rejected' ? 'text-[#dc2626]' :
              entry.action === 'AI Proposed' ? 'text-[#2563eb]' :
              'text-[#64748b]'
            }`}>
              {entry.action}
            </span>
            <span className="font-mono text-[#0f172a] shrink-0 w-28">{entry.itemId}</span>
            <span className="text-[#64748b] flex-1 truncate">{entry.paymentId}</span>
            <span className="text-[#d97706] font-medium shrink-0">{entry.approver}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#64748b] mt-3 italic">
        Full repair audit trail available for compliance review.
      </p>
    </div>
  )
}
