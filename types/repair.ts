// ============================================================
// Payment Repair Workbench — Type Definitions
// ============================================================

export type ExceptionType =
  | 'RJCT08_BIC_INVALID'
  | 'NAMC_NAME_MISMATCH'
  | 'RJCT11_ADDRESS_UNSTRUCTURED'
  | 'DUPL_DUPLICATE_DETECTED'
  | 'ACMT_ACCOUNT_CLOSED'
  | 'CURR_CURRENCY_MISMATCH'

export type ExceptionSeverity = 'critical' | 'high' | 'medium' | 'low'

export type MakerCheckerPattern = 'FOUR_EYES' | 'BATCH_APPROVAL' | 'AUTONOMOUS_WITH_AUDIT'

export type RepairStatus =
  | 'queued'
  | 'ai_proposed'
  | 'human_review'
  | 'approved'
  | 'applied'
  | 'verified'
  | 'rejected'

export interface FieldDiff {
  field: string
  original: string
  proposed: string
  confidence: number
  source: string
}

export interface AIProposal {
  id: string
  proposedAt: string
  fields: FieldDiff[]
  confidence: number
  reasoning: string
  regulatoryNotes: string
  estimatedTime: string
}

export interface PaymentSnapshot {
  // Header / Routing
  messageType: string
  instructionId: string
  transactionRef: string
  uetr: string
  settlementDate: string
  valueDate: string
  priority: string

  // Ordering Customer (Originator)
  originatorName: string
  originatorAccount: string
  originatorBic: string
  originatorAddress: string

  // Beneficiary
  beneficiaryName: string
  beneficiaryAccount: string
  beneficiaryBic: string
  beneficiaryAddress: string

  // Institutions
  orderingInstitutionBic: string
  intermediaryBic: string
  accountWithInstitutionBic: string

  // Financial
  amount: number
  currency: string
  exchangeRate: string | null
  chargeBearer: string

  // Compliance
  sanctionsScreeningResult: string
  sanctionsListChecked: string
  screeningTimestamp: string
  amlRiskScore: number

  // Status
  paymentStatus: string
  failureCode: string | null
  failureDescription: string | null
  retryCount: number
  queuePosition: number | null

  // Remittance
  purposeOfPayment: string
  remittanceInfo: string
}

export interface RepairQueueItem {
  id: string
  paymentId: string
  uetr: string
  exceptionType: ExceptionType
  severity: ExceptionSeverity
  raisedAt: string
  amount: number
  currency: string
  originator: string
  beneficiary: string
  corridor: string
  rootCause: string
  aiProposal: AIProposal
  status: RepairStatus
  makerChecker: MakerCheckerPattern
  approvedBy?: string
  approvedAt?: string
  originalPayment: PaymentSnapshot
  repairedPayment: PaymentSnapshot
}

export interface RepairState {
  queue: RepairQueueItem[]
  selectedItemId: string | null
  filter: ExceptionType | 'all'
  expandedProposalId: string | null
}
