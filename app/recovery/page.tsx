'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/store'
import { AnimatedCounter } from '@/components/shared/animated-counter'
import { showToast } from '@/components/shared/toast'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

// Simulated timeline data: payments recovered over the 7-minute window
const recoveryTimeline = [
  { time: '0:00', stuck: 142, recovered: 0, stp: 72 },
  { time: '0:30', stuck: 142, recovered: 0, stp: 72 },
  { time: '1:00', stuck: 128, recovered: 14, stp: 78 },
  { time: '1:30', stuck: 108, recovered: 34, stp: 82 },
  { time: '2:00', stuck: 82, recovered: 60, stp: 86 },
  { time: '2:30', stuck: 54, recovered: 88, stp: 90 },
  { time: '3:00', stuck: 31, recovered: 111, stp: 93 },
  { time: '3:30', stuck: 18, recovered: 124, stp: 95 },
  { time: '4:00', stuck: 9, recovered: 133, stp: 97 },
  { time: '4:30', stuck: 5, recovered: 137, stp: 98 },
  { time: '5:00', stuck: 3, recovered: 139, stp: 99 },
  { time: '5:30', stuck: 3, recovered: 139, stp: 99 },
  { time: '6:00', stuck: 3, recovered: 139, stp: 99 },
  { time: '7:00', stuck: 3, recovered: 139, stp: 99.2 },
]

// Simulated latency data
const latencyTimeline = [
  { time: '14:23', sanctions: 14200, legacy: 3800, fx: 180 },
  { time: '14:24', sanctions: 12800, legacy: 4200, fx: 220 },
  { time: '14:25', sanctions: 11500, legacy: 3500, fx: 195 },
  { time: '14:26', sanctions: 8200, legacy: 2800, fx: 180 },
  { time: '14:27', sanctions: 4500, legacy: 1200, fx: 170 },
  { time: '14:28', sanctions: 1200, legacy: 450, fx: 160 },
  { time: '14:29', sanctions: 320, legacy: 180, fx: 150 },
  { time: '14:30', sanctions: 82, legacy: 95, fx: 140 },
]

// CSS-only confetti particles
const CONFETTI_COLORS = ['#0d9488', '#2563eb', '#d97706', '#a855f7', '#0d9488']

function ConfettiBurst() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 1.5,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
  }))

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  )
}

function BigNumberCard({
  label,
  before,
  after,
  prefix,
  suffix,
  invertColor,
  delay,
}: {
  label: string
  before: number
  after: number
  prefix?: string
  suffix?: string
  invertColor?: boolean
  delay?: number
}) {
  const improved = invertColor ? after > before : after < before
  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ delay: delay ?? 0.2, duration: 0.5, ease: 'easeOut' }}
      className="glass p-5 text-center"
      style={{ perspective: '600px' }}
    >
      <span className="text-[13px] text-[#64748b] font-medium uppercase tracking-wider">{label}</span>
      <div className="flex items-center justify-center gap-3 mt-3">
        <span className="text-[24px] font-bold text-[#dc2626]/50 line-through tabular-nums font-mono">
          {prefix}{before}{suffix}
        </span>
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: (delay ?? 0.2) + 0.3, type: 'spring' }}
          className="text-[20px] text-[#0d9488]"
        >
          →
        </motion.span>
        <AnimatedCounter
          value={after}
          prefix={prefix || ''}
          suffix={suffix || ''}
          decimals={suffix === '%' ? 1 : 0}
          className={`text-[32px] font-extrabold tabular-nums font-mono ${improved ? 'text-[#0d9488]' : 'text-[#dc2626]'}`}
        />
      </div>
      {improved && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: (delay ?? 0.2) + 0.5 }}
          className="mt-2 text-[13px] text-[#0d9488] font-medium"
        >
          {invertColor
            ? `+${((after / Math.max(before, 1) - 1) * 100).toFixed(0)}% improvement`
            : `-${((1 - after / Math.max(before, 1)) * 100).toFixed(0)}% reduction`}
        </motion.div>
      )}
    </motion.div>
  )
}

export default function RecoveryPage() {
  const { state } = useApp()
  const { scenario, workflow, bank, scoreboard } = state
  const isResolved = workflow.current_step >= 8
  const initial = scenario.initialMetrics
  // Use live scoreboard values when resolved, fall back to finalMetrics
  const final = isResolved ? scoreboard : scenario.finalMetrics
  const auditEntries = workflow.auditLog ?? []

  // Track first time we see resolved state for flash + confetti
  const [showFlash, setShowFlash] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const hasFlashed = useRef(false)

  useEffect(() => {
    if (isResolved && !hasFlashed.current) {
      hasFlashed.current = true
      setShowFlash(true)
      setShowConfetti(true)
      showToast('Incident resolved — all payments recovered', 'success')
      setTimeout(() => setShowFlash(false), 1200)
      setTimeout(() => setShowConfetti(false), 3500)
    }
  }, [isResolved])

  return (
    <motion.div {...fade} transition={{ duration: 0.3 }} className="space-y-5 relative z-10">
      {/* Resolution teal flash */}
      {showFlash && <div className="resolution-flash" />}

      {/* Confetti burst */}
      {showConfetti && <ConfettiBurst />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-extrabold text-[#0f172a]">Recovery & Audit Trail</h2>
          <p className="text-[14px] text-[#64748b] mt-0.5">{bank.name} — Business outcome summary</p>
        </div>
        {isResolved && (
          <motion.span
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
            className="px-5 py-2 rounded-xl bg-[#0d9488]/10 text-[#0d9488] text-[16px] font-bold border border-[#0d9488]/40 glow-teal"
          >
            ✓ Incident Resolved
          </motion.span>
        )}
      </div>

      {/* Before/After cards with flip animation */}
      <div className="grid grid-cols-4 gap-4">
        <BigNumberCard label="Value at Risk" before={initial.valueAtRisk} after={final.valueAtRisk} prefix="$" suffix="M" delay={0.1} />
        <BigNumberCard label="Payments Stuck" before={initial.paymentsStuck} after={final.paymentsStuck} delay={0.2} />
        <BigNumberCard label="MTTR" before={initial.mttrBefore} after={final.mttrAfter} suffix=" min" delay={0.3} />
        <BigNumberCard label="STP Rate" before={initial.stpRateRestored} after={final.stpRateRestored} suffix="%" invertColor delay={0.4} />
      </div>

      {/* Business value big numbers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass p-6 border border-[#0d9488]/20"
      >
        <h3 className="text-[13px] font-bold text-[#0d9488] uppercase tracking-wider mb-4">
          Business Value Delivered
        </h3>
        <div className="grid grid-cols-4 gap-6 text-center">
          <div>
            <AnimatedCounter value={final.recoveredVolume} className="text-[40px] font-extrabold text-[#0d9488] tabular-nums" />
            <p className="text-[14px] text-[#64748b] mt-1">Payments Recovered</p>
          </div>
          <div>
            <AnimatedCounter value={initial.valueAtRisk - final.valueAtRisk} prefix="$" suffix="M" className="text-[40px] font-extrabold text-[#0d9488] tabular-nums" />
            <p className="text-[14px] text-[#64748b] mt-1">Value Protected</p>
          </div>
          <div>
            <AnimatedCounter value={final.investigationsAvoided} className="text-[40px] font-extrabold text-[#0d9488] tabular-nums" />
            <p className="text-[14px] text-[#64748b] mt-1">Investigations Avoided</p>
          </div>
          <div>
            <AnimatedCounter value={final.opsHoursSaved} suffix="h" className="text-[40px] font-extrabold text-[#0d9488] tabular-nums" />
            <p className="text-[14px] text-[#64748b] mt-1">Ops Hours Saved</p>
          </div>
        </div>
      </motion.div>

      {/* MTTR highlight banner */}
      <div className="glass p-6 border border-[#0d9488]/10">
        <div className="flex items-center gap-6">
          <div className="shrink-0 text-center">
            <div className="text-[56px] font-extrabold text-[#0d9488] leading-none">
              {initial.mttrBefore > 0 ? Math.round((1 - final.mttrAfter / initial.mttrBefore) * 100) : 0}%
            </div>
            <div className="text-[13px] text-[#64748b] mt-2">MTTR Reduction</div>
          </div>
          <div className="flex-1">
            <p className="text-[16px] text-[#0f172a] leading-relaxed">
              Mean Time to Resolution reduced from{' '}
              <strong className="text-[#dc2626]">{initial.mttrBefore} minutes</strong> (manual triage across 3 operations teams)
              to <strong className="text-[#0d9488]">{final.mttrAfter} minutes</strong> (AI-orchestrated detection, analysis, and
              recovery). The FX settlement window was met with{' '}
              <strong className="text-[#0d9488]">{final.slaBreach} minutes to spare</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-5">
        {/* Recovery curve */}
        <div className="glass p-5">
          <h4 className="text-[16px] font-bold text-[#0f172a] mb-4">Payment Recovery Curve</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={recoveryTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                labelStyle={{ color: '#0f172a' }}
              />
              <Area type="monotone" dataKey="recovered" stroke="#0d9488" fill="#0d9488" fillOpacity={0.15} strokeWidth={2} name="Recovered" />
              <Area type="monotone" dataKey="stuck" stroke="#dc2626" fill="#dc2626" fillOpacity={0.1} strokeWidth={2} name="Stuck" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Latency normalization */}
        <div className="glass p-5">
          <h4 className="text-[16px] font-bold text-[#0f172a] mb-4">Service Latency Normalization</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={latencyTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                labelStyle={{ color: '#0f172a' }}
                formatter={(value) => [`${value}ms`]}
              />
              <Line type="monotone" dataKey="sanctions" stroke="#dc2626" strokeWidth={2} dot={false} name="Sanctions" />
              <Line type="monotone" dataKey="legacy" stroke="#d97706" strokeWidth={2} dot={false} name="Legacy Hub" />
              <Line type="monotone" dataKey="fx" stroke="#0d9488" strokeWidth={2} dot={false} name="FX" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Audit trail */}
      <div className="glass p-5">
        <h3 className="text-[16px] font-bold text-[#0f172a] mb-4">Compliance Audit Trail</h3>
        <div className="space-y-3">
          {scenario.timeline.map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-4 text-[14px]"
            >
              <span className="font-mono text-[#64748b] shrink-0 w-20 tabular-nums">
                {event.timestamp}
              </span>
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                event.severity === 'critical' ? 'bg-[#dc2626]' :
                event.severity === 'warning' ? 'bg-[#d97706]' : 'bg-[#0d9488]'
              }`} />
              <span className="text-[#64748b] w-32 shrink-0 font-medium">{event.source}</span>
              <span className="text-[#0f172a] flex-1">{event.event}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Engine audit log (from workflow engine) */}
      {auditEntries.length > 0 && (
        <div className="glass p-5">
          <h3 className="text-[16px] font-bold text-[#0f172a] mb-4">Action Audit Log</h3>
          <div className="space-y-2">
            {auditEntries.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 text-[14px] py-2 border-b border-[#e2e8f0] last:border-0"
              >
                <span className="font-mono text-[#64748b] shrink-0 w-20 tabular-nums text-[13px]">
                  {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span className="text-[#0d9488] font-semibold w-40 shrink-0 truncate">{entry.agent}</span>
                <span className="text-[#0f172a] flex-1">{entry.action}</span>
                <span className="text-[#64748b] shrink-0 max-w-[280px] truncate">{entry.outcome}</span>
                {entry.approver && (
                  <span className="text-[#d97706] shrink-0 text-[13px] font-medium">{entry.approver}</span>
                )}
              </motion.div>
            ))}
          </div>
          <p className="text-[13px] text-[#64748b] mt-4 italic">
            Audit trail will be available to your examiners via your GRC platform.
          </p>
        </div>
      )}

      {/* Regulatory note */}
      <div className="glass p-5 border border-[#e2e8f0]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[20px]">📋</span>
          <span className="text-[13px] uppercase tracking-wider text-[#64748b] font-semibold">
            Regulatory Compliance Note
          </span>
        </div>
        <p className="text-[14px] text-[#64748b] leading-relaxed">
          All 9 agent decisions fully logged with evidence chains. HITL governance gate
          triggered per CPMI-IOSCO threshold policy. Human operator approval recorded at 14:28:30 UTC.
          Full audit trail available for supervisory review. No sanctions screening bypass occurred —
          all payments cleared through backup compliance cluster with identical screening rules.
        </p>
      </div>
    </motion.div>
  )
}
