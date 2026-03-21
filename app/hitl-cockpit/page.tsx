'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useApp } from '@/lib/store'
import { RemediationOption } from '@/types'

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

function TradeoffBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[14px] text-[#64748b] w-16 shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 10}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-[14px] font-mono font-bold tabular-nums w-10 text-right" style={{ color }}>
        {value}/10
      </span>
    </div>
  )
}

function RemediationCard({
  option,
  isSelected,
  onSelect,
  index,
}: {
  option: RemediationOption
  isSelected: boolean
  onSelect: () => void
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.15, ease: 'easeOut' }}
      whileHover={{ scale: 1.01 }}
      onClick={onSelect}
      className={`glass p-6 cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'border-2 border-[#0d9488]/60 glow-teal'
          : option.recommended
            ? 'border border-[#0d9488]/30 hover:border-[#0d9488]/50'
            : 'hover:border-[#e2e8f0]'
      }`}
      style={{ minHeight: '280px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {option.recommended && (
            <span className="px-3 py-1 rounded-lg bg-[#0d9488]/10 text-[#0d9488] text-[13px] font-bold uppercase tracking-wider">
              AI Recommended
            </span>
          )}
          <span className="text-[14px] font-mono text-[#64748b]">
            Option {option.rank}
          </span>
        </div>
        <motion.div
          animate={isSelected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'border-[#0d9488] bg-[#0d9488]'
              : 'border-[#64748b]/40'
          }`}
        >
          {isSelected && <span className="text-white text-[16px] font-bold">✓</span>}
        </motion.div>
      </div>

      <h4 className="text-[18px] font-bold text-[#0f172a] mb-2">{option.title}</h4>
      <p className="text-[14px] text-[#64748b] leading-relaxed mb-5">
        {option.description}
      </p>

      {/* Tradeoff bars */}
      <div className="space-y-3 mb-5">
        <TradeoffBar label="Speed" value={option.speed} color="#0d9488" />
        <TradeoffBar label="Risk" value={option.risk} color={option.risk > 5 ? '#dc2626' : '#d97706'} />
        <TradeoffBar label="Impact" value={option.businessImpact} color="#2563eb" />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <span className="text-[13px] uppercase tracking-wider text-[#64748b] font-semibold">
          Execution Steps
        </span>
        {option.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-[14px] text-[#64748b]">
            <span className="text-[#0d9488] font-mono shrink-0">{i + 1}.</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 text-[14px] text-[#64748b] font-mono">
        Est. time: <span className="text-[#0f172a] font-bold">{option.estimatedTime}</span>
      </div>
    </motion.div>
  )
}

export default function HITLCockpitPage() {
  const { state, approveHitl, advanceStep, setSelectedRemediation } = useApp()
  const { scenario, bank, scoreboard } = state
  const [selectedOption, setSelectedOption] = useState<string>('option-a')
  const [isApproved, setIsApproved] = useState(false)
  const [countdown, setCountdown] = useState(23 * 60) // 23 minutes in seconds

  // Countdown timer
  useEffect(() => {
    if (isApproved) return
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [isApproved])

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60

  const selectedRemediation = scenario.remediationOptions.find((o) => o.id === selectedOption) || scenario.remediationOptions[0]
  const selectedLabel = selectedRemediation?.title || 'Option A'

  const handleApprove = () => {
    setIsApproved(true)
    setSelectedRemediation(selectedOption)
    approveHitl(selectedLabel)
    // Auto-advance through remaining steps
    setTimeout(() => advanceStep(), 1000)
    setTimeout(() => advanceStep(), 2500)
  }

  return (
    <motion.div {...fade} transition={{ duration: 0.4 }} className="space-y-5 relative z-10">
      {/* Dark red tint overlay when not approved */}
      {!isApproved && (
        <div className="fixed inset-0 hitl-red-tint pointer-events-none z-0" />
      )}

      {/* Full-screen header with dramatic entrance */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <motion.span
            className="text-[36px]"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ⚖️
          </motion.span>
          <h2 className="text-[22px] font-extrabold text-[#0f172a]">
            Human-in-the-Loop Repair Cockpit
          </h2>
        </div>
        <p className="text-[14px] text-[#64748b]">
          {bank.name} — Governance Agent requires human approval — value exceeds $500M autonomous threshold
        </p>
      </motion.div>

      {/* Countdown / Approved banner */}
      <AnimatePresence mode="wait">
        {!isApproved ? (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass p-5 border border-[#d97706]/30 glow-amber emergency-bg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.span
                  className="text-[32px]"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ⏱
                </motion.span>
                <div>
                  <div className="text-[16px] font-bold text-[#d97706]">
                    FX Settlement Window Closing
                  </div>
                  <div className="text-[14px] text-[#64748b] mt-0.5">
                    Payments must clear before deadline to avoid regulatory reporting trigger
                  </div>
                </div>
              </div>
              <div className="text-right">
                <motion.div
                  key={countdown}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`text-[48px] font-extrabold tabular-nums font-mono leading-none ${
                    minutes < 10 ? 'text-[#dc2626]' : 'text-[#d97706]'
                  }`}
                >
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </motion.div>
                <div className="text-[13px] text-[#64748b] mt-1">minutes remaining</div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="approved"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-5 border border-[#0d9488]/30 glow-teal"
          >
            <div className="flex items-center justify-center gap-4">
              <motion.span
                className="text-[32px]"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                ✅
              </motion.span>
              <div className="text-center">
                <div className="text-[18px] font-bold text-[#0d9488]">
                  Remediation Approved & Executing
                </div>
                <div className="text-[14px] text-[#64748b] mt-1">
                  Recovery agents processing {scoreboard.paymentsStuck} payments via backup sanctions cluster
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incident context bar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="glass p-4 border-l-4 border-[#dc2626]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[13px] text-[#64748b]">Value at Risk</span>
              <p className="text-[20px] font-bold text-[#dc2626]">${scoreboard.valueAtRisk}M</p>
            </div>
            <div>
              <span className="text-[13px] text-[#64748b]">Payments Stuck</span>
              <p className="text-[20px] font-bold text-[#d97706]">{scoreboard.paymentsStuck}</p>
            </div>
            <div>
              <span className="text-[13px] text-[#64748b]">Corridors Affected</span>
              <p className="text-[20px] font-bold text-[#d97706]">3</p>
            </div>
            <div>
              <span className="text-[13px] text-[#64748b]">Clients Impacted</span>
              <p className="text-[20px] font-bold text-[#0f172a]">{bank.clients.length}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[13px] text-[#64748b]">Incident</span>
            <p className="text-[16px] font-bold text-[#0f172a]">{scenario.title}</p>
          </div>
        </div>
      </motion.div>

      {/* Remediation options grid — 3 cards with staggered entrance */}
      <div className="grid grid-cols-3 gap-5">
        {scenario.remediationOptions.map((option, index) => (
          <RemediationCard
            key={option.id}
            option={option}
            isSelected={selectedOption === option.id}
            onSelect={() => setSelectedOption(option.id)}
            index={index}
          />
        ))}
      </div>

      {/* Approve CTA with pulsing glow */}
      {!isApproved && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center pt-2"
        >
          <motion.button
            onClick={handleApprove}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-14 py-5 rounded-2xl bg-[#0d9488]/10 text-[#0d9488] font-extrabold text-[20px] border-2 border-[#0d9488]/50 hover:bg-[#0d9488]/20 hover:border-[#0d9488]/70 transition-all hitl-pulse-btn"
          >
            APPROVE {selectedLabel.toUpperCase()} — EXECUTE NOW
          </motion.button>
        </motion.div>
      )}

      {/* Post-approval execution progress */}
      <AnimatePresence>
        {isApproved && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass p-6 border border-[#0d9488]/20"
          >
            <h3 className="text-[13px] font-bold text-[#0d9488] uppercase tracking-wider mb-4">
              Recovery Execution Progress
            </h3>
            <div className="space-y-4">
              {(selectedRemediation?.steps ?? []).map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.5 }}
                  className="flex items-center gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.5, type: 'spring', stiffness: 300 }}
                    className="w-8 h-8 rounded-full bg-[#0d9488]/10 border border-[#0d9488]/40 flex items-center justify-center shrink-0"
                  >
                    <span className="text-[#0d9488] text-[16px] font-bold">✓</span>
                  </motion.div>
                  <span className="text-[16px] text-[#0f172a]">{step}</span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 + i * 0.5 }}
                    className="text-[13px] font-mono text-[#0d9488]/60 ml-auto shrink-0"
                  >
                    {(0.3 + i * 0.4).toFixed(1)}s
                  </motion.span>
                </motion.div>
              ))}
            </div>

            {/* Navigate to recovery */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + (selectedRemediation?.steps.length ?? 0) * 0.5 + 0.5 }}
              className="mt-6 text-center"
            >
              <Link
                href="/recovery"
                className="inline-block px-8 py-3 rounded-xl bg-[#0d9488]/10 text-[#0d9488] font-bold text-[16px] border border-[#0d9488]/40 hover:bg-[#0d9488]/20 transition-all"
              >
                View Recovery & Audit Trail →
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
