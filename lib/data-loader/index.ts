import { BankId, BankProfile, Scenario, AgentCard, PaymentRecord } from '@/types'

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
