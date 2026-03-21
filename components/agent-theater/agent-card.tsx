'use client'

import { useEffect, useState } from 'react'
import { AgentCard as AgentCardType } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  agent: AgentCardType
}

function useTypewriter(text: string, enabled: boolean, speed = 30) {
  const [display, setDisplay] = useState('')
  useEffect(() => {
    if (!enabled) { setDisplay(text); return }
    setDisplay('')
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplay(text.slice(0, i))
      if (i >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text, enabled, speed])
  return display
}

// Thinking dots shown briefly before typewriter starts
function ThinkingDots() {
  return (
    <div className="thinking-dots flex items-center gap-1.5 py-2">
      <span className="w-2 h-2 rounded-full bg-[#0d9488]" />
      <span className="w-2 h-2 rounded-full bg-[#0d9488]" />
      <span className="w-2 h-2 rounded-full bg-[#0d9488]" />
      <span className="text-[14px] text-[#64748b] ml-2 font-medium">Analyzing...</span>
    </div>
  )
}

function ConfidenceBar({ score, animate }: { score: number; animate: boolean }) {
  const color = score >= 90 ? '#0d9488' : score >= 80 ? '#d97706' : '#dc2626'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-[#f1f5f9] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: animate ? 0 : `${score}%` }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <motion.span
        initial={animate ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: animate ? 0.6 : 0, duration: 0.3, type: 'spring' }}
        className="text-[20px] font-bold tabular-nums min-w-[48px] text-right"
        style={{ color }}
      >
        {score}%
      </motion.span>
    </div>
  )
}

export function AgentCard({ agent }: Props) {
  const isActive = agent.status === 'active'
  const isCompleted = agent.status === 'completed'
  const isPending = agent.status === 'pending'

  // Show thinking dots for 600ms before typewriter starts
  const [showThinking, setShowThinking] = useState(false)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isActive) {
      setShowThinking(true)
      setShowContent(false)
      const timer = setTimeout(() => {
        setShowThinking(false)
        setShowContent(true)
      }, 600)
      return () => clearTimeout(timer)
    }
    if (isCompleted) {
      setShowThinking(false)
      setShowContent(true)
    }
    if (isPending) {
      setShowThinking(false)
      setShowContent(false)
    }
  }, [isActive, isCompleted, isPending])

  const finding = useTypewriter(agent.finding_summary, isActive && showContent)

  const barColor = isActive ? '#d97706' : isCompleted ? '#0d9488' : '#e2e8f0'

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: isPending ? 0.3 : 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`glass flex overflow-hidden transition-shadow duration-300 ${
        isActive ? 'agent-active' : ''
      }`}
      style={{ minHeight: '120px' }}
    >
      {/* Left accent bar */}
      <motion.div
        className="w-1.5 shrink-0 rounded-l-xl"
        animate={{ background: barColor }}
        transition={{ duration: 0.3 }}
      />

      <div className="flex-1 p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <motion.span
              className="text-[22px]"
              animate={isActive ? { rotate: [0, -10, 10, 0] } : { rotate: 0 }}
              transition={isActive ? { duration: 0.5, delay: 0.1 } : {}}
            >
              {isCompleted ? '✓' : agent.agent_icon}
            </motion.span>
            <span
              className="text-[18px] font-bold font-mono tracking-wide"
              style={{ color: isActive || isCompleted ? '#0d9488' : '#64748b' }}
            >
              {agent.agent_name}
            </span>
            <span className="text-[13px] font-mono text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded">
              Step {agent.step_number}/9
            </span>
          </div>
          <AnimatePresence>
            {agent.handoff_target && isCompleted && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-[14px] text-[#0d9488]/70 font-medium"
              >
                → {agent.handoff_target}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Input line */}
        <p className="text-[14px] text-[#64748b] mb-2">
          Ingested: {agent.input_summary}
        </p>

        {/* Thinking dots animation */}
        <AnimatePresence>
          {isActive && showThinking && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ThinkingDots />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finding — typewriter on active, instant on completed */}
        {(showContent || isCompleted) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mb-3"
          >
            <p className={`text-[16px] text-[#0f172a] font-medium leading-relaxed ${
              isActive && showContent ? 'typewriter-cursor inline' : ''
            }`}>
              {isActive && showContent ? finding : agent.finding_summary}
            </p>
          </motion.div>
        )}

        {/* Confidence bar — delayed sequential reveal */}
        {(showContent || isCompleted) && (
          <motion.div
            initial={isActive ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isActive ? 0.3 : 0, duration: 0.3 }}
            className="mb-3"
          >
            <ConfidenceBar score={agent.confidence_score} animate={isActive} />
          </motion.div>
        )}

        {/* Business signal — staggered entrance */}
        {(showContent || isCompleted) && agent.businessSignal && (
          <motion.div
            initial={isActive ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: isActive ? 0.5 : 0, duration: 0.3 }}
            className="mb-3 flex items-center gap-2"
          >
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#d97706]">Signal</span>
            <span className="text-[14px] text-[#0f172a]/80">{agent.businessSignal}</span>
          </motion.div>
        )}

        {/* Evidence refs + duration — staggered entrance */}
        {(showContent || isCompleted) && (
          <motion.div
            initial={isActive ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: isActive ? 0.7 : 0, duration: 0.3 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {agent.evidence_refs.slice(0, 4).map((ref, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-[#f1f5f9] text-[12px] font-mono text-[#64748b] border border-[#e2e8f0]">
                  {ref}
                </span>
              ))}
            </div>
            <span className="text-[13px] font-mono text-[#64748b] shrink-0 ml-3">
              {agent.duration_ms < 1000 ? `${agent.duration_ms}ms` : `${(agent.duration_ms / 1000).toFixed(1)}s`}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
