'use client'

import { useApp } from '@/lib/store'
import { motion } from 'framer-motion'

const stepIcons = ['🛡️', '🔗', '📊', '👥', '💰', '🔧', '⚖️', '🚀', '✅']
const stepLabels = [
  'Detect', 'Correlate', 'Cluster', 'Cohort',
  'Impact', 'Repair', 'Governance', 'Execute', 'Verify',
]

export function WorkflowProgress() {
  const { state } = useApp()
  const { workflow } = state

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Agent Workflow</h3>
        <span className="text-[10px] text-text-secondary font-mono">
          Step {Math.max(workflow.current_step + 1, 0)}/{workflow.steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="h-1 bg-surface-light rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal to-teal-light rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${((workflow.current_step + 1) / workflow.steps.length) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {workflow.steps.map((step, i) => {
          const isCompleted = step.status === 'completed'
          const isActive = step.status === 'active'
          const isPending = step.status === 'pending'

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                  isCompleted
                    ? 'bg-teal/20 border border-teal/40'
                    : isActive
                      ? 'bg-teal/30 border-2 border-teal agent-active'
                      : 'bg-surface-light border border-white/10'
                }`}
              >
                {isCompleted ? '✓' : stepIcons[i]}
              </div>
              <span
                className={`text-[9px] font-medium ${
                  isCompleted ? 'text-teal' : isActive ? 'text-teal' : 'text-text-secondary'
                }`}
              >
                {stepLabels[i]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Current agent card */}
      {workflow.current_step >= 0 && (
        <motion.div
          key={workflow.current_step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-surface-light/50 rounded-lg border border-teal/10"
        >
          <div className="flex items-center gap-2 mb-1">
            <span>{workflow.steps[workflow.current_step].agent_icon}</span>
            <span className="text-xs font-semibold text-teal">
              {workflow.steps[workflow.current_step].agent_name}
            </span>
            <span className="ml-auto text-[10px] text-text-secondary font-mono">
              {workflow.steps[workflow.current_step].confidence_score}%
            </span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            {workflow.steps[workflow.current_step].finding_summary.slice(0, 150)}...
          </p>
        </motion.div>
      )}
    </div>
  )
}
