'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/store'
import { CorridorMap } from '@/components/command-center/corridor-map'
import { HealthGauges } from '@/components/command-center/health-gauges'
import { StressedServices } from '@/components/command-center/stressed-services'

export default function CommandCenterPage() {
  const { state, startWorkflow, dispatch } = useApp()
  const { bank, scenario, workflow } = state
  const isActive = workflow.current_step >= 0
  const isResolved = workflow.current_step >= 8
  const isPreIncident = workflow.incidentPhase === 'pre-incident'

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 relative z-10"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-extrabold text-[#0f172a]">Executive Command Center</h2>
          <p className="text-[14px] text-[#64748b] mt-0.5">{bank.name} — Real-time payments resilience</p>
        </div>
        {!isActive && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { startWorkflow(); dispatch({ type: 'SET_AUTOPLAY', enabled: true }) }}
            className="px-6 py-3 rounded-xl bg-[#0d9488]/10 text-[#0d9488] font-bold text-[16px] border border-[#0d9488]/40 hover:bg-[#0d9488]/20 transition-all glow-teal"
          >
            ▶ Launch AI Response
          </motion.button>
        )}
      </div>

      {/* Pre-incident ambient state */}
      <AnimatePresence mode="wait">
        {isPreIncident && (
          <motion.div
            key="ambient"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="glass p-4 border border-[#0d9488]/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-[#0d9488] ambient-breathe" />
              <div className="flex-1">
                <span className="text-[16px] font-bold text-[#0d9488]">
                  All Systems Nominal
                </span>
                <p className="text-[14px] text-[#64748b] mt-0.5">
                  AI Resilience Score: <span className="text-[#0d9488] font-bold ambient-breathe">98/100</span> —
                  {' '}{bank.primaryCorridors.length} corridors healthy · STP rate {state.scoreboard.stpRateRestored}% · No active alerts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#64748b]">Last scan:</span>
                <span className="text-[13px] font-mono text-[#0d9488]">12s ago</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Active Incident Banner */}
        {isActive && !isResolved && (
          <motion.div
            key="incident"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="glass p-4 border-l-4 border-[#dc2626] emergency-bg"
          >
            <div className="flex items-center gap-3">
              <motion.span
                className="text-[22px]"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ⚡
              </motion.span>
              <div>
                <span className="text-[16px] font-bold text-[#dc2626]">
                  Active Incident: {scenario.title}
                </span>
                <p className="text-[14px] text-[#64748b] mt-0.5">
                  ${state.scoreboard.valueAtRisk}M at risk · {state.scoreboard.paymentsStuck} payments queuing · FX window closes in {state.scoreboard.slaBreach} min
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Resolved banner */}
        {isResolved && (
          <motion.div
            key="resolved"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="glass p-4 border-l-4 border-[#0d9488] glow-teal"
          >
            <div className="flex items-center gap-3">
              <span className="text-[22px]">✅</span>
              <div>
                <span className="text-[16px] font-bold text-[#0d9488]">
                  Incident Resolved — All Systems Recovering
                </span>
                <p className="text-[14px] text-[#64748b] mt-0.5">
                  {state.scoreboard.recoveredVolume} payments recovered · ${state.scoreboard.valueAtRisk}M residual risk · STP rate {state.scoreboard.stpRateRestored}%
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main grid: 60% map / 40% right panel */}
      <div className="grid grid-cols-5 gap-5" style={{ minHeight: '440px' }}>
        <div className="col-span-3">
          <CorridorMap />
        </div>
        <div className="col-span-2 flex flex-col gap-4">
          <HealthGauges />
          <StressedServices />
        </div>
      </div>

      {/* Quick facts */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Platform', value: bank.platformName },
          { label: 'Legacy System', value: bank.cobolSystemAlias },
          { label: 'Primary BIC', value: bank.bicFamily[0] },
          { label: 'Risk Posture', value: bank.riskPosture },
        ].map((item) => (
          <div key={item.label} className="glass p-4">
            <span className="text-[13px] text-[#64748b] font-medium">{item.label}</span>
            <p className="text-[16px] font-bold text-[#0f172a] mt-1 truncate">{item.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
