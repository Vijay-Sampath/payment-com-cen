'use client'

import { ReactNode } from 'react'
import { useApp } from '@/lib/store'
import { Scoreboard } from '@/components/shared/scoreboard'
import { BankSwitcher } from '@/components/shared/bank-switcher'
import { NavSidebar } from '@/components/shared/nav-sidebar'
import { DirectorPanel } from '@/components/director-panel/director-panel'
import { ToastContainer } from '@/components/shared/toast'
import { TourToggle } from '@/components/guided-tour/tour-toggle'
import { GuidedTour } from '@/components/guided-tour/guided-tour'

function LayoutInner({ children }: { children: ReactNode }) {
  const { state, bankTransitioning } = useApp()

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f8fafc]">
      {/* Top bar: Bank + BIC + Switcher */}
      <div
        className="shrink-0 flex items-center justify-between px-6 h-12 border-b border-[#e2e8f0]"
        style={{ background: '#ffffff' }}
      >
        <div className="flex items-center gap-5">
          <span className={`text-[16px] font-bold text-[#0d9488] tracking-wide transition-opacity duration-300 ${bankTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {state.bank.platformName}
          </span>
          <span className={`text-[13px] font-mono text-[#64748b] transition-opacity duration-300 ${bankTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {state.bank.bicFamily[0]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-[13px] text-[#64748b] font-medium transition-opacity duration-300 ${bankTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {state.bank.riskPosture}
          </span>
          <BankSwitcher />
          <TourToggle />
        </div>
      </div>

      {/* Scoreboard: fixed 64px height, always visible */}
      <Scoreboard />

      {/* Main content area with bank-switch crossfade */}
      <div className="flex flex-1 overflow-hidden">
        <NavSidebar />
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${
            bankTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
          }`}
        >
          {children}
        </main>
      </div>

      {/* Director Panel */}
      <DirectorPanel />

      {/* Toast notifications */}
      <ToastContainer />

      {/* Guided tour overlay */}
      <GuidedTour />
    </div>
  )
}

export function ClientLayout({ children }: { children: ReactNode }) {
  return <LayoutInner>{children}</LayoutInner>
}
