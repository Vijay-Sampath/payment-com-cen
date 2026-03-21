// ============================================================
// Agentic AI Payments Resilience Command Center — Type System
// ============================================================

// --- Bank Profiles ---
export type BankId = 'bofa' | 'citi' | 'jpmorgan' | 'wellsfargo'

export interface BankProfile {
  id: BankId
  name: string
  shortName: string
  bicFamily: string[]
  platformName: string
  cobolSystemAlias: string
  riskPosture: 'Conservative' | 'Moderate' | 'Aggressive'
  primaryCorridors: Corridor[]
  clients: ClientArchetype[]
  theme: {
    accent: string
    logo?: string
  }
}

export interface Corridor {
  from: string
  to: string
  fromCity: string
  toCity: string
  fromCoords: [number, number]  // [lat, lng]
  toCoords: [number, number]
  currency: string
  volume: string
  status: 'healthy' | 'degraded' | 'critical'
}

export interface ClientArchetype {
  name: string
  type: 'Fortune 500' | 'Sovereign Wealth' | 'Global Conglomerate'
  industry: string
  avgDailyVolume: string
}

// --- Workflow Engine ---
export type WorkflowStepId =
  | 'detect'
  | 'correlate'
  | 'cluster'
  | 'impact'
  | 'topology'
  | 'repair'
  | 'governance'
  | 'execute'
  | 'verify'

// Legacy aliases for backward compat with data that may still use old IDs
export type LegacyStepId =
  | 'cluster_logs'
  | 'identify_cohort'
  | 'estimate_impact'
  | 'propose_repair'
  | 'governance_gate'
  | 'execute_recovery'
  | 'verify_outcome'

export type StepStatus = 'pending' | 'active' | 'completed' | 'skipped'

// Incident phase tracking
export type IncidentPhase =
  | 'pre-incident'
  | 'detecting'
  | 'investigating'
  | 'hitl-pending'
  | 'executing'
  | 'recovering'
  | 'resolved'

export interface AgentCard {
  step_id: WorkflowStepId
  step_number: number
  agent_name: string
  agent_icon: string
  input_summary: string
  finding_summary: string
  confidence_score: number
  handoff_target: string
  evidence_refs: string[]
  duration_ms: number
  status: StepStatus
  narrative?: string               // Optional LLM-generated narrative
  businessSignal: string            // Business-level impact description
  staticNarrative: string           // Pre-written narrative (fallback for LLM)
  scoreboardDelta: Partial<ScoreboardMetrics>  // Absolute target values for this step
  triggersHITL: boolean             // true only for governance step
}

// Audit log entry
export interface AuditEntry {
  timestamp: string
  agent: string
  action: string
  outcome: string
  approver?: string
  paymentCount?: number
  valueM?: number
}

export interface WorkflowState {
  scenario_id: string
  bank_id: BankId
  current_step: number
  steps: AgentCard[]
  started_at: string
  completed_at?: string
  is_running: boolean
  requires_hitl: boolean
  hitl_approved: boolean
  incidentPhase: IncidentPhase
  selectedRemediationOption: string | null
  auditLog: AuditEntry[]
}

// --- Scoreboard ---
export interface ScoreboardMetrics {
  valueAtRisk: number           // $M
  paymentsStuck: number         // count
  slaBreach: number             // minutes remaining
  investigationsAvoided: number // count
  opsHoursSaved: number         // hours
  mttrBefore: number            // minutes
  mttrAfter: number             // minutes
  recoveredVolume: number       // count
  stpRateRestored: number       // percentage
}

// --- Scenario ---
export interface Scenario {
  id: string
  title: string
  subtitle: string
  description: string
  severity: 'critical' | 'high' | 'medium'
  trigger: string
  impactSummary: string
  timeline: TimelineEvent[]
  payments: PaymentRecord[]
  logEntries: LogEntry[]
  agentSteps: AgentCard[]
  initialMetrics: ScoreboardMetrics
  finalMetrics: ScoreboardMetrics
  remediationOptions: RemediationOption[]
}

export interface TimelineEvent {
  timestamp: string
  event: string
  severity: 'info' | 'warning' | 'critical'
  source: string
}

export interface PaymentRecord {
  id: string
  uetr: string  // Unique End-to-End Transaction Reference
  originator: string
  beneficiary: string
  amount: number
  currency: string
  originBic: string
  destBic: string
  status: 'completed' | 'stuck' | 'failed' | 'recovered'
  corridor: string
  timestamp: string
  failureReason?: string
  sanctionsCheckStatus: 'passed' | 'timeout' | 'pending' | 'failed'
  retryCount: number
}

export interface LogEntry {
  id: string
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
  source: string
  message: string
  correlationId?: string
  cluster?: string
  semanticCategory?: string
}

export interface RemediationOption {
  id: string
  rank: number
  title: string
  description: string
  speed: number      // 1-10
  risk: number       // 1-10
  businessImpact: number  // 1-10
  recommended: boolean
  steps: string[]
  estimatedTime: string
}

// --- HITL ---
export interface HITLDecision {
  selectedOption: string
  approvedBy: string
  approvedAt: string
  rationale: string
}

// --- Director Panel ---
export interface DirectorState {
  isOpen: boolean
  selectedBank: BankId
  selectedScenario: string
  currentStep: number
  autoPlay: boolean
  playbackSpeed: number
  liveNarration: boolean
  apiKeyPresent: boolean
}

// --- App Context ---
export interface AppState {
  bank: BankProfile
  scenario: Scenario
  workflow: WorkflowState
  scoreboard: ScoreboardMetrics
  director: DirectorState
}
