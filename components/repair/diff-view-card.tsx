'use client'

import { motion } from 'framer-motion'
import { RepairQueueItem } from '@/types'

interface Props {
  item: RepairQueueItem
}

export function DiffViewCard({ item }: Props) {
  const proposal = item.aiProposal

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[16px] font-bold text-[#0f172a]">AI-Proposed Repair</h3>
          <span className="text-[11px] font-mono text-[#64748b]">{proposal.id}</span>
        </div>
        <p className="text-[13px] text-[#64748b]">
          {item.paymentId} · {item.originator} → {item.beneficiary} · {item.corridor}
        </p>
      </div>

      {/* Root Cause */}
      <div className="p-3 rounded-lg bg-[#dc2626]/5 border border-[#dc2626]/10">
        <span className="text-[11px] uppercase tracking-wider text-[#dc2626] font-semibold">Root Cause</span>
        <p className="text-[13px] text-[#0f172a] mt-1">{item.rootCause}</p>
      </div>

      {/* Field Diffs */}
      <div className="space-y-3">
        <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-semibold">Proposed Field Changes</span>
        {proposal.fields.map((diff, i) => (
          <div key={i} className="p-3 rounded-lg border border-[#e2e8f0] bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-[#0f172a]">{diff.field}</span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                diff.confidence >= 0.9 ? 'bg-[#0d9488]/10 text-[#0d9488]' :
                diff.confidence >= 0.8 ? 'bg-[#d97706]/10 text-[#d97706]' :
                'bg-[#dc2626]/10 text-[#dc2626]'
              }`}>
                {(diff.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Original */}
              <div className="p-2 rounded bg-[#dc2626]/5 border border-[#dc2626]/10">
                <span className="text-[10px] uppercase tracking-wider text-[#dc2626] font-semibold block mb-1">Original</span>
                <span className="text-[12px] text-[#0f172a] font-mono break-all">{diff.original}</span>
              </div>
              {/* Proposed */}
              <div className="p-2 rounded bg-[#0d9488]/5 border border-[#0d9488]/10">
                <span className="text-[10px] uppercase tracking-wider text-[#0d9488] font-semibold block mb-1">Proposed</span>
                <span className="text-[12px] text-[#0f172a] font-mono break-all">{diff.proposed}</span>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-[#64748b]">
              Source: {diff.source}
            </div>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      <div className="p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
        <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-semibold">AI Reasoning</span>
        <p className="text-[13px] text-[#0f172a] mt-1 leading-relaxed">{proposal.reasoning}</p>
      </div>

      {/* Regulatory Notes */}
      <div className="p-3 rounded-lg bg-[#d97706]/5 border border-[#d97706]/15">
        <span className="text-[11px] uppercase tracking-wider text-[#d97706] font-semibold">Regulatory Notes</span>
        <p className="text-[13px] text-[#0f172a] mt-1">{proposal.regulatoryNotes}</p>
      </div>
    </motion.div>
  )
}
