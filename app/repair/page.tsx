'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/lib/store'
import { ExceptionQueuePanel } from '@/components/repair/exception-queue-panel'
import { DiffViewCard } from '@/components/repair/diff-view-card'
import { PaymentComparisonView } from '@/components/repair/payment-comparison-view'
import { AgentReasoningPanel } from '@/components/repair/agent-reasoning-panel'
import { MakerCheckerActionBar } from '@/components/repair/maker-checker-action-bar'
import { RepairSummaryCard } from '@/components/repair/repair-summary-card'
import { RepairAuditLog } from '@/components/repair/repair-audit-log'

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

type CenterTab = 'diff' | 'record'

export default function RepairPage() {
  const { state } = useApp()
  const { queue, selectedItemId } = state.repair
  const selectedItem = queue.find((i) => i.id === selectedItemId) ?? null
  const [activeTab, setActiveTab] = useState<CenterTab>('diff')

  // Reset tab when selected item changes
  useEffect(() => {
    setActiveTab('diff')
  }, [selectedItemId])

  const allResolved = queue.every(
    (i) => i.status === 'approved' || i.status === 'applied' || i.status === 'verified' || i.status === 'rejected'
  )

  return (
    <motion.div {...fade} transition={{ duration: 0.3 }} className="space-y-4 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-extrabold text-[#0f172a]">Payment Repair Workbench</h2>
          <p className="text-[14px] text-[#64748b] mt-0.5">
            {state.bank.name} — AI-proposed exception repairs with maker-checker governance
          </p>
        </div>
        <RepairSummaryCard />
      </div>

      {/* All Clear state */}
      {allResolved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-6 border border-[#0d9488]/20 text-center"
        >
          <div className="text-[40px] mb-2">&#x2705;</div>
          <h3 className="text-[18px] font-bold text-[#0d9488]">All Exceptions Resolved</h3>
          <p className="text-[14px] text-[#64748b] mt-1">
            All {queue.length} residual exceptions have been reviewed and processed.
          </p>
        </motion.div>
      )}

      {/* Main 3-panel layout */}
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: '520px' }}>
        {/* Left: Exception Queue */}
        <div className="col-span-3">
          <ExceptionQueuePanel />
        </div>

        {/* Center: Tabs + Content + Action Bar */}
        <div className="col-span-6">
          {selectedItem ? (
            <div className="glass flex flex-col h-full">
              {/* Tab strip */}
              <div className="flex border-b border-[#e2e8f0] px-4 pt-3">
                <button
                  onClick={() => setActiveTab('diff')}
                  className={`text-[13px] font-semibold px-3 pb-2 border-b-2 transition-all mr-1 ${
                    activeTab === 'diff'
                      ? 'border-[#0d9488] text-[#0d9488]'
                      : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  Proposed Changes
                </button>
                <button
                  onClick={() => setActiveTab('record')}
                  className={`text-[13px] font-semibold px-3 pb-2 border-b-2 transition-all ${
                    activeTab === 'record'
                      ? 'border-[#0d9488] text-[#0d9488]'
                      : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  Full Payment Record
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'diff' ? (
                  <DiffViewCard item={selectedItem} />
                ) : (
                  <PaymentComparisonView item={selectedItem} />
                )}
              </div>

              {/* Action bar stays at bottom regardless of tab */}
              <MakerCheckerActionBar item={selectedItem} />
            </div>
          ) : (
            <div className="glass h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-[32px] mb-2 opacity-30">&#x1F527;</div>
                <p className="text-[14px] text-[#64748b]">
                  Select an exception from the queue to view repair details
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Agent Reasoning */}
        <div className="col-span-3">
          {selectedItem ? (
            <AgentReasoningPanel item={selectedItem} />
          ) : (
            <div className="glass h-full flex items-center justify-center p-4">
              <p className="text-[13px] text-[#64748b] text-center">
                AI reasoning will appear here when an exception is selected
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Audit Log */}
      <RepairAuditLog />
    </motion.div>
  )
}
