'use client'

import { motion } from 'framer-motion'
import { RepairQueueItem } from '@/types'

interface Props {
  items: RepairQueueItem[]
  onConfirm: () => void
  onCancel: () => void
}

export function BatchApprovalCard({ items, onConfirm, onCancel }: Props) {
  const totalValue = items.reduce((sum, i) => sum + i.amount, 0) / 1_000_000

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border-t border-[#d97706]/30 bg-[#d97706]/5 rounded-b-xl"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[15px] font-bold text-[#d97706]">Batch Approval Confirmation</span>
        <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[#d97706]/10 text-[#d97706]">
          {items.length} items
        </span>
      </div>

      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-[12px]">
            <span className="text-[#0f172a] font-mono">{item.id}</span>
            <span className="text-[#64748b]">{item.exceptionType.replace(/_/g, ' ')}</span>
            <span className="text-[#0f172a] font-semibold">${(item.amount / 1_000_000).toFixed(1)}M</span>
          </div>
        ))}
      </div>

      <div className="text-[13px] text-[#0f172a] font-semibold mb-3">
        Total value: ${totalValue.toFixed(1)}M across {items.length} exceptions
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-[#64748b] border border-[#e2e8f0] hover:bg-[#f1f5f9] transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-1.5 rounded-lg text-[12px] font-bold bg-[#d97706] text-white hover:bg-[#b45309] transition-all shadow-sm"
        >
          Confirm Batch Approval
        </button>
      </div>
    </motion.div>
  )
}
