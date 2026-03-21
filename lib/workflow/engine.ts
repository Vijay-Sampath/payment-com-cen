import {
  AgentCard,
  WorkflowState,
  WorkflowStepId,
  BankId,
  ScoreboardMetrics,
  IncidentPhase,
  AuditEntry,
} from '@/types'

// Step ordering for reference
const STEP_ORDER: WorkflowStepId[] = [
  'detect', 'correlate', 'cluster', 'impact', 'topology',
  'repair', 'governance', 'execute', 'verify',
]

// Initial scoreboard values (pre-incident baseline)
const INITIAL_SCOREBOARD: ScoreboardMetrics = {
  valueAtRisk: 0,
  paymentsStuck: 0,
  slaBreach: 43,
  investigationsAvoided: 0,
  opsHoursSaved: 0,
  mttrBefore: 90,
  mttrAfter: 90,
  recoveredVolume: 0,
  stpRateRestored: 71,
}

type EngineEvent = 'stepChange' | 'scoreboardUpdate' | 'incidentComplete' | 'hitlRequired'
type EventCallback = (data?: unknown) => void

export class WorkflowEngine {
  private state: WorkflowState
  private listeners: Map<EngineEvent, Set<EventCallback>> = new Map()
  private initialSteps: AgentCard[]

  constructor(scenarioId: string, bankId: BankId, steps: AgentCard[]) {
    this.initialSteps = steps.map((s) => ({ ...s }))
    this.state = {
      scenario_id: scenarioId,
      bank_id: bankId,
      current_step: -1,
      steps: steps.map((s) => ({ ...s, status: 'pending' as const })),
      started_at: new Date().toISOString(),
      is_running: false,
      requires_hitl: false,
      hitl_approved: false,
      incidentPhase: 'pre-incident',
      selectedRemediationOption: null,
      auditLog: [],
    }
  }

  // --- Core methods ---

  start(): void {
    this.state = {
      ...this.state,
      current_step: 0,
      is_running: true,
      started_at: new Date().toISOString(),
      incidentPhase: 'detecting',
      steps: this.state.steps.map((s, i) => ({
        ...s,
        status: i === 0 ? ('active' as const) : ('pending' as const),
      })),
    }
    this.appendAudit({
      agent: 'System',
      action: 'Workflow started',
      outcome: 'Incident detection initiated',
    })
    this.emit('stepChange', { step: 0 })
    this.emit('scoreboardUpdate', this.getScoreboard())
  }

  nextStep(): void {
    const next = this.state.current_step + 1
    if (next >= this.state.steps.length) {
      // Complete the workflow
      this.state = {
        ...this.state,
        is_running: false,
        completed_at: new Date().toISOString(),
        incidentPhase: 'resolved',
        steps: this.state.steps.map((s) => ({ ...s, status: 'completed' as const })),
      }
      this.appendAudit({
        agent: 'System',
        action: 'Workflow completed',
        outcome: 'Incident resolved',
      })
      this.emit('incidentComplete')
      this.emit('stepChange', { step: this.state.current_step })
      this.emit('scoreboardUpdate', this.getScoreboard())
      return
    }

    const updatedSteps = this.state.steps.map((step, i) => {
      if (i < next) return { ...step, status: 'completed' as const }
      if (i === next) return { ...step, status: 'active' as const }
      return { ...step, status: 'pending' as const }
    })

    const currentStep = updatedSteps[next]
    const requiresHitl = currentStep.triggersHITL
    const phase = this.computePhase(next)

    this.state = {
      ...this.state,
      current_step: next,
      steps: updatedSteps,
      is_running: !requiresHitl,
      requires_hitl: requiresHitl,
      incidentPhase: phase,
    }

    const stepScoreboard = this.computeScoreboard(next)
    this.appendAudit({
      agent: currentStep.agent_name,
      action: `Step ${next + 1} activated`,
      outcome: currentStep.finding_summary.slice(0, 100),
      paymentCount: stepScoreboard.paymentsStuck > 0 ? stepScoreboard.paymentsStuck : undefined,
      valueM: stepScoreboard.valueAtRisk > 0 ? stepScoreboard.valueAtRisk : undefined,
    })

    this.emit('stepChange', { step: next })
    this.emit('scoreboardUpdate', this.getScoreboard())

    if (requiresHitl) {
      this.emit('hitlRequired')
    }
  }

  prevStep(): void {
    if (this.state.current_step <= 0) return
    const prev = this.state.current_step - 1
    this.jumpToStep(prev)
  }

  jumpToStep(n: number): void {
    if (n < 0 || n >= this.state.steps.length) return

    const updatedSteps = this.state.steps.map((step, i) => {
      if (i < n) return { ...step, status: 'completed' as const }
      if (i === n) return { ...step, status: 'active' as const }
      return { ...step, status: 'pending' as const }
    })

    const currentStep = updatedSteps[n]
    const requiresHitl = currentStep.triggersHITL
    const phase = this.computePhase(n)

    this.state = {
      ...this.state,
      current_step: n,
      steps: updatedSteps,
      is_running: !requiresHitl,
      requires_hitl: requiresHitl,
      hitl_approved: n > STEP_ORDER.indexOf('governance'),
      incidentPhase: phase,
      completed_at: undefined,
    }

    this.emit('stepChange', { step: n })
    this.emit('scoreboardUpdate', this.getScoreboard())

    if (requiresHitl) {
      this.emit('hitlRequired')
    }
  }

  setSelectedRemediation(optionId: string): void {
    this.state = {
      ...this.state,
      selectedRemediationOption: optionId,
    }
  }

  approveHitl(optionTitle?: string): void {
    this.state = {
      ...this.state,
      hitl_approved: true,
      requires_hitl: false,
      is_running: true,
    }
    const scoreboard = this.getScoreboard()
    this.appendAudit({
      agent: 'Governance Agent',
      action: `HITL gate approved — ${optionTitle ?? this.state.selectedRemediationOption ?? 'Option A'}`,
      outcome: 'Human operator approved remediation',
      approver: 'Operator',
      paymentCount: scoreboard.paymentsStuck,
      valueM: scoreboard.valueAtRisk,
    })
  }

  reset(): void {
    this.state = {
      ...this.state,
      current_step: -1,
      steps: this.initialSteps.map((s) => ({ ...s, status: 'pending' as const })),
      is_running: false,
      requires_hitl: false,
      hitl_approved: false,
      incidentPhase: 'pre-incident',
      selectedRemediationOption: null,
      completed_at: undefined,
      auditLog: [],
    }
    this.emit('stepChange', { step: -1 })
    this.emit('scoreboardUpdate', this.getScoreboard())
  }

  pause(): void {
    this.state = { ...this.state, is_running: false }
  }

  resume(): void {
    if (!this.state.requires_hitl) {
      this.state = { ...this.state, is_running: true }
    }
  }

  // --- Getters ---

  getState(): WorkflowState {
    return { ...this.state }
  }

  getCurrentStep(): number {
    return this.state.current_step
  }

  getScoreboard(): ScoreboardMetrics {
    return this.computeScoreboard(this.state.current_step)
  }

  getAuditLog(): AuditEntry[] {
    return [...this.state.auditLog]
  }

  getIncidentPhase(): IncidentPhase {
    return this.state.incidentPhase
  }

  // --- Event system ---

  on(event: EngineEvent, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  private emit(event: EngineEvent, data?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data))
  }

  // --- Internal ---

  private computeScoreboard(upToStep: number): ScoreboardMetrics {
    const scoreboard = { ...INITIAL_SCOREBOARD }
    if (upToStep < 0) return scoreboard
    for (let i = 0; i <= upToStep && i < this.state.steps.length; i++) {
      const delta = this.state.steps[i].scoreboardDelta
      if (delta) {
        Object.assign(scoreboard, delta)
      }
    }
    return scoreboard
  }

  private computePhase(step: number): IncidentPhase {
    if (step < 0) return 'pre-incident'
    if (step <= 1) return 'detecting'
    if (step <= 5) return 'investigating'
    if (step === 6) return 'hitl-pending'
    if (step === 7) return 'executing'
    if (step === 8) return 'recovering'
    return 'resolved'
  }

  private appendAudit(entry: Omit<AuditEntry, 'timestamp'>): void {
    this.state.auditLog = [
      ...this.state.auditLog,
      { ...entry, timestamp: new Date().toISOString() },
    ]
  }
}

// --- Legacy exports for backward compat ---

export function getStepIndex(stepId: WorkflowStepId): number {
  return STEP_ORDER.indexOf(stepId)
}

export { STEP_ORDER, INITIAL_SCOREBOARD }
