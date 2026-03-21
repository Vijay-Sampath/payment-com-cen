'use client'

import { useApp } from '@/lib/store'
import { BankId } from '@/types'

const banks: { id: BankId; label: string }[] = [
  { id: 'bofa', label: 'BofA' },
  { id: 'citi', label: 'Citi' },
  { id: 'jpmorgan', label: 'JPM' },
  { id: 'wellsfargo', label: 'WF' },
]

export function BankSwitcher() {
  const { state, switchBank } = useApp()

  return (
    <div className="flex items-center gap-1">
      {banks.map((b) => (
        <button
          key={b.id}
          onClick={() => switchBank(b.id)}
          className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-200 ${
            state.bank.id === b.id
              ? 'bg-[#0d9488]/10 text-[#0d9488] border border-[#0d9488]/40'
              : 'text-[#64748b] border border-transparent hover:bg-[#f1f5f9] hover:text-[#0f172a]'
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}
