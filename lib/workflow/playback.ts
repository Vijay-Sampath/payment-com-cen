import { WorkflowEngine } from './engine'

export class PlaybackController {
  private engine: WorkflowEngine
  private timer: ReturnType<typeof setTimeout> | null = null
  private speed: number = 1
  private isPlaying: boolean = false
  private onStateChange: (() => void) | null = null

  constructor(engine: WorkflowEngine, onStateChange?: () => void) {
    this.engine = engine
    this.onStateChange = onStateChange ?? null
  }

  play(): void {
    if (this.isPlaying && this.timer) {
      return
    }
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.isPlaying = true
    const state = this.engine.getState()
    if (state.current_step === -1) {
      this.engine.start()
      this.onStateChange?.()
    } else {
      this.engine.resume()
    }
    this.scheduleNext()
  }

  pause(): void {
    this.isPlaying = false
    this.engine.pause()
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  toggle(): void {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  setSpeed(speed: number): void {
    this.speed = speed
    // Reschedule if currently playing
    if (this.isPlaying && this.timer) {
      clearTimeout(this.timer)
      this.timer = null
      this.scheduleNext()
    }
  }

  getSpeed(): number {
    return this.speed
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  setEngine(engine: WorkflowEngine): void {
    this.destroy()
    this.engine = engine
    this.isPlaying = false
  }

  private scheduleNext(): void {
    if (!this.isPlaying) return

    const state = this.engine.getState()

    // Stop if HITL required
    if (state.requires_hitl) {
      this.isPlaying = false
      this.onStateChange?.()
      return
    }

    // Stop if workflow is done
    if (state.current_step >= state.steps.length - 1 && state.steps[state.steps.length - 1]?.status === 'completed') {
      this.isPlaying = false
      this.onStateChange?.()
      return
    }

    // Get duration from current step, fallback to 2000ms
    const currentStep = state.steps[state.current_step]
    const baseDuration = currentStep?.duration_ms ?? 2000
    // Cap display duration at 3000ms for demo purposes (some steps like execute have 180s real duration)
    const displayDuration = Math.min(baseDuration, 3000)
    const delay = displayDuration / this.speed

    this.timer = setTimeout(() => {
      this.timer = null
      const currentState = this.engine.getState()

      if (currentState.current_step < currentState.steps.length - 1) {
        this.engine.nextStep()
        this.onStateChange?.()
        this.scheduleNext()
      } else {
        // Advance one last time to complete the last step
        this.engine.nextStep()
        this.isPlaying = false
        this.onStateChange?.()
      }
    }, delay)
  }

  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.isPlaying = false
  }
}
