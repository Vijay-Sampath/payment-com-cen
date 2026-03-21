'use client'

import { useApp } from '@/lib/store'
import { motion } from 'framer-motion'

export function IncidentSummary() {
  const { state, startWorkflow, dispatch } = useApp()
  const { scenario, workflow, bank } = state
  const isActive = workflow.current_step >= 0
  const isResolved = workflow.current_step >= 8

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Active Incident</h3>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isResolved
              ? 'bg-teal/20 text-teal'
              : isActive
                ? 'bg-coral/20 text-coral status-pulse'
                : 'bg-amber/20 text-amber'
          }`}
        >
          {isResolved ? 'Resolved' : isActive ? 'Active' : 'Detected'}
        </span>
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <h4 className="text-base font-bold text-text-primary mb-1">{scenario.title}</h4>
          <p className="text-xs text-text-secondary leading-relaxed">{scenario.subtitle}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-coral text-sm">⚠</span>
            <span className="text-xs text-text-secondary">
              <strong className="text-coral">{scenario.initialMetrics.paymentsStuck}</strong> payments stuck across 3 corridors
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber text-sm">💰</span>
            <span className="text-xs text-text-secondary">
              <strong className="text-amber">${scenario.initialMetrics.valueAtRisk}M</strong> value at risk
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-coral text-sm">⏱</span>
            <span className="text-xs text-text-secondary">
              FX settlement window closes in <strong className="text-coral">{scenario.initialMetrics.slaBreach} min</strong>
            </span>
          </div>
        </div>

        {/* Affected clients */}
        <div>
          <span className="text-[10px] uppercase tracking-widest text-text-secondary font-medium">
            Affected Clients
          </span>
          <div className="mt-2 space-y-1.5">
            {bank.clients.map((client, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-light/50 rounded px-3 py-1.5">
                <span className="text-xs text-text-primary">{client.name}</span>
                <span className="text-[10px] text-text-secondary">{client.avgDailyVolume}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline preview */}
        <div>
          <span className="text-[10px] uppercase tracking-widest text-text-secondary font-medium">
            Timeline
          </span>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {scenario.timeline.slice(0, 6).map((event, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <span className="text-text-secondary font-mono shrink-0">{event.timestamp}</span>
                <span
                  className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${
                    event.severity === 'critical'
                      ? 'bg-coral'
                      : event.severity === 'warning'
                        ? 'bg-amber'
                        : 'bg-teal'
                  }`}
                />
                <span className="text-text-secondary truncate">{event.event}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action button */}
      {!isActive && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            startWorkflow()
            dispatch({ type: 'SET_AUTOPLAY', enabled: true })
          }}
          className="mt-4 w-full py-3 rounded-lg bg-teal/20 text-teal font-bold text-sm border border-teal/40 hover:bg-teal/30 transition-all glow-teal"
        >
          ▶ Launch AI Response
        </motion.button>
      )}
    </div>
  )
}
