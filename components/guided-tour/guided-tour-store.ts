import { create } from 'zustand'
import { TOUR_STEPS } from './tour-steps'

interface TourStore {
  isActive: boolean
  currentStep: number
  isNavigating: boolean
  startTour: () => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  setNavigating: (v: boolean) => void
}

export const useTourStore = create<TourStore>((set, get) => ({
  isActive: false,
  currentStep: 0,
  isNavigating: false,

  startTour: () => set({ isActive: true, currentStep: 0, isNavigating: false }),

  endTour: () => set({ isActive: false, currentStep: 0, isNavigating: false }),

  nextStep: () => {
    const { currentStep } = get()
    if (currentStep < TOUR_STEPS.length - 1) {
      set({ currentStep: currentStep + 1 })
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  setNavigating: (v) =>
    set((s) => (s.isNavigating === v ? s : { isNavigating: v })),
}))
