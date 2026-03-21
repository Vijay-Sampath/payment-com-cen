'use client'

import { motion } from 'framer-motion'
import { RepairQueueItem } from '@/types'

interface Props {
  item: RepairQueueItem
}

export function AgentReasoningPanel({ item }: Props) {
  const proposal = item.aiProposal
  const confidencePct = Math.round(proposal.confidence * 100)
  const circumference = 2 * Math.PI * 40
  const dashOffset = circumference - (confidencePct / 100) * circumference

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="glass h-full flex flex-col p-4 space-y-4"
    >
      <h3 className="text-[15px] font-bold text-[#0f172a]">AI Confidence</h3>

      {/* Radial gauge */}
      <div className="flex justify-center">
        <div className="relative w-28 h-28">
          <svg width="112" height="112" viewBox="0 0 100 100" className="-rotate-90">
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="8"
            />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke={confidencePct >= 90 ? '#0d9488' : confidencePct >= 80 ? '#d97706' : '#dc2626'}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-[24px] font-extrabold ${
              confidencePct >= 90 ? 'text-[#0d9488]' : confidencePct >= 80 ? 'text-[#d97706]' : 'text-[#dc2626]'
            }`}>
              {confidencePct}%
            </span>
          </div>
        </div>
      </div>

      {/* Evidence list */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-semibold">Evidence Sources</span>
        <ul className="mt-2 space-y-1.5">
          {proposal.fields.map((field, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[#0d9488] mt-0.5 shrink-0">&#x2022;</span>
              <span className="text-[12px] text-[#0f172a]">{field.source}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Exception details */}
      <div className="space-y-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-semibold">Exception Type</span>
          <p className="text-[13px] font-semibold text-[#0f172a] mt-0.5">
            {item.exceptionType.replace(/_/g, ' ')}
          </p>
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-semibold">Governance Pattern</span>
          <p className="text-[13px] font-semibold text-[#0f172a] mt-0.5">
            {item.makerChecker.replace(/_/g, ' ')}
          </p>
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-semibold">Estimated Time</span>
          <p className="text-[13px] font-semibold text-[#0d9488] mt-0.5">{proposal.estimatedTime}</p>
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-wider text-[#64748b] font-semibold">Value at Stake</span>
          <p className="text-[13px] font-semibold text-[#0f172a] mt-0.5">
            ${(item.amount / 1_000_000).toFixed(1)}M {item.currency}
          </p>
        </div>
      </div>

      {/* Corridor */}
      <div className="mt-auto pt-3 border-t border-[#e2e8f0]">
        <div className="text-[11px] text-[#64748b]">
          Corridor: <span className="font-semibold text-[#0f172a]">{item.corridor}</span>
        </div>
        <div className="text-[11px] text-[#64748b] mt-0.5">
          Raised: <span className="font-mono text-[#0f172a]">{new Date(item.raisedAt).toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
      </div>
    </motion.div>
  )
}
