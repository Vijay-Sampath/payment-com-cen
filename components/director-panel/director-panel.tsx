'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { BankId } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { showToast } from '@/components/shared/toast'

const banks: { id: BankId; label: string; name: string }[] = [
  { id: 'bofa', label: 'BOFA', name: 'Bank of America' },
  { id: 'citi', label: 'CITI', name: 'Citibank' },
  { id: 'jpmorgan', label: 'JPM', name: 'JPMorgan Chase' },
  { id: 'wellsfargo', label: 'WF', name: 'Wells Fargo' },
]

const stepNames = [
  'Sentinel Agent',
  'Correlator Agent',
  'Log Intelligence Agent',
  'Impact Agent',
  'Topology Agent',
  'Repair Planner Agent',
  'Governance Agent',
  'Execution Agent',
  'Verification Agent',
]

const stepShort = ['Detect', 'Correlate', 'Log Intel', 'Impact', 'Topology', 'Repair', 'Govern', 'Execute', 'Verify']

const presenterNotes: Record<number, string> = {
  0: 'Point out: no human paged yet. The AI found this before your ops team would have opened their laptop. Ask the COO: how long does your team take to get on a call at 11 PM?',
  1: 'Emphasize the root cause chain — sanctions latency → COBOL retry storm. This is the kind of cross-system correlation that takes manual teams hours.',
  2: 'Mention: 41% of alerts are retry noise. Traditional SOCs would chase these for hours before finding the real signal.',
  3: 'Business language: $847M across 142 payments, 3 corporate clients. Name the clients — they resonate with the audience.',
  4: 'The backup path exists. The AI found it. Manual teams might not even know Region B has a sanctions cluster.',
  5: 'Three options ranked by speed/risk/impact. The AI did the tradeoff analysis — the human just decides.',
  6: 'This is the key message for the CFO: $182M decision. One human. Informed by everything the AI found. Compliant by design. The bank\'s examiners see every step in the audit trail.',
  7: 'Recovery is executing. 47 payments per minute draining through backup. Show the scoreboard numbers moving.',
  8: 'Pause here. Let the green scoreboard sit. $182M protected, 11 minutes, one approval. Ask the room: what was your last P1 payments incident? How long did it take to resolve?',
}

// --- Collapsible Section ---
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left mb-2"
      >
        <span className="text-[11px] uppercase tracking-widest text-[#94a3b8] font-semibold">{title}</span>
        <span className="text-[11px] text-[#94a3b8]">{open ? '▾' : '▸'}</span>
      </button>
      {open && children}
    </div>
  )
}

// --- Pill Toggle ---
function PillToggle({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2 py-1.5 group">
      <div className={`w-8 h-4 rounded-full relative transition-colors ${active ? 'bg-[#00d4aa]/30' : 'bg-[#1e2d4a]'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${active ? 'left-4 bg-[#00d4aa]' : 'left-0.5 bg-[#94a3b8]/50'}`} />
      </div>
      <span className="text-[12px] text-[#94a3b8] group-hover:text-[#f1f5f9] transition-colors">{label}</span>
    </button>
  )
}

// --- Small Button ---
function SmallBtn({ children, onClick, variant = 'default' }: { children: React.ReactNode; onClick: () => void; variant?: 'default' | 'teal' | 'amber' | 'coral' }) {
  const base = 'px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all'
  const styles = {
    default: `${base} bg-[#162040] text-[#94a3b8] border border-[#1e2d4a] hover:border-[#00d4aa]/30 hover:text-[#f1f5f9]`,
    teal: `${base} bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/30 hover:bg-[#00d4aa]/20`,
    amber: `${base} bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 hover:bg-[#f59e0b]/20`,
    coral: `${base} bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/20`,
  }
  return <button onClick={onClick} className={styles[variant]}>{children}</button>
}

function csvEscape(value: string | number | undefined): string {
  if (value === undefined) return ''
  const text = String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function DirectorPanel() {
  const {
    state,
    switchBank,
    startWorkflow,
    advanceStep,
    approveHitl,
    resetWorkflow,
    jumpToStep,
    toggleDirector,
    dispatch,
    _playback: playback,
  } = useApp()

  const { director, workflow, scoreboard } = state
  const [staticMode, setStaticMode] = useState(true)
  const [notesOpen, setNotesOpen] = useState<number | null>(null)

  // Keyboard shortcut: Cmd+Shift+D / Ctrl+Shift+D
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        toggleDirector()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleDirector])

  const handleBankSwitch = (bankId: BankId) => {
    const bankName = banks.find((b) => b.id === bankId)?.name ?? bankId
    switchBank(bankId)
    showToast(`Bank switched to ${bankName} — data reloaded`, 'success')
  }

  const handleReset = () => {
    resetWorkflow()
    showToast('Demo reset to T+0 healthy state', 'info')
  }

  const handleForceRecovery = () => {
    // Jump to last step and complete
    dispatch({ type: 'COMPLETE_WORKFLOW' })
    showToast('Forced recovery success — incident resolved', 'success')
  }

  const handleHardReset = () => {
    resetWorkflow()
    showToast('Hard reset — complete state reset to T+0', 'warning')
  }

  const handleCopyDebugState = async () => {
    const debugState = {
      bank: state.bank.id,
      step: workflow.current_step,
      phase: workflow.incidentPhase,
      running: workflow.is_running,
      hitl: { required: workflow.requires_hitl, approved: workflow.hitl_approved },
      scoreboard,
      auditLogCount: workflow.auditLog?.length ?? 0,
      selectedRemediation: workflow.selectedRemediationOption,
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugState, null, 2))
      showToast('Debug state copied to clipboard', 'info')
    } catch {
      showToast('Clipboard blocked by browser permissions', 'warning')
    }
  }

  const handleExportAudit = () => {
    const entries = workflow.auditLog ?? []
    if (entries.length === 0) {
      showToast('No audit entries to export', 'warning')
      return
    }
    const header = 'timestamp,agent,action,outcome,approver,paymentCount,valueM'
    const rows = entries.map((e) => ([
      csvEscape(e.timestamp),
      csvEscape(e.agent),
      csvEscape(e.action),
      csvEscape(e.outcome),
      csvEscape(e.approver),
      csvEscape(e.paymentCount),
      csvEscape(e.valueM),
    ].join(',')))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${state.bank.id}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${entries.length} audit entries as CSV`, 'success')
  }

  const handleSkipToHitl = () => {
    jumpToStep(6)
    showToast('Skipped to Governance Gate — HITL required', 'warning')
  }

  const handlePrev = () => {
    if (workflow.current_step > 0) {
      jumpToStep(workflow.current_step - 1)
    }
  }

  const currentStepName = workflow.current_step >= 0 && workflow.current_step < stepNames.length
    ? stepNames[workflow.current_step]
    : 'Not started'

  return (
    <>
      {/* Emergency visual fallback: tiny teal dot in bottom-right */}
      {!director.isOpen && (
        <button
          onClick={toggleDirector}
          className="fixed bottom-3 right-3 w-[6px] h-[6px] rounded-full bg-[#00d4aa]/60 z-50 hover:w-3 hover:h-3 hover:bg-[#00d4aa] transition-all"
          title="Director Panel (Cmd+Shift+D)"
        />
      )}

      <AnimatePresence>
        {director.isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed right-0 top-0 w-[380px] z-50 border-l border-[#e2e8f0] overflow-y-auto"
            style={{
              background: 'rgba(10, 15, 30, 0.97)',
              backdropFilter: 'blur(20px)',
              height: '90vh',
              maxHeight: '90vh',
            }}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[13px] font-bold text-[#00d4aa] tracking-wider uppercase">
                    Director Panel
                  </h2>
                  <p className="text-[10px] text-[#94a3b8] mt-0.5">
                    Hidden from audience — Cmd+Shift+D
                  </p>
                </div>
                <button
                  onClick={toggleDirector}
                  className="text-[#94a3b8] hover:text-[#f1f5f9] text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Static fallback banner */}
              {staticMode && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20">
                  <span className="text-[11px] text-[#f59e0b] font-medium">
                    Running in static fallback mode — no API dependency
                  </span>
                </div>
              )}

              {/* ============ SECTION 1: Demo Configuration ============ */}
              <Section title="Demo Configuration">
                {/* Bank selector */}
                <div className="flex gap-1.5 mb-3">
                  {banks.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => handleBankSwitch(bank.id)}
                      className={`flex-1 px-2 py-2 rounded-md text-[12px] font-bold transition-all ${
                        state.bank.id === bank.id
                          ? 'bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/40'
                          : 'bg-[#162040] text-[#94a3b8] border border-[#1e2d4a] hover:border-[#00d4aa]/20'
                      }`}
                    >
                      {bank.label}
                    </button>
                  ))}
                </div>

                {/* Mode toggles */}
                <div className="space-y-1">
                  <PillToggle
                    label="Static Fallback"
                    active={staticMode}
                    onToggle={() => {
                      const next = !staticMode
                      setStaticMode(next)
                      showToast(next ? 'Static fallback mode active — no API required' : 'Live narration enabled — requires API key', next ? 'info' : 'warning')
                    }}
                  />
                  <PillToggle
                    label="Autoplay"
                    active={director.autoPlay}
                    onToggle={() => {
                      dispatch({ type: 'SET_AUTOPLAY', enabled: !director.autoPlay })
                    }}
                  />
                </div>
              </Section>

              {/* ============ SECTION 2: Playback Controls ============ */}
              <Section title="Playback Controls">
                {/* Main controls row */}
                <div className="flex gap-1.5 mb-3">
                  <SmallBtn onClick={handleReset}>⏮ Reset</SmallBtn>
                  <SmallBtn onClick={handlePrev}>⏪ Prev</SmallBtn>
                  <SmallBtn
                    variant="teal"
                    onClick={() => {
                      if (workflow.current_step === -1) {
                        startWorkflow()
                        dispatch({ type: 'SET_AUTOPLAY', enabled: true })
                      } else if (director.autoPlay) {
                        dispatch({ type: 'SET_AUTOPLAY', enabled: false })
                      } else {
                        dispatch({ type: 'SET_AUTOPLAY', enabled: true })
                      }
                    }}
                  >
                    {workflow.current_step === -1 ? '▶ Play' : director.autoPlay ? '⏸ Pause' : '▶ Play'}
                  </SmallBtn>
                  <SmallBtn onClick={() => { advanceStep() }}>⏩ Next</SmallBtn>
                  <SmallBtn variant="amber" onClick={handleSkipToHitl}>⏭ HITL</SmallBtn>
                </div>

                {/* Speed buttons */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">Speed</span>
                  {[0.5, 1, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        playback?.setSpeed(s)
                        dispatch({ type: 'SET_PLAYBACK_SPEED', speed: s })
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        director.playbackSpeed === s
                          ? 'bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30'
                          : 'bg-[#162040] text-[#94a3b8] border border-[#1e2d4a] hover:text-[#f1f5f9]'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Step jump grid */}
                <div className="flex gap-1 mb-2">
                  {stepShort.map((name, i) => {
                    const step = workflow.steps[i]
                    const status = step?.status ?? 'pending'
                    return (
                      <button
                        key={i}
                        onClick={() => jumpToStep(i)}
                        title={stepNames[i]}
                        className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${
                          status === 'completed' ? 'bg-[#00d4aa]/15 text-[#00d4aa]'
                          : status === 'active' ? 'bg-[#00d4aa]/25 text-[#00d4aa] border border-[#00d4aa]/40'
                          : 'bg-[#0a0f1e] text-[#94a3b8]/50 hover:text-[#94a3b8]'
                        }`}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>

                {/* Current step indicator */}
                <div className="px-3 py-2 rounded-md bg-[#0a0f1e] border border-[#1e2d4a]">
                  <span className="text-[11px] text-[#94a3b8]">
                    Step {workflow.current_step + 1} of 9 —{' '}
                    <span className="text-[#00d4aa] font-semibold">{currentStepName}</span>
                  </span>
                </div>

                {/* HITL Approve (contextual) */}
                {workflow.requires_hitl && !workflow.hitl_approved && (
                  <button
                    onClick={() => {
                      approveHitl()
                      setTimeout(advanceStep, 500)
                      showToast('HITL gate approved — resuming workflow', 'success')
                    }}
                    className="w-full mt-3 px-4 py-2.5 rounded-lg text-[12px] font-bold bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/40 hover:bg-[#f59e0b]/25 transition-all animate-pulse"
                  >
                    ⚖️ Approve HITL Gate
                  </button>
                )}
              </Section>

              {/* ============ SECTION 3: Incident Injection ============ */}
              <Section title="Incident Injection" defaultOpen={false}>
                <div className="grid grid-cols-2 gap-1.5">
                  <SmallBtn variant="coral" onClick={() => {
                    if (workflow.current_step === -1) { startWorkflow() }
                    showToast('Sanctions timeout injected — queue depth spiking', 'error')
                  }}>
                    🔴 Sanctions Timeout
                  </SmallBtn>
                  <SmallBtn variant="amber" onClick={() => {
                    dispatch({ type: 'UPDATE_SCOREBOARD', metrics: { paymentsStuck: 1247 } })
                    showToast('Queue depth spiked to 1,247', 'warning')
                  }}>
                    📈 Spike Queue
                  </SmallBtn>
                  <SmallBtn variant="amber" onClick={() => {
                    if (workflow.current_step < 2) { jumpToStep(2) }
                    showToast('Retry storm triggered — legacy adapter cycling', 'warning')
                  }}>
                    🔁 Retry Storm
                  </SmallBtn>
                  <SmallBtn variant="amber" onClick={() => {
                    dispatch({ type: 'UPDATE_SCOREBOARD', metrics: { slaBreach: 8 } })
                    showToast('SLA breach imminent — 8 minutes remaining', 'error')
                  }}>
                    ⚠ Force SLA Risk
                  </SmallBtn>
                  <SmallBtn variant="coral" onClick={() => {
                    startWorkflow()
                    dispatch({ type: 'SET_AUTOPLAY', enabled: true })
                    showToast('Full cascade triggered — autoplay started', 'error')
                  }}>
                    💥 Full Cascade
                  </SmallBtn>
                  <SmallBtn variant="teal" onClick={() => {
                    handleForceRecovery()
                  }}>
                    ✅ Force Recovery
                  </SmallBtn>
                </div>
              </Section>

              {/* ============ SECTION 4: Recovery Overrides ============ */}
              <Section title="Recovery Overrides" defaultOpen={false}>
                <div className="grid grid-cols-2 gap-1.5">
                  <SmallBtn variant="teal" onClick={handleForceRecovery}>
                    Force Recovery
                  </SmallBtn>
                  <SmallBtn variant="amber" onClick={handleHardReset}>
                    Hard Reset Demo
                  </SmallBtn>
                  <SmallBtn onClick={() => {
                    resetWorkflow()
                    showToast('All alerts cleared — state reset', 'info')
                  }}>
                    Clear All Alerts
                  </SmallBtn>
                  <SmallBtn onClick={() => {
                    showToast('Static narratives pre-loaded (always cached)', 'success')
                  }}>
                    Preload Cache
                  </SmallBtn>
                </div>
              </Section>

              {/* ============ SECTION 5: Presenter Notes ============ */}
              <Section title="Presenter Notes" defaultOpen={false}>
                <div className="space-y-1">
                  {Object.entries(presenterNotes).map(([stepIdx, note]) => {
                    const i = parseInt(stepIdx)
                    const isOpen = notesOpen === i
                    const isCurrentStep = workflow.current_step === i
                    return (
                      <div key={i}>
                        <button
                          onClick={() => setNotesOpen(isOpen ? null : i)}
                          className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded text-[11px] transition-all ${
                            isCurrentStep
                              ? 'bg-[#00d4aa]/10 text-[#00d4aa] font-semibold'
                              : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#162040]'
                          }`}
                        >
                          <span className="font-mono w-4 shrink-0">{i + 1}</span>
                          <span className="truncate">{stepShort[i]}</span>
                          <span className="ml-auto text-[10px]">{isOpen ? '▾' : '▸'}</span>
                        </button>
                        {isOpen && (
                          <div className="ml-6 mr-1 mt-1 mb-2 px-3 py-2 rounded bg-[#0a0f1e] border border-[#1e2d4a]">
                            <p className="text-[11px] text-[#94a3b8] leading-relaxed italic">
                              &ldquo;{note}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Section>

              {/* ============ SECTION 6: Reliability Controls ============ */}
              <Section title="Reliability Controls" defaultOpen={false}>
                {/* API status */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${staticMode ? 'bg-[#94a3b8]' : 'bg-[#00d4aa]'}`} />
                  <span className="text-[11px] text-[#94a3b8]">
                    {staticMode ? 'API: Not used (static mode)' : 'LLM: Connected'}
                  </span>
                </div>

                <div className="flex gap-1.5">
                  <SmallBtn onClick={handleCopyDebugState}>
                    Copy Debug State
                  </SmallBtn>
                  <SmallBtn onClick={handleExportAudit}>
                    Export Audit CSV
                  </SmallBtn>
                </div>

                {/* Compact state readout */}
                <div className="mt-3 p-2.5 bg-[#0a0f1e] rounded-md font-mono text-[10px] text-[#94a3b8] space-y-0.5 border border-[#1e2d4a]">
                  <div>bank: {state.bank.shortName} | step: {workflow.current_step + 1}/9</div>
                  <div>phase: {workflow.incidentPhase} | running: {String(workflow.is_running)}</div>
                  <div>hitl: {workflow.requires_hitl ? 'REQUIRED' : workflow.hitl_approved ? 'approved' : 'n/a'}</div>
                  <div>autoplay: {String(director.autoPlay)} | speed: {director.playbackSpeed}x</div>
                  <div>audit: {workflow.auditLog?.length ?? 0} entries</div>
                </div>
              </Section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
