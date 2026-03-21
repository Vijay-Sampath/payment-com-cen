import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { WorkflowEngine } from '@/lib/workflow/engine'
import { PlaybackController } from '@/lib/workflow/playback'
import { getAgentSteps, getScenario } from '@/lib/data-loader'

describe('PlaybackController', () => {
  let engine: WorkflowEngine
  let playback: PlaybackController

  beforeEach(() => {
    vi.useFakeTimers()
    const scenario = getScenario('bofa')
    engine = new WorkflowEngine(scenario.id, 'bofa', getAgentSteps('bofa'))
    playback = new PlaybackController(engine)
  })

  afterEach(() => {
    playback.destroy()
    vi.useRealTimers()
  })

  it('ignores duplicate play calls while already playing', () => {
    playback.play()
    playback.play()

    vi.advanceTimersToNextTimer()
    expect(engine.getState().current_step).toBe(1)
  })

  it('pauses automatically when HITL gate is reached', () => {
    playback.play()

    for (let i = 0; i < 10; i++) {
      vi.advanceTimersToNextTimer()
      if (engine.getState().requires_hitl) break
    }

    expect(engine.getState().requires_hitl).toBe(true)
    expect(playback.getIsPlaying()).toBe(false)
  })
})
