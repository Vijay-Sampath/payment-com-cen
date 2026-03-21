'use client'

import { useTourStore } from './guided-tour-store'

export function TourToggle() {
  const { isActive, startTour, endTour } = useTourStore()

  return (
    <button
      onClick={isActive ? endTour : startTour}
      className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
        isActive
          ? 'bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/40 hover:bg-[#dc2626]/20'
          : 'bg-[#0d9488]/10 text-[#0d9488] border border-[#0d9488]/40 hover:bg-[#0d9488]/20'
      }`}
    >
      {isActive ? 'End Tour' : 'Tour'}
    </button>
  )
}
