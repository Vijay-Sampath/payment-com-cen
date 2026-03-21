import { describe, expect, it } from 'vitest'
import { getAgentSteps, getBankProfile, getScenario } from '@/lib/data-loader'

describe('data loader', () => {
  it('returns deterministic payment data for the same bank across calls', () => {
    const a = getScenario('bofa')
    const b = getScenario('bofa')

    expect(a.payments).toHaveLength(142)
    expect(b.payments).toHaveLength(142)
    expect(a.payments).toEqual(b.payments)
    expect(a.logEntries).toEqual(b.logEntries)
  })

  it('hydrates bank-specific content in scenario and agent text', () => {
    const profile = getBankProfile('citi')
    const scenario = getScenario('citi')
    const steps = getAgentSteps('citi')

    expect(scenario.description).toContain(profile.cobolSystemAlias)
    expect(steps).toHaveLength(9)
    expect(steps.every((s) => s.staticNarrative.length > 0)).toBe(true)
    expect(steps.some((s) => s.finding_summary.includes(profile.cobolSystemAlias))).toBe(true)
  })
})
