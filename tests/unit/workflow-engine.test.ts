import { beforeEach, describe, expect, it } from 'vitest'
import { WorkflowEngine } from '@/lib/workflow/engine'
import { getAgentSteps, getScenario } from '@/lib/data-loader'

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine

  beforeEach(() => {
    const scenario = getScenario('bofa')
    engine = new WorkflowEngine(scenario.id, 'bofa', getAgentSteps('bofa'))
  })

  it('starts at step 0 with active status', () => {
    engine.start()
    const state = engine.getState()

    expect(state.current_step).toBe(0)
    expect(state.steps[0].status).toBe('active')
    expect(state.is_running).toBe(true)
    expect(state.incidentPhase).toBe('detecting')
  })

  it('halts at HITL step and resumes after approval', () => {
    engine.start()
    for (let i = 0; i < 6; i++) {
      engine.nextStep()
    }

    let state = engine.getState()
    expect(state.current_step).toBe(6)
    expect(state.requires_hitl).toBe(true)
    expect(state.is_running).toBe(false)

    engine.approveHitl('Option B')
    engine.nextStep()

    state = engine.getState()
    expect(state.hitl_approved).toBe(true)
    expect(state.requires_hitl).toBe(false)
    expect(state.current_step).toBe(7)
  })

  it('completes workflow and records audit entries', () => {
    engine.start()

    for (let i = 0; i < 12; i++) {
      const state = engine.getState()
      if (state.requires_hitl && !state.hitl_approved) {
        engine.approveHitl('Option A')
      }
      if (!engine.getState().completed_at) {
        engine.nextStep()
      }
    }

    const finalState = engine.getState()
    expect(finalState.completed_at).toBeDefined()
    expect(finalState.incidentPhase).toBe('resolved')
    expect(finalState.steps.every((s) => s.status === 'completed')).toBe(true)
    expect(finalState.auditLog.length).toBeGreaterThan(0)
  })

  it('reset returns workflow to pre-incident baseline', () => {
    engine.start()
    engine.nextStep()
    engine.reset()

    const state = engine.getState()
    expect(state.current_step).toBe(-1)
    expect(state.incidentPhase).toBe('pre-incident')
    expect(state.requires_hitl).toBe(false)
    expect(state.hitl_approved).toBe(false)
    expect(state.steps.every((s) => s.status === 'pending')).toBe(true)
    expect(state.auditLog).toHaveLength(0)
  })
})
