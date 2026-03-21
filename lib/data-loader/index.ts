import { BankId, BankProfile, Scenario, AgentCard, PaymentRecord, RepairQueueItem, PaymentSnapshot } from '@/types'

// Static imports for bank profiles
import bofaProfile from '@/data/bank-profiles/bofa.json'
import citiProfile from '@/data/bank-profiles/citi.json'
import jpmorganProfile from '@/data/bank-profiles/jpmorgan.json'
import wellsfargoProfile from '@/data/bank-profiles/wellsfargo.json'

// Static imports for scenario data
import flagshipScenario from '@/data/scenarios/flagship.json'
import agentSteps from '@/data/scenarios/agent-steps.json'

const bankProfiles: Record<BankId, BankProfile> = {
  bofa: bofaProfile as unknown as BankProfile,
  citi: citiProfile as unknown as BankProfile,
  jpmorgan: jpmorganProfile as unknown as BankProfile,
  wellsfargo: wellsfargoProfile as unknown as BankProfile,
}

function deterministicUnit(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 1000000) / 1000000
}

export function getBankProfile(bankId: BankId): BankProfile {
  return bankProfiles[bankId]
}

export function getAllBankProfiles(): BankProfile[] {
  return Object.values(bankProfiles)
}

export function getAgentSteps(bankId: BankId): AgentCard[] {
  const profile = getBankProfile(bankId)
  // Hydrate agent steps with bank-specific references
  return (agentSteps as unknown as AgentCard[]).map((step) => ({
    ...step,
    // Replace generic system names with bank-specific ones
    finding_summary: hydrateBankContext(step.finding_summary, profile),
    narrative: step.narrative
      ? hydrateBankContext(step.narrative, profile)
      : undefined,
    staticNarrative: step.staticNarrative
      ? hydrateBankContext(step.staticNarrative, profile)
      : step.narrative
        ? hydrateBankContext(step.narrative, profile)
        : '',
    businessSignal: step.businessSignal ?? '',
    scoreboardDelta: step.scoreboardDelta ?? {},
    triggersHITL: step.triggersHITL ?? false,
  }))
}

export function getScenario(bankId: BankId): Scenario {
  const profile = getBankProfile(bankId)
  const scenario = flagshipScenario as unknown as Scenario

  return {
    ...scenario,
    // Generate bank-specific payments
    payments: generateBankPayments(profile),
    // Generate bank-specific log entries
    logEntries: generateBankLogs(profile),
    // Hydrate agent steps
    agentSteps: getAgentSteps(bankId),
    // Update description with bank context
    description: hydrateBankContext(scenario.description, profile),
    timeline: scenario.timeline.map((t) => ({
      ...t,
      event: hydrateBankContext(t.event, profile),
    })),
  }
}

function hydrateBankContext(text: string, profile: BankProfile): string {
  // BofA is the default template bank — replace its names with the active bank's names
  return text
    .replace(/the legacy COBOL/gi, `the ${profile.cobolSystemAlias}`)
    .replace(/legacy adapter/gi, `${profile.cobolSystemAlias} adapter`)
    .replace(/Legacy adapter/gi, `${profile.cobolSystemAlias} adapter`)
    .replace(/Siemens AG Treasury/g, profile.clients[0]?.name ?? 'Client A')
    .replace(/Rio Tinto Commodities/g, profile.clients[1]?.name ?? 'Client B')
    .replace(/Merck FX Desk/g, profile.clients[2]?.name ?? 'Client C')
}

function generateBankPayments(profile: BankProfile): PaymentRecord[] {
  const payments: PaymentRecord[] = []
  const statuses: PaymentRecord['status'][] = [
    'stuck',
    'stuck',
    'stuck',
    'failed',
    'stuck',
    'recovered',
    'stuck',
  ]
  const corridors = profile.primaryCorridors

  for (let i = 0; i < 142; i++) {
    const corridor = corridors[i % corridors.length]
    const client = profile.clients[i % profile.clients.length]
    const bic = profile.bicFamily[0]
    const hour = 14
    const min = 23 + Math.floor(i / 10)
    const sec = String(i % 60).padStart(2, '0')

    payments.push({
      id: `PMT-${String(i + 1).padStart(4, '0')}`,
      uetr: `a1b2c3d4-${String(i).padStart(4, '0')}-4${String(i % 1000).padStart(3, '0')}-b${String(i % 100).padStart(2, '0')}0-${bic.toLowerCase().slice(0, 12)}`,
      originator: client.name,
      beneficiary: `Beneficiary-${corridor.to}-${String(i + 1).padStart(3, '0')}`,
      amount:
        Math.round(
          (1000000 + deterministicUnit(`${profile.id}-amount-${i}`) * 50000000 + (i % 3 === 0 ? 100000000 : 0)) / 100
        ) * 100,
      currency: corridor.currency.split('/')[0],
      originBic: bic,
      destBic: `DEST${corridor.to}XX`,
      status: i < 139 ? (i < 130 ? 'recovered' : statuses[i % statuses.length]) : 'stuck',
      corridor: `${corridor.from}→${corridor.to}`,
      timestamp: `2024-01-15T${hour}:${String(min).padStart(2, '0')}:${sec}Z`,
      failureReason:
        i >= 130 && i < 139
          ? 'Sanctions screening timeout'
          : i >= 139
            ? 'Pre-existing data quality issue'
            : undefined,
      sanctionsCheckStatus: i < 130 ? 'passed' : i < 139 ? 'timeout' : 'pending',
      retryCount: i < 130 ? 0 : Math.floor(deterministicUnit(`${profile.id}-retry-${i}`) * 4) + 1,
    })
  }

  return payments
}

function generateBankLogs(profile: BankProfile): import('@/types').LogEntry[] {
  const logs: import('@/types').LogEntry[] = []
  const sources = [
    'Payment-Gateway',
    profile.cobolSystemAlias,
    'Sanctions-Service',
    'MQ-Broker',
    'FX-Engine',
    'APM-Monitor',
  ]
  const clusters = [
    'sanctions-timeout',
    'retry-noise',
    'queue-overflow',
    'fx-refresh-fail',
  ]
  const categories = [
    'Service Degradation',
    'Retry Storm',
    'Queue Pressure',
    'Secondary Impact',
  ]

  const messages = [
    { level: 'ERROR' as const, msg: `Sanctions screening timeout after 14200ms — transaction held`, cluster: 0 },
    { level: 'WARN' as const, msg: `${profile.cobolSystemAlias} retry attempt 3/3 for message batch`, cluster: 1 },
    { level: 'CRITICAL' as const, msg: `Queue depth 847 exceeds threshold 100 — backpressure applied`, cluster: 2 },
    { level: 'ERROR' as const, msg: `Sanctions service connection pool exhausted — 0/50 available`, cluster: 0 },
    { level: 'WARN' as const, msg: `${profile.cobolSystemAlias} generating duplicate messages — retry storm detected`, cluster: 1 },
    { level: 'ERROR' as const, msg: `Payment ${profile.bicFamily[0]}→DESTGBXX timed out at sanctions gate`, cluster: 0 },
    { level: 'WARN' as const, msg: `FX rate refresh failed — using stale rate (age: 47min)`, cluster: 3 },
    { level: 'CRITICAL' as const, msg: `SLA breach imminent — 142 payments pending > 5 minutes`, cluster: 2 },
    { level: 'INFO' as const, msg: `Backup sanctions cluster (Region B) health check: HEALTHY`, cluster: 0 },
    { level: 'ERROR' as const, msg: `Message replay detected — ${profile.cobolSystemAlias} sent 3x duplicate for PMT-0047`, cluster: 1 },
  ]

  for (let i = 0; i < 50; i++) {
    const template = messages[i % messages.length]
    const sec = String(23 + Math.floor(i / 5)).padStart(2, '0')
    const ms = String((i * 137) % 1000).padStart(3, '0')

    logs.push({
      id: `LOG-${String(i + 1).padStart(4, '0')}`,
      timestamp: `2024-01-15T14:${sec}:${String(i % 60).padStart(2, '0')}.${ms}Z`,
      level: template.level,
      source: sources[i % sources.length],
      message: template.msg,
      correlationId: `COR-${String(Math.floor(i / 3)).padStart(4, '0')}`,
      cluster: clusters[template.cluster],
      semanticCategory: categories[template.cluster],
    })
  }

  return logs
}

function buildPaymentSnapshot(opts: {
  uetr: string
  messageType?: string
  instructionId: string
  transactionRef: string
  priority?: string
  originatorName: string
  originatorAccount: string
  originatorBic: string
  originatorAddress: string
  beneficiaryName: string
  beneficiaryAccount: string
  beneficiaryBic: string
  beneficiaryAddress: string
  orderingInstitutionBic: string
  intermediaryBic: string
  accountWithInstitutionBic: string
  amount: number
  currency: string
  exchangeRate?: string | null
  chargeBearer?: string
  sanctionsScreeningResult?: string
  amlRiskScore?: number
  paymentStatus: string
  failureCode?: string | null
  failureDescription?: string | null
  retryCount?: number
  queuePosition?: number | null
  purposeOfPayment?: string
  remittanceInfo?: string
}): PaymentSnapshot {
  return {
    messageType: opts.messageType ?? 'MT103',
    instructionId: opts.instructionId,
    transactionRef: opts.transactionRef,
    uetr: opts.uetr,
    settlementDate: '2024-01-15',
    valueDate: '2024-01-15',
    priority: opts.priority ?? 'URGENT',
    originatorName: opts.originatorName,
    originatorAccount: opts.originatorAccount,
    originatorBic: opts.originatorBic,
    originatorAddress: opts.originatorAddress,
    beneficiaryName: opts.beneficiaryName,
    beneficiaryAccount: opts.beneficiaryAccount,
    beneficiaryBic: opts.beneficiaryBic,
    beneficiaryAddress: opts.beneficiaryAddress,
    orderingInstitutionBic: opts.orderingInstitutionBic,
    intermediaryBic: opts.intermediaryBic,
    accountWithInstitutionBic: opts.accountWithInstitutionBic,
    amount: opts.amount,
    currency: opts.currency,
    exchangeRate: opts.exchangeRate ?? null,
    chargeBearer: opts.chargeBearer ?? 'SHA',
    sanctionsScreeningResult: opts.sanctionsScreeningResult ?? 'PASS',
    sanctionsListChecked: 'OFAC SDN, EU Consolidated, UN Sanctions',
    screeningTimestamp: '2024-01-15T14:30:47Z',
    amlRiskScore: opts.amlRiskScore ?? 12,
    paymentStatus: opts.paymentStatus,
    failureCode: opts.failureCode ?? null,
    failureDescription: opts.failureDescription ?? null,
    retryCount: opts.retryCount ?? 0,
    queuePosition: opts.queuePosition ?? null,
    purposeOfPayment: opts.purposeOfPayment ?? 'Trade Settlement',
    remittanceInfo: opts.remittanceInfo ?? 'Invoice payment per contract terms',
  }
}

export function getRepairQueue(bankId: BankId): RepairQueueItem[] {
  const profile = getBankProfile(bankId)
  const bic = profile.bicFamily[0]
  const corridors = profile.primaryCorridors
  const clients = profile.clients
  const bicPrefix = bic.slice(0, 4)

  const c = (i: number) => corridors[i % corridors.length]
  const cl = (i: number) => clients[i % clients.length]

  const items: RepairQueueItem[] = [
    // 001 — BIC Invalid — critical — $24.5M — FOUR_EYES
    (() => {
      const cor = c(0)
      const client = cl(0)
      const uetr = `f7e8d9c0-0140-4001-b010-${bic.toLowerCase().slice(0, 12)}`
      const badBic = `DEST${cor.to}XX`
      const goodBic = `${bicPrefix}${cor.to}2L`
      const base = {
        uetr,
        instructionId: `${bicPrefix}-240115-0140`,
        transactionRef: `E2E-${bicPrefix}-0140`,
        originatorName: client.name,
        originatorAccount: `${bicPrefix}00014088901`,
        originatorBic: bic,
        originatorAddress: `${cor.fromCity}, ${cor.from}`,
        beneficiaryName: `Beneficiary-${cor.to}-140`,
        beneficiaryAccount: `DEST00014088902`,
        beneficiaryBic: badBic,
        beneficiaryAddress: `${cor.toCity}, ${cor.to}`,
        orderingInstitutionBic: bic,
        intermediaryBic: `CHASUS33`,
        accountWithInstitutionBic: badBic,
        amount: 24_500_000,
        currency: cor.currency.split('/')[0],
        paymentStatus: 'RJCT',
        failureCode: 'RJCT08',
        failureDescription: 'Invalid BIC — not found in SWIFT directory',
        retryCount: 1,
        queuePosition: 1,
        purposeOfPayment: 'Cross-border trade settlement',
        remittanceInfo: `INV-2024-${bicPrefix}-0140 Q1 trade settlement`,
      }
      return {
        id: `RPR-${bankId.toUpperCase()}-001`,
        paymentId: 'PMT-0140',
        uetr,
        exceptionType: 'RJCT08_BIC_INVALID' as const,
        severity: 'critical' as const,
        raisedAt: '2024-01-15T14:31:12Z',
        amount: 24_500_000,
        currency: cor.currency.split('/')[0],
        originator: client.name,
        beneficiary: `Beneficiary-${cor.to}-140`,
        corridor: `${cor.from}→${cor.to}`,
        rootCause: `Destination BIC ${badBic} failed SWIFT directory validation — likely stale BIC after counterparty migration`,
        aiProposal: {
          id: `PROP-${bankId.toUpperCase()}-001`,
          proposedAt: '2024-01-15T14:31:18Z',
          fields: [
            { field: 'Destination BIC', original: badBic, proposed: goodBic, confidence: 0.94, source: 'SWIFT Directory 2024-Q1 + historical payment graph' },
            { field: 'Receiver Agent', original: 'NOTPROVIDED', proposed: goodBic, confidence: 0.94, source: 'Counterparty mapping database' },
          ],
          confidence: 0.94,
          reasoning: `Cross-referenced SWIFT gpi directory (2024-Q1) with 6 months of successful payment history for ${client.name}. The destination BIC was migrated by the counterparty on 2024-01-10. Proposed BIC has 847 successful settlements in the past 90 days.`,
          regulatoryNotes: 'BIC substitution requires FOUR_EYES review per CPMI-IOSCO Principle 17 (Operational Risk). Counterparty verification log attached.',
          estimatedTime: '< 2 min after approval',
        },
        status: 'ai_proposed' as const,
        makerChecker: 'FOUR_EYES' as const,
        originalPayment: buildPaymentSnapshot(base),
        repairedPayment: buildPaymentSnapshot({ ...base, beneficiaryBic: goodBic, accountWithInstitutionBic: goodBic, paymentStatus: 'ACSP', failureCode: null, failureDescription: null }),
      }
    })(),

    // 002 — Name Mismatch — high — $8.75M — FOUR_EYES
    (() => {
      const cor = c(1)
      const client = cl(1)
      const uetr = `a3b4c5d6-0141-4002-b020-${bic.toLowerCase().slice(0, 12)}`
      const base = {
        uetr,
        instructionId: `${bicPrefix}-240115-0141`,
        transactionRef: `E2E-${bicPrefix}-0141`,
        originatorName: client.name,
        originatorAccount: `${bicPrefix}00014188901`,
        originatorBic: bic,
        originatorAddress: `${cor.fromCity}, ${cor.from}`,
        beneficiaryName: 'B\u00e9n\u00e9ficiary Trdg. Co., Ltd.',
        beneficiaryAccount: `BENE00014188902`,
        beneficiaryBic: `BENE${cor.to}XX`,
        beneficiaryAddress: `${cor.toCity}, ${cor.to}`,
        orderingInstitutionBic: bic,
        intermediaryBic: `CITIUS33`,
        accountWithInstitutionBic: `BENE${cor.to}XX`,
        amount: 8_750_000,
        currency: cor.currency.split('/')[0],
        paymentStatus: 'HELD',
        failureCode: 'NAMC',
        failureDescription: 'Beneficiary name mismatch — special characters rejected',
        retryCount: 0,
        queuePosition: 2,
        purposeOfPayment: 'Supplier payment',
        remittanceInfo: `PO-2024-${bicPrefix}-0141 supplier invoice`,
      }
      return {
        id: `RPR-${bankId.toUpperCase()}-002`,
        paymentId: 'PMT-0141',
        uetr,
        exceptionType: 'NAMC_NAME_MISMATCH' as const,
        severity: 'high' as const,
        raisedAt: '2024-01-15T14:31:45Z',
        amount: 8_750_000,
        currency: cor.currency.split('/')[0],
        originator: client.name,
        beneficiary: `Beneficiary-${cor.to}-141`,
        corridor: `${cor.from}→${cor.to}`,
        rootCause: 'Beneficiary name contains unstructured characters — SWIFT gpi name matching failed on special characters in registered name',
        aiProposal: {
          id: `PROP-${bankId.toUpperCase()}-002`,
          proposedAt: '2024-01-15T14:31:52Z',
          fields: [
            { field: 'Beneficiary Name', original: 'B\u00e9n\u00e9ficiary Trdg. Co., Ltd.', proposed: 'Beneficiary Trading Co Ltd', confidence: 0.87, source: 'SWIFT name-matching algorithm + counterparty registry' },
            { field: 'Name Matching Override', original: 'STRICT', proposed: 'FUZZY_MATCH_VERIFIED', confidence: 0.87, source: 'Historical match pattern analysis' },
          ],
          confidence: 0.87,
          reasoning: `Name normalization applied: removed diacritics (\u00e9\u2192e), expanded abbreviation (Trdg.\u2192Trading, Co.\u2192Co, Ltd.\u2192Ltd). The counterparty has 23 successful payments under both name variants. Fuzzy match score: 94.2%.`,
          regulatoryNotes: 'Name mismatch override requires dual approval per AML/CFT screening guidelines. Sanctions re-check will be triggered automatically post-repair.',
          estimatedTime: '< 1 min after approval',
        },
        status: 'ai_proposed' as const,
        makerChecker: 'FOUR_EYES' as const,
        originalPayment: buildPaymentSnapshot(base),
        repairedPayment: buildPaymentSnapshot({ ...base, beneficiaryName: 'Beneficiary Trading Co Ltd', paymentStatus: 'ACSP', failureCode: null, failureDescription: null }),
      }
    })(),

    // 003 — Duplicate Detected — medium — $3.2M — AUTONOMOUS_WITH_AUDIT
    (() => {
      const cor = c(2)
      const client = cl(2)
      const uetr = `d9e0f1a2-0142-4003-b030-${bic.toLowerCase().slice(0, 12)}`
      const base = {
        uetr,
        instructionId: `${bicPrefix}-240115-0142`,
        transactionRef: `E2E-${bicPrefix}-0142`,
        originatorName: client.name,
        originatorAccount: `${bicPrefix}00014288901`,
        originatorBic: bic,
        originatorAddress: `${cor.fromCity}, ${cor.from}`,
        beneficiaryName: `Beneficiary-${cor.to}-142`,
        beneficiaryAccount: `BENE00014288902`,
        beneficiaryBic: `BENE${cor.to}XX`,
        beneficiaryAddress: `${cor.toCity}, ${cor.to}`,
        orderingInstitutionBic: bic,
        intermediaryBic: `DEUTDEFF`,
        accountWithInstitutionBic: `BENE${cor.to}XX`,
        amount: 3_200_000,
        currency: cor.currency.split('/')[0],
        paymentStatus: 'HELD',
        failureCode: 'DUPL',
        failureDescription: 'Duplicate payment detected — identical UETR prefix',
        retryCount: 3,
        queuePosition: 3,
        purposeOfPayment: 'Treasury transfer',
        remittanceInfo: `TXN-2024-${bicPrefix}-0142 treasury sweep`,
      }
      return {
        id: `RPR-${bankId.toUpperCase()}-003`,
        paymentId: 'PMT-0142',
        uetr,
        exceptionType: 'DUPL_DUPLICATE_DETECTED' as const,
        severity: 'medium' as const,
        raisedAt: '2024-01-15T14:32:08Z',
        amount: 3_200_000,
        currency: cor.currency.split('/')[0],
        originator: client.name,
        beneficiary: `Beneficiary-${cor.to}-142`,
        corridor: `${cor.from}→${cor.to}`,
        rootCause: `${profile.cobolSystemAlias} retry storm generated duplicate message — original PMT-0047 and retry PMT-0142 have identical UETR prefix`,
        aiProposal: {
          id: `PROP-${bankId.toUpperCase()}-003`,
          proposedAt: '2024-01-15T14:32:15Z',
          fields: [
            { field: 'Duplicate Status', original: 'HELD_PENDING_REVIEW', proposed: 'CANCELLED_DUPLICATE', confidence: 0.91, source: 'UETR correlation + message sequence analysis' },
            { field: 'Original Reference', original: 'NOT_LINKED', proposed: 'PMT-0047 (settled at 14:25:03Z)', confidence: 0.91, source: 'Settlement confirmation database' },
          ],
          confidence: 0.91,
          reasoning: `UETR prefix analysis confirms PMT-0142 is a retry duplicate of PMT-0047 generated by the ${profile.cobolSystemAlias} retry storm. PMT-0047 was successfully settled at 14:25:03Z. Cancelling the duplicate poses zero settlement risk.`,
          regulatoryNotes: 'Duplicate cancellation under AUTONOMOUS_WITH_AUDIT — full evidence chain logged. No value movement involved.',
          estimatedTime: 'Immediate (auto-apply eligible)',
        },
        status: 'ai_proposed' as const,
        makerChecker: 'AUTONOMOUS_WITH_AUDIT' as const,
        originalPayment: buildPaymentSnapshot(base),
        repairedPayment: buildPaymentSnapshot({ ...base, paymentStatus: 'CANC', failureCode: 'DUPL_CANCELLED', failureDescription: 'Duplicate cancelled — original PMT-0047 settled' }),
      }
    })(),

    // 004 — Address Unstructured — high — $15.8M — FOUR_EYES
    (() => {
      const cor = c(0)
      const client = cl(0)
      const uetr = `b1c2d3e4-0143-4004-b040-${bic.toLowerCase().slice(0, 12)}`
      const badAddr = '23 High St, London EC2V 8BX, United Kingdom'
      const goodAddr = '/23/High Street/London/EC2V 8BX/GB'
      const base = {
        uetr,
        instructionId: `${bicPrefix}-240115-0143`,
        transactionRef: `E2E-${bicPrefix}-0143`,
        originatorName: client.name,
        originatorAccount: `${bicPrefix}00014388901`,
        originatorBic: bic,
        originatorAddress: `${cor.fromCity}, ${cor.from}`,
        beneficiaryName: `GlobalTrade Partners ${cor.to}`,
        beneficiaryAccount: `GB82WEST12345698765432`,
        beneficiaryBic: `WEST${cor.to}2L`,
        beneficiaryAddress: badAddr,
        orderingInstitutionBic: bic,
        intermediaryBic: `BARCGB22`,
        accountWithInstitutionBic: `WEST${cor.to}2L`,
        amount: 15_800_000,
        currency: cor.currency.split('/')[0],
        paymentStatus: 'RJCT',
        failureCode: 'RJCT11',
        failureDescription: 'Address format non-compliant — unstructured address in structured field',
        retryCount: 1,
        queuePosition: 4,
        purposeOfPayment: 'Intercompany settlement',
        remittanceInfo: `IC-2024-${bicPrefix}-0143 intercompany Q1`,
      }
      return {
        id: `RPR-${bankId.toUpperCase()}-004`,
        paymentId: 'PMT-0143',
        uetr,
        exceptionType: 'RJCT11_ADDRESS_UNSTRUCTURED' as const,
        severity: 'high' as const,
        raisedAt: '2024-01-15T14:32:34Z',
        amount: 15_800_000,
        currency: cor.currency.split('/')[0],
        originator: client.name,
        beneficiary: `GlobalTrade Partners ${cor.to}`,
        corridor: `${cor.from}→${cor.to}`,
        rootCause: 'Beneficiary address in unstructured format — ISO 20022 pacs.008 requires structured address with separate street/city/country fields',
        aiProposal: {
          id: `PROP-${bankId.toUpperCase()}-004`,
          proposedAt: '2024-01-15T14:32:41Z',
          fields: [
            { field: 'Beneficiary Address', original: badAddr, proposed: goodAddr, confidence: 0.89, source: 'ISO 20022 address parser + Royal Mail PAF lookup' },
            { field: 'Address Type', original: 'UNSTRUCTURED', proposed: 'STRUCTURED', confidence: 0.89, source: 'ISO 20022 compliance engine' },
          ],
          confidence: 0.89,
          reasoning: `Parsed unstructured address into ISO 20022 structured components: street number (23), street name (High Street), city (London), postal code (EC2V 8BX), country (GB). Validated against Royal Mail PAF database. Address match confidence: 98.7%.`,
          regulatoryNotes: 'Address restructuring for ISO 20022 compliance. FOUR_EYES required as address change could affect sanctions screening.',
          estimatedTime: '< 1 min after approval',
        },
        status: 'ai_proposed' as const,
        makerChecker: 'FOUR_EYES' as const,
        originalPayment: buildPaymentSnapshot(base),
        repairedPayment: buildPaymentSnapshot({ ...base, beneficiaryAddress: goodAddr, paymentStatus: 'ACSP', failureCode: null, failureDescription: null }),
      }
    })(),

    // 005 — Account Closed — critical — $42.1M — FOUR_EYES
    (() => {
      const cor = c(1)
      const client = cl(0)
      const uetr = `c2d3e4f5-0144-4005-b050-${bic.toLowerCase().slice(0, 12)}`
      const closedAcct = `CLOS00014488902`
      const newAcct = `ACTV00014488903`
      const base = {
        uetr,
        instructionId: `${bicPrefix}-240115-0144`,
        transactionRef: `E2E-${bicPrefix}-0144`,
        priority: 'URGENT',
        originatorName: client.name,
        originatorAccount: `${bicPrefix}00014488901`,
        originatorBic: bic,
        originatorAddress: `${cor.fromCity}, ${cor.from}`,
        beneficiaryName: `${client.name} Subsidiary ${cor.to}`,
        beneficiaryAccount: closedAcct,
        beneficiaryBic: `HSBC${cor.to}HH`,
        beneficiaryAddress: `${cor.toCity}, ${cor.to}`,
        orderingInstitutionBic: bic,
        intermediaryBic: `HSBCHKHH`,
        accountWithInstitutionBic: `HSBC${cor.to}HH`,
        amount: 42_100_000,
        currency: cor.currency.split('/')[0],
        paymentStatus: 'RJCT',
        failureCode: 'ACMT03',
        failureDescription: 'Beneficiary account closed — account deactivated 2024-01-12',
        retryCount: 2,
        queuePosition: 5,
        amlRiskScore: 8,
        purposeOfPayment: 'Dividend distribution',
        remittanceInfo: `DIV-2024-${bicPrefix}-0144 annual dividend payout`,
      }
      return {
        id: `RPR-${bankId.toUpperCase()}-005`,
        paymentId: 'PMT-0144',
        uetr,
        exceptionType: 'ACMT_ACCOUNT_CLOSED' as const,
        severity: 'critical' as const,
        raisedAt: '2024-01-15T14:33:01Z',
        amount: 42_100_000,
        currency: cor.currency.split('/')[0],
        originator: client.name,
        beneficiary: `${client.name} Subsidiary ${cor.to}`,
        corridor: `${cor.from}→${cor.to}`,
        rootCause: 'Beneficiary account was closed on 2024-01-12 during counterparty restructuring — successor account identified in account migration registry',
        aiProposal: {
          id: `PROP-${bankId.toUpperCase()}-005`,
          proposedAt: '2024-01-15T14:33:08Z',
          fields: [
            { field: 'Beneficiary Account', original: closedAcct, proposed: newAcct, confidence: 0.92, source: 'Account migration registry + counterparty confirmation' },
            { field: 'Account Status', original: 'CLOSED', proposed: 'ACTIVE (successor)', confidence: 0.92, source: 'HSBC account lifecycle database' },
          ],
          confidence: 0.92,
          reasoning: `Account migration registry confirms ${closedAcct} was closed 2024-01-12 as part of entity restructuring. Successor account ${newAcct} verified active with same beneficial owner. KYC profile unchanged.`,
          regulatoryNotes: 'Account redirection requires FOUR_EYES approval — potential fraud vector. Beneficial ownership verification log attached. Enhanced due diligence completed.',
          estimatedTime: '< 3 min after approval',
        },
        status: 'ai_proposed' as const,
        makerChecker: 'FOUR_EYES' as const,
        originalPayment: buildPaymentSnapshot(base),
        repairedPayment: buildPaymentSnapshot({ ...base, beneficiaryAccount: newAcct, paymentStatus: 'ACSP', failureCode: null, failureDescription: null }),
      }
    })(),

    // 006 — Currency Mismatch — medium — $6.3M — BATCH_APPROVAL
    (() => {
      const cor = c(2)
      const client = cl(1)
      const uetr = `e4f5a6b7-0145-4006-b060-${bic.toLowerCase().slice(0, 12)}`
      const wrongCcy = 'USD'
      const rightCcy = cor.currency.split('/')[0] === 'USD' ? 'EUR' : cor.currency.split('/')[0]
      const base = {
        uetr,
        instructionId: `${bicPrefix}-240115-0145`,
        transactionRef: `E2E-${bicPrefix}-0145`,
        priority: 'NORMAL',
        originatorName: client.name,
        originatorAccount: `${bicPrefix}00014588901`,
        originatorBic: bic,
        originatorAddress: `${cor.fromCity}, ${cor.from}`,
        beneficiaryName: `Meridian Capital ${cor.to}`,
        beneficiaryAccount: `MERI00014588902`,
        beneficiaryBic: `MERI${cor.to}XX`,
        beneficiaryAddress: `${cor.toCity}, ${cor.to}`,
        orderingInstitutionBic: bic,
        intermediaryBic: `BNPAFRPP`,
        accountWithInstitutionBic: `MERI${cor.to}XX`,
        amount: 6_300_000,
        currency: wrongCcy,
        exchangeRate: '1.0842',
        paymentStatus: 'HELD',
        failureCode: 'CURR',
        failureDescription: `Currency mismatch — sent ${wrongCcy}, beneficiary account denominated in ${rightCcy}`,
        retryCount: 0,
        queuePosition: 6,
        purposeOfPayment: 'FX settlement',
        remittanceInfo: `FX-2024-${bicPrefix}-0145 spot trade settlement`,
      }
      return {
        id: `RPR-${bankId.toUpperCase()}-006`,
        paymentId: 'PMT-0145',
        uetr,
        exceptionType: 'CURR_CURRENCY_MISMATCH' as const,
        severity: 'medium' as const,
        raisedAt: '2024-01-15T14:33:28Z',
        amount: 6_300_000,
        currency: wrongCcy,
        originator: client.name,
        beneficiary: `Meridian Capital ${cor.to}`,
        corridor: `${cor.from}→${cor.to}`,
        rootCause: `Payment instructed in ${wrongCcy} but beneficiary account accepts only ${rightCcy} — likely originator data entry error`,
        aiProposal: {
          id: `PROP-${bankId.toUpperCase()}-006`,
          proposedAt: '2024-01-15T14:33:35Z',
          fields: [
            { field: 'Settlement Currency', original: wrongCcy, proposed: rightCcy, confidence: 0.86, source: 'Beneficiary account profile + FX engine' },
            { field: 'Exchange Rate', original: 'N/A (same-currency)', proposed: '1.0842 (live mid-rate)', confidence: 0.86, source: 'Reuters FX feed — 14:33:30Z' },
          ],
          confidence: 0.86,
          reasoning: `Beneficiary account MERI00014588902 is a ${rightCcy}-denominated account. Historical payment pattern shows 18 of last 20 payments to this beneficiary were in ${rightCcy}. FX conversion at live mid-rate applied.`,
          regulatoryNotes: 'Currency conversion adds FX risk. BATCH_APPROVAL eligible as amount below threshold. FX rate locked for 15 minutes.',
          estimatedTime: '< 1 min after approval',
        },
        status: 'ai_proposed' as const,
        makerChecker: 'BATCH_APPROVAL' as const,
        originalPayment: buildPaymentSnapshot(base),
        repairedPayment: buildPaymentSnapshot({ ...base, currency: rightCcy, paymentStatus: 'ACSP', failureCode: null, failureDescription: null }),
      }
    })(),

    // 007 — BIC Invalid — high — $11.2M — FOUR_EYES
    (() => {
      const cor = c(1)
      const client = cl(2)
      const uetr = `f5a6b7c8-0146-4007-b070-${bic.toLowerCase().slice(0, 12)}`
      const badBic = `OBSO${cor.to}XX`
      const goodBic = `MIGR${cor.to}2L`
      const base = {
        uetr,
        messageType: 'pacs.008.001',
        instructionId: `${bicPrefix}-240115-0146`,
        transactionRef: `E2E-${bicPrefix}-0146`,
        originatorName: client.name,
        originatorAccount: `${bicPrefix}00014688901`,
        originatorBic: bic,
        originatorAddress: `${cor.fromCity}, ${cor.from}`,
        beneficiaryName: `Vanguard Securities ${cor.to}`,
        beneficiaryAccount: `VANG00014688902`,
        beneficiaryBic: badBic,
        beneficiaryAddress: `${cor.toCity}, ${cor.to}`,
        orderingInstitutionBic: bic,
        intermediaryBic: `COBADEFF`,
        accountWithInstitutionBic: badBic,
        amount: 11_200_000,
        currency: cor.currency.split('/')[0],
        paymentStatus: 'RJCT',
        failureCode: 'RJCT08',
        failureDescription: 'BIC obsolete — counterparty BIC decommissioned post-merger',
        retryCount: 1,
        queuePosition: 7,
        purposeOfPayment: 'Securities settlement',
        remittanceInfo: `SEC-2024-${bicPrefix}-0146 bond settlement`,
      }
      return {
        id: `RPR-${bankId.toUpperCase()}-007`,
        paymentId: 'PMT-0146',
        uetr,
        exceptionType: 'RJCT08_BIC_INVALID' as const,
        severity: 'high' as const,
        raisedAt: '2024-01-15T14:33:55Z',
        amount: 11_200_000,
        currency: cor.currency.split('/')[0],
        originator: client.name,
        beneficiary: `Vanguard Securities ${cor.to}`,
        corridor: `${cor.from}→${cor.to}`,
        rootCause: `BIC ${badBic} was decommissioned on 2024-01-08 following counterparty merger — successor BIC ${goodBic} registered`,
        aiProposal: {
          id: `PROP-${bankId.toUpperCase()}-007`,
          proposedAt: '2024-01-15T14:34:02Z',
          fields: [
            { field: 'Beneficiary BIC', original: badBic, proposed: goodBic, confidence: 0.93, source: 'SWIFT BIC migration registry' },
            { field: 'Account With Institution', original: badBic, proposed: goodBic, confidence: 0.93, source: 'Correspondent banking database' },
          ],
          confidence: 0.93,
          reasoning: `SWIFT BIC migration registry confirms ${badBic} → ${goodBic} effective 2024-01-08 (post-merger). Successor BIC verified with 312 successful settlements since migration date.`,
          regulatoryNotes: 'BIC migration repair requires FOUR_EYES approval. Merger-related BIC changes must be cross-referenced with sanctions screening.',
          estimatedTime: '< 2 min after approval',
        },
        status: 'ai_proposed' as const,
        makerChecker: 'FOUR_EYES' as const,
        originalPayment: buildPaymentSnapshot(base),
        repairedPayment: buildPaymentSnapshot({ ...base, beneficiaryBic: goodBic, accountWithInstitutionBic: goodBic, paymentStatus: 'ACSP', failureCode: null, failureDescription: null }),
      }
    })(),

    // 008 — Name Mismatch — medium — $2.9M — BATCH_APPROVAL
    (() => {
      const cor = c(2)
      const client = cl(0)
      const uetr = `a6b7c8d9-0147-4008-b080-${bic.toLowerCase().slice(0, 12)}`
      const badName = 'MÜLLER & SÖHNE GMBH'
      const goodName = 'Mueller und Soehne GmbH'
      const base = {
        uetr,
        instructionId: `${bicPrefix}-240115-0147`,
        transactionRef: `E2E-${bicPrefix}-0147`,
        priority: 'NORMAL',
        originatorName: client.name,
        originatorAccount: `${bicPrefix}00014788901`,
        originatorBic: bic,
        originatorAddress: `${cor.fromCity}, ${cor.from}`,
        beneficiaryName: badName,
        beneficiaryAccount: `DE89370400440532013000`,
        beneficiaryBic: `COBADEFF`,
        beneficiaryAddress: `Frankfurt, DE`,
        orderingInstitutionBic: bic,
        intermediaryBic: `DEUTDEFF`,
        accountWithInstitutionBic: `COBADEFF`,
        amount: 2_900_000,
        currency: cor.currency.split('/')[0],
        paymentStatus: 'HELD',
        failureCode: 'NAMC',
        failureDescription: 'Name mismatch — umlauts and ampersand in registered name',
        retryCount: 0,
        queuePosition: 8,
        purposeOfPayment: 'Commercial payment',
        remittanceInfo: `COM-2024-${bicPrefix}-0147 machinery parts`,
      }
      return {
        id: `RPR-${bankId.toUpperCase()}-008`,
        paymentId: 'PMT-0147',
        uetr,
        exceptionType: 'NAMC_NAME_MISMATCH' as const,
        severity: 'medium' as const,
        raisedAt: '2024-01-15T14:34:18Z',
        amount: 2_900_000,
        currency: cor.currency.split('/')[0],
        originator: client.name,
        beneficiary: 'M\u00fcller & S\u00f6hne GmbH',
        corridor: `${cor.from}→${cor.to}`,
        rootCause: 'Beneficiary name contains German umlauts (\u00fc, \u00f6) and ampersand (&) — SWIFT character set does not support these characters',
        aiProposal: {
          id: `PROP-${bankId.toUpperCase()}-008`,
          proposedAt: '2024-01-15T14:34:25Z',
          fields: [
            { field: 'Beneficiary Name', original: badName, proposed: goodName, confidence: 0.90, source: 'German transliteration rules + Handelsregister lookup' },
            { field: 'Name Matching Override', original: 'STRICT', proposed: 'TRANSLITERATION_VERIFIED', confidence: 0.90, source: 'DIN 5007 transliteration standard' },
          ],
          confidence: 0.90,
          reasoning: `Applied DIN 5007 German transliteration: \u00fc\u2192ue, \u00f6\u2192oe, &\u2192und. Company verified in Handelsregister (HRB 12345). Both name variants are registered trade names.`,
          regulatoryNotes: 'Transliteration-based name repair. BATCH_APPROVAL eligible — low risk, standard character set normalization.',
          estimatedTime: '< 1 min after approval',
        },
        status: 'ai_proposed' as const,
        makerChecker: 'BATCH_APPROVAL' as const,
        originalPayment: buildPaymentSnapshot(base),
        repairedPayment: buildPaymentSnapshot({ ...base, beneficiaryName: goodName, paymentStatus: 'ACSP', failureCode: null, failureDescription: null }),
      }
    })(),

    // 009 — Account Closed — high — $19.7M — FOUR_EYES
    (() => {
      const cor = c(0)
      const client = cl(1)
      const uetr = `b7c8d9e0-0148-4009-b090-${bic.toLowerCase().slice(0, 12)}`
      const closedAcct = `OLDACC0148902`
      const newAcct = `NEWACC0148903`
      const base = {
        uetr,
        instructionId: `${bicPrefix}-240115-0148`,
        transactionRef: `E2E-${bicPrefix}-0148`,
        originatorName: client.name,
        originatorAccount: `${bicPrefix}00014888901`,
        originatorBic: bic,
        originatorAddress: `${cor.fromCity}, ${cor.from}`,
        beneficiaryName: `Pinnacle Holdings ${cor.to}`,
        beneficiaryAccount: closedAcct,
        beneficiaryBic: `PINN${cor.to}XX`,
        beneficiaryAddress: `${cor.toCity}, ${cor.to}`,
        orderingInstitutionBic: bic,
        intermediaryBic: `SCBLHKHH`,
        accountWithInstitutionBic: `PINN${cor.to}XX`,
        amount: 19_700_000,
        currency: cor.currency.split('/')[0],
        paymentStatus: 'RJCT',
        failureCode: 'ACMT03',
        failureDescription: 'Account closed — beneficiary migrated to new entity',
        retryCount: 2,
        queuePosition: 9,
        amlRiskScore: 22,
        purposeOfPayment: 'Loan repayment',
        remittanceInfo: `LOAN-2024-${bicPrefix}-0148 facility drawdown`,
      }
      return {
        id: `RPR-${bankId.toUpperCase()}-009`,
        paymentId: 'PMT-0148',
        uetr,
        exceptionType: 'ACMT_ACCOUNT_CLOSED' as const,
        severity: 'high' as const,
        raisedAt: '2024-01-15T14:34:45Z',
        amount: 19_700_000,
        currency: cor.currency.split('/')[0],
        originator: client.name,
        beneficiary: `Pinnacle Holdings ${cor.to}`,
        corridor: `${cor.from}→${cor.to}`,
        rootCause: 'Beneficiary account closed 2024-01-13 — entity migrated to new corporate structure with successor account',
        aiProposal: {
          id: `PROP-${bankId.toUpperCase()}-009`,
          proposedAt: '2024-01-15T14:34:52Z',
          fields: [
            { field: 'Beneficiary Account', original: closedAcct, proposed: newAcct, confidence: 0.88, source: 'Corporate action registry + account migration log' },
            { field: 'Beneficiary Name', original: `Pinnacle Holdings ${cor.to}`, proposed: `Pinnacle Holdings International ${cor.to}`, confidence: 0.88, source: 'Entity restructuring registry' },
          ],
          confidence: 0.88,
          reasoning: `Corporate action registry confirms entity restructuring effective 2024-01-13. Pinnacle Holdings migrated to Pinnacle Holdings International. Successor account verified with matching beneficial ownership and active KYC.`,
          regulatoryNotes: 'Account + name change requires FOUR_EYES approval. Enhanced due diligence flagged — AML risk score elevated (22/100) due to entity restructuring.',
          estimatedTime: '< 3 min after approval',
        },
        status: 'ai_proposed' as const,
        makerChecker: 'FOUR_EYES' as const,
        originalPayment: buildPaymentSnapshot(base),
        repairedPayment: buildPaymentSnapshot({ ...base, beneficiaryAccount: newAcct, beneficiaryName: `Pinnacle Holdings International ${cor.to}`, paymentStatus: 'ACSP', failureCode: null, failureDescription: null }),
      }
    })(),

    // 010 — Duplicate Detected — low — $1.4M — AUTONOMOUS_WITH_AUDIT
    (() => {
      const cor = c(1)
      const client = cl(2)
      const uetr = `c8d9e0f1-0149-4010-b100-${bic.toLowerCase().slice(0, 12)}`
      const base = {
        uetr,
        instructionId: `${bicPrefix}-240115-0149`,
        transactionRef: `E2E-${bicPrefix}-0149`,
        priority: 'BULK',
        originatorName: client.name,
        originatorAccount: `${bicPrefix}00014988901`,
        originatorBic: bic,
        originatorAddress: `${cor.fromCity}, ${cor.from}`,
        beneficiaryName: `Beneficiary-${cor.to}-149`,
        beneficiaryAccount: `BENE00014988902`,
        beneficiaryBic: `BENE${cor.to}XX`,
        beneficiaryAddress: `${cor.toCity}, ${cor.to}`,
        orderingInstitutionBic: bic,
        intermediaryBic: `UBSWCHZH`,
        accountWithInstitutionBic: `BENE${cor.to}XX`,
        amount: 1_400_000,
        currency: cor.currency.split('/')[0],
        paymentStatus: 'HELD',
        failureCode: 'DUPL',
        failureDescription: 'Duplicate detected — batch file resubmission',
        retryCount: 1,
        queuePosition: 10,
        purposeOfPayment: 'Payroll transfer',
        remittanceInfo: `PAY-2024-${bicPrefix}-0149 Jan payroll batch`,
      }
      return {
        id: `RPR-${bankId.toUpperCase()}-010`,
        paymentId: 'PMT-0149',
        uetr,
        exceptionType: 'DUPL_DUPLICATE_DETECTED' as const,
        severity: 'low' as const,
        raisedAt: '2024-01-15T14:35:10Z',
        amount: 1_400_000,
        currency: cor.currency.split('/')[0],
        originator: client.name,
        beneficiary: `Beneficiary-${cor.to}-149`,
        corridor: `${cor.from}→${cor.to}`,
        rootCause: `Batch file resubmitted by ${profile.cobolSystemAlias} after timeout — PMT-0149 is identical to PMT-0083 which settled successfully`,
        aiProposal: {
          id: `PROP-${bankId.toUpperCase()}-010`,
          proposedAt: '2024-01-15T14:35:17Z',
          fields: [
            { field: 'Duplicate Status', original: 'HELD_PENDING_REVIEW', proposed: 'CANCELLED_DUPLICATE', confidence: 0.96, source: 'Batch correlation + settlement log' },
            { field: 'Original Reference', original: 'NOT_LINKED', proposed: 'PMT-0083 (settled at 14:24:18Z)', confidence: 0.96, source: 'Settlement confirmation database' },
          ],
          confidence: 0.96,
          reasoning: `Batch file hash comparison confirms PMT-0149 is an exact duplicate of PMT-0083 from the same ${profile.cobolSystemAlias} batch. PMT-0083 settled successfully at 14:24:18Z. Zero risk cancellation.`,
          regulatoryNotes: 'Low-value duplicate from batch resubmission. AUTONOMOUS_WITH_AUDIT eligible — full audit trail logged automatically.',
          estimatedTime: 'Immediate (auto-apply eligible)',
        },
        status: 'ai_proposed' as const,
        makerChecker: 'AUTONOMOUS_WITH_AUDIT' as const,
        originalPayment: buildPaymentSnapshot(base),
        repairedPayment: buildPaymentSnapshot({ ...base, paymentStatus: 'CANC', failureCode: 'DUPL_CANCELLED', failureDescription: 'Duplicate cancelled — original PMT-0083 settled' }),
      }
    })(),
  ]

  return items
}
