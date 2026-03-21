'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { RepairQueueItem } from '@/types'
import { showToast } from '@/components/shared/toast'
import { BatchApprovalCard } from './batch-approval-card'

const patternBadge: Record<string, string> = {
  FOUR_EYES: 'bg-[#d97706]/10 text-[#d97706] border-[#d97706]/30',
  BATCH_APPROVAL: 'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/30',
  AUTONOMOUS_WITH_AUDIT: 'bg-[#0d9488]/10 text-[#0d9488] border-[#0d9488]/30',
}

interface Props {
  item: RepairQueueItem
}

export function MakerCheckerActionBar({ item }: Props) {
  const { state, dispatch } = useApp()
  const [showBatchConfirm, setShowBatchConfirm] = useState(false)

  const isActionable = item.status === 'ai_proposed' || item.status === 'human_review'
  const pendingItems = state.repair.queue.filter(
    (i) => i.status === 'ai_proposed' || i.status === 'human_review'
  )

  const handleApprove = () => {
    dispatch({ type: 'APPROVE_REPAIR', itemId: item.id })
    showToast(`Repair ${item.id} approved — ${item.makerChecker.replace(/_/g, ' ')} recorded`, 'success')
  }

  const handleReject = () => {
    dispatch({ type: 'REJECT_REPAIR', itemId: item.id })
    showToast(`Repair ${item.id} rejected`, 'warning')
  }

  const handleBatchApprove = () => {
    dispatch({ type: 'APPROVE_ALL_REPAIRS' })
    setShowBatchConfirm(false)
    showToast(`${pendingItems.length} repairs batch-approved`, 'success')
  }

  if (showBatchConfirm) {
    return (
      <BatchApprovalCard
        items={pendingItems}
        onConfirm={handleBatchApprove}
        onCancel={() => setShowBatchConfirm(false)}
      />
    )
  }

  return (
    <div className="p-4 border-t border-[#e2e8f0] bg-[#f8fafc] rounded-b-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
            patternBadge[item.makerChecker] ?? patternBadge.FOUR_EYES
          }`}>
            {item.makerChecker.replace(/_/g, ' ')}
          </span>
          {item.approvedBy && (
            <span className="text-[12px] text-[#0d9488] font-medium">
              Approved by {item.approvedBy}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pendingItems.length > 1 && isActionable && (
            <button
              onClick={() => setShowBatchConfirm(true)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#0d9488]/5 text-[#0d9488] border border-[#0d9488]/20 hover:bg-[#0d9488]/10 transition-all"
            >
              Approve All ({pendingItems.length})
            </button>
          )}
          {isActionable && (
            <>
              <button
                onClick={handleReject}
                className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-[#dc2626] border border-[#dc2626]/30 hover:bg-[#dc2626]/5 transition-all"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-1.5 rounded-lg text-[12px] font-bold bg-[#0d9488] text-white hover:bg-[#0f766e] transition-all shadow-sm"
              >
                Approve Repair
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
