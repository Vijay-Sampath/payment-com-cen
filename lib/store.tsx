'use client'

import { create } from 'zustand'
import {
  BankId,
  BankProfile,
  Scenario,
  WorkflowState,
  ScoreboardMetrics,
  DirectorState,
  AuditEntry,
} from '@/types'
import { getBankProfile, getScenario, getAgentSteps } from '@/lib/data-loader'
import { WorkflowEngine, INITIAL_SCOREBOARD } from '@/lib/workflow/engine'
import { PlaybackController } from '@/lib/workflow/playback'

// --- State shape (backward compat with screens using `const { state } = useApp()`) ---
interface AppState {
  bank: BankProfile
  scenario: Scenario
  workflow: WorkflowState
  scoreboard: ScoreboardMetrics
  director: DirectorState
}

// --- Actions ---
type Action =
  | { type: 'SET_BANK'; bankId: BankId }
  | { type: 'ADVANCE_STEP' }
  | { type: 'APPROVE_HITL' }
  | { type: 'RESET_WORKFLOW' }
  | { type: 'COMPLETE_WORKFLOW' }
  | { type: 'SET_AUTOPLAY'; enabled: boolean }
  | { type: 'SET_PLAYBACK_SPEED'; speed: number }
  | { type: 'TOGGLE_DIRECTOR' }
  | { type: 'SET_DIRECTOR_OPEN'; open: boolean }
  | { type: 'UPDATE_SCOREBOARD'; metrics: Partial<ScoreboardMetrics> }
  | { type: 'JUMP_TO_STEP'; step: number }
  | { type: 'START_WORKFLOW' }

// --- Context type (must match old AppContextType for backward compat) ---
interface AppContextType {
  state: AppState
  bankTransitioning: boolean
  dispatch: (action: Action) => void
  switchBank: (bankId: BankId) => void
  startWorkflow: () => void
  advanceStep: () => void
  approveHitl: (optionTitle?: string) => void
  resetWorkflow: () => void
  jumpToStep: (step: number) => void
  toggleDirector: () => void
  setSelectedRemediation: (optionId: string) => void
  // Expose engine and playback for director panel
  _engine: WorkflowEngine | null
  _playback: PlaybackController | null
}

function initState(bankId: BankId): AppState {
  const bank = getBankProfile(bankId)
  const scenario = getScenario(bankId)

  // Build initial workflow state from engine
  const engine = new WorkflowEngine(
    scenario.id,
    bankId,
    getAgentSteps(bankId)
  )

  return {
    bank,
    scenario,
    workflow: engine.getState(),
    scoreboard: { ...INITIAL_SCOREBOARD },
    director: {
      isOpen: false,
      selectedBank: bankId,
      selectedScenario: 'sanctions-cascade',
      currentStep: -1,
      autoPlay: false,
      playbackSpeed: 1,
      liveNarration: false,
      apiKeyPresent: false,
    },
  }
}

function createEngine(bankId: BankId): WorkflowEngine {
  const scenario = getScenario(bankId)
  return new WorkflowEngine(
    scenario.id,
    bankId,
    getAgentSteps(bankId)
  )
}

// Sync engine state back to the Zustand store
function syncFromEngine(engine: WorkflowEngine, get: () => AppContextType): Partial<AppContextType> {
  const engineState = engine.getState()
  const scoreboard = engine.getScoreboard()
  const currentState = get().state
  return {
    state: {
      ...currentState,
      workflow: engineState,
      scoreboard,
      director: {
        ...currentState.director,
        currentStep: engineState.current_step,
      },
    },
  }
}

export const useApp = create<AppContextType>((set, get) => {
  // Create initial engine and playback
  let engine = createEngine('bofa')
  let bankTransitionTimer: ReturnType<typeof setTimeout> | null = null
  const onStateChange = () => {
    set(syncFromEngine(engine, get))
    // If playback stopped (e.g., HITL or done), update autoPlay
    const playback = get()._playback
    if (playback && !playback.getIsPlaying()) {
      set((s) => ({
        state: { ...s.state, director: { ...s.state.director, autoPlay: false } },
      }))
    }
  }
  let playback = new PlaybackController(engine, onStateChange)

  return {
    state: initState('bofa'),
    bankTransitioning: false,
    _engine: engine,
    _playback: playback,

    dispatch: (action: Action) => {
      // Backward compat: handle dispatch({ type, ... }) calls from screens
      switch (action.type) {
        case 'SET_AUTOPLAY': {
          const pb = get()._playback
          if (action.enabled) {
            pb?.play()
          } else {
            pb?.pause()
          }
          set((s) => ({
            state: { ...s.state, director: { ...s.state.director, autoPlay: action.enabled } },
          }))
          break
        }
        case 'SET_PLAYBACK_SPEED': {
          const pb = get()._playback
          pb?.setSpeed(action.speed)
          set((s) => ({
            state: { ...s.state, director: { ...s.state.director, playbackSpeed: action.speed } },
          }))
          break
        }
        case 'TOGGLE_DIRECTOR':
          set((s) => ({
            state: { ...s.state, director: { ...s.state.director, isOpen: !s.state.director.isOpen } },
          }))
          break
        case 'SET_DIRECTOR_OPEN':
          set((s) => ({
            state: { ...s.state, director: { ...s.state.director, isOpen: action.open } },
          }))
          break
        case 'UPDATE_SCOREBOARD':
          set((s) => ({
            state: { ...s.state, scoreboard: { ...s.state.scoreboard, ...action.metrics } },
          }))
          break
        case 'SET_BANK':
          get().switchBank(action.bankId)
          break
        case 'ADVANCE_STEP':
          get().advanceStep()
          break
        case 'APPROVE_HITL':
          get().approveHitl()
          break
        case 'RESET_WORKFLOW':
          get().resetWorkflow()
          break
        case 'START_WORKFLOW':
          get().startWorkflow()
          break
        case 'JUMP_TO_STEP':
          get().jumpToStep(action.step)
          break
        case 'COMPLETE_WORKFLOW': {
          const eng = get()._engine
          if (eng) {
            const state = eng.getState()
            eng.jumpToStep(state.steps.length - 1)
            eng.nextStep() // completes it
            set(syncFromEngine(eng, get))
          }
          break
        }
      }
    },

    switchBank: (bankId: BankId) => {
      // Start transition animation
      set({ bankTransitioning: true })
      if (bankTransitionTimer) {
        clearTimeout(bankTransitionTimer)
        bankTransitionTimer = null
      }

      // Destroy old playback
      playback.destroy()

      // Create new engine for the bank
      engine = createEngine(bankId)
      playback = new PlaybackController(engine, onStateChange)

      // Brief delay for crossfade effect
      bankTransitionTimer = setTimeout(() => {
        set({
          state: initState(bankId),
          bankTransitioning: false,
          _engine: engine,
          _playback: playback,
        })
        bankTransitionTimer = null
      }, 150)
    },

    startWorkflow: () => {
      engine.start()
      set(syncFromEngine(engine, get))
    },

    advanceStep: () => {
      engine.nextStep()
      set(syncFromEngine(engine, get))
    },

    approveHitl: (optionTitle?: string) => {
      engine.approveHitl(optionTitle)
      set(syncFromEngine(engine, get))
    },

    setSelectedRemediation: (optionId: string) => {
      engine.setSelectedRemediation(optionId)
      set(syncFromEngine(engine, get))
    },

    resetWorkflow: () => {
      playback.destroy()
      engine.reset()
      playback = new PlaybackController(engine, onStateChange)
      set({
        ...syncFromEngine(engine, get),
        _playback: playback,
        state: {
          ...get().state,
          workflow: engine.getState(),
          scoreboard: engine.getScoreboard(),
          director: { ...get().state.director, currentStep: -1, autoPlay: false },
        },
      })
    },

    jumpToStep: (step: number) => {
      engine.jumpToStep(step)
      set(syncFromEngine(engine, get))
    },

    toggleDirector: () => {
      set((s) => ({
        state: { ...s.state, director: { ...s.state.director, isOpen: !s.state.director.isOpen } },
      }))
    },
  }
})

// Re-export AppProvider as a no-op wrapper for backward compat
// (Zustand doesn't need a provider, but some code may still import it)
export function AppProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
