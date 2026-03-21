'use client'

import { useApp } from '@/lib/store'
import { AnimatedCounter } from '@/components/shared/animated-counter'

export function RepairSummaryCard() {
  const { state } = useApp()
  const { queue } = state.repair

  const total = queue.length
  const proposed = queue.filter((i) => i.status === 'ai_proposed' || i.status === 'human_review').length
  const approved = queue.filter((i) => i.status === 'approved' || i.status === 'applied' || i.status === 'verified').length
  const rejected = queue.filter((i) => i.status === 'rejected').length
  const remaining = total - approved - rejected

  return (
    <div className="glass p-4">
      <div className="flex items-center gap-4 divide-x divide-[#e2e8f0]">
        <div className="text-center pr-4">
          <AnimatedCounter value={total} className="text-[24px] font-extrabold text-[#0f172a] tabular-nums" />
          <p className="text-[10px] text-[#64748b] mt-0.5 font-medium">Total</p>
        </div>
        <div className="text-center px-4">
          <AnimatedCounter value={proposed} className="text-[24px] font-extrabold text-[#2563eb] tabular-nums" />
          <p className="text-[10px] text-[#64748b] mt-0.5 font-medium">AI Proposed</p>
        </div>
        <div className="text-center px-4">
          <AnimatedCounter value={approved} className="text-[24px] font-extrabold text-[#0d9488] tabular-nums" />
          <p className="text-[10px] text-[#64748b] mt-0.5 font-medium">Approved</p>
        </div>
        <div className="text-center px-4">
          <AnimatedCounter value={rejected} className="text-[24px] font-extrabold text-[#dc2626] tabular-nums" />
          <p className="text-[10px] text-[#64748b] mt-0.5 font-medium">Rejected</p>
        </div>
        <div className="text-center pl-4">
          <AnimatedCounter value={remaining} className="text-[24px] font-extrabold text-[#d97706] tabular-nums" />
          <p className="text-[10px] text-[#64748b] mt-0.5 font-medium">Remaining</p>
        </div>
      </div>
    </div>
  )
}
