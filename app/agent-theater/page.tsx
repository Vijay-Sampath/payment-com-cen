'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useApp } from '@/lib/store'
import { AgentCard } from '@/components/agent-theater/agent-card'

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

const stepLabels = ['Detect', 'Correlate', 'Log Intel', 'Impact', 'Topology', 'Repair', 'Govern', 'Execute', 'Verify']

export default function AgentTheaterPage() {
  const { state, startWorkflow, advanceStep, dispatch } = useApp()
  const { workflow, bank, scoreboard } = state
  const running = workflow.current_step >= 0

  return (
    <motion.div {...fade} transition={{ duration: 0.3 }} className="space-y-5 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-extrabold text-[#0f172a]">Agent Orchestration Theater</h2>
          <p className="text-[14px] text-[#64748b] mt-0.5">9-step deterministic workflow — {bank.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {!running && (
            <button
              onClick={() => { startWorkflow(); dispatch({ type: 'SET_AUTOPLAY', enabled: true }) }}
              className="px-5 py-2.5 rounded-xl bg-[#0d9488]/10 text-[#0d9488] font-bold text-[16px] border border-[#0d9488]/40 hover:bg-[#0d9488]/20 transition-all glow-teal"
            >
              ▶ Start Workflow
            </button>
          )}
          {running && (
            <button
              onClick={advanceStep}
              disabled={workflow.current_step >= workflow.steps.length - 1}
              className="px-5 py-2.5 rounded-xl bg-[#f1f5f9] text-[#64748b] font-bold text-[16px] border border-[#e2e8f0] hover:text-[#0f172a] disabled:opacity-30 transition-all"
            >
              ⏭ Next
            </button>
          )}
        </div>
      </div>

      {/* Step indicator dots */}
      <div className="glass p-4">
        <div className="flex items-center justify-between">
          {workflow.steps.map((step, i) => {
            const done = step.status === 'completed'
            const active = step.status === 'active'
            return (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold transition-all ${
                      done ? 'bg-[#0d9488]/15 text-[#0d9488] border border-[#0d9488]/40'
                      : active ? 'bg-[#0d9488]/20 text-[#0d9488] border-2 border-[#0d9488] agent-active'
                      : 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[11px] mt-1 font-semibold ${
                    done || active ? 'text-[#0d9488]' : 'text-[#64748b]/50'
                  }`}>
                    {stepLabels[i]}
                  </span>
                </div>
                {i < workflow.steps.length - 1 && (
                  <div className={`w-10 h-0.5 mx-1 ${done ? 'bg-[#0d9488]/40' : 'bg-[#e2e8f0]'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Agent cards — vertical timeline */}
      <div className="space-y-3">
        {workflow.steps.map((step) => (
          <AgentCard key={`${step.step_id}-${step.status}`} agent={step} />
        ))}
      </div>

      {/* Business impact running total (shows after Impact Agent) */}
      {workflow.current_step >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5 border border-[#0d9488]/20">
          <h4 className="text-[13px] text-[#0d9488] font-bold uppercase tracking-wider mb-3">Business Impact — Running Total</h4>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <span className="text-[32px] font-extrabold text-[#dc2626]">${scoreboard.valueAtRisk}M</span>
              <p className="text-[13px] text-[#64748b]">Value at Risk</p>
            </div>
            <div>
              <span className="text-[32px] font-extrabold text-[#d97706]">{scoreboard.paymentsStuck}</span>
              <p className="text-[13px] text-[#64748b]">Payments Stuck</p>
            </div>
            <div>
              <span className="text-[32px] font-extrabold text-[#d97706]">{scoreboard.slaBreach}m</span>
              <p className="text-[13px] text-[#64748b]">Until FX Close</p>
            </div>
            <div>
              <span className="text-[32px] font-extrabold text-[#0d9488]">{scoreboard.investigationsAvoided}</span>
              <p className="text-[13px] text-[#64748b]">Investigations Avoided</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* HITL Gate alert */}
      {workflow.requires_hitl && !workflow.hitl_approved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-6 border-2 border-[#d97706]/40 glow-amber text-center emergency-bg"
        >
          <span className="text-[36px]">⚖️</span>
          <h3 className="text-[20px] font-bold text-[#d97706] mt-2">Human Approval Required</h3>
          <p className="text-[16px] text-[#64748b] mt-2 mb-4">
            Value exceeds autonomous threshold ($500M). Navigate to HITL Cockpit.
          </p>
          <Link
            href="/hitl-cockpit"
            className="inline-block px-8 py-3 rounded-xl bg-[#d97706]/10 text-[#d97706] font-bold text-[18px] border border-[#d97706]/40 hover:bg-[#d97706]/20 transition-all"
          >
            Open HITL Cockpit →
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}
