'use client'

import { useApp } from '@/lib/store'
import { ExceptionType } from '@/types'
import { RepairQueueItem } from './repair-queue-item'

const filters: { label: string; value: ExceptionType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'BIC', value: 'RJCT08_BIC_INVALID' },
  { label: 'Name', value: 'NAMC_NAME_MISMATCH' },
  { label: 'Address', value: 'RJCT11_ADDRESS_UNSTRUCTURED' },
  { label: 'Duplicate', value: 'DUPL_DUPLICATE_DETECTED' },
  { label: 'Account', value: 'ACMT_ACCOUNT_CLOSED' },
  { label: 'Currency', value: 'CURR_CURRENCY_MISMATCH' },
]

export function ExceptionQueuePanel() {
  const { state, dispatch } = useApp()
  const { queue, selectedItemId, filter } = state.repair

  const filtered = filter === 'all'
    ? queue
    : queue.filter((item) => item.exceptionType === filter)

  const severityCounts = {
    critical: queue.filter((i) => i.severity === 'critical').length,
    high: queue.filter((i) => i.severity === 'high').length,
    medium: queue.filter((i) => i.severity === 'medium').length,
    low: queue.filter((i) => i.severity === 'low').length,
  }

  return (
    <div className="glass h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#e2e8f0]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold text-[#0f172a]">Exception Queue</h3>
          <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#0f172a]/5 text-[#0f172a]">
            {filtered.length}
          </span>
        </div>

        {/* Severity summary */}
        <div className="flex gap-2 mb-3">
          {severityCounts.critical > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#dc2626]/10 text-[#dc2626]">
              {severityCounts.critical} Critical
            </span>
          )}
          {severityCounts.high > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#d97706]/10 text-[#d97706]">
              {severityCounts.high} High
            </span>
          )}
          {severityCounts.medium > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#2563eb]/10 text-[#2563eb]">
              {severityCounts.medium} Medium
            </span>
          )}
          {severityCounts.low > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#64748b]/10 text-[#64748b]">
              {severityCounts.low} Low
            </span>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => dispatch({ type: 'SET_REPAIR_FILTER', filter: f.value })}
              className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-all ${
                filter === f.value
                  ? 'bg-[#0d9488]/10 text-[#0d9488] border border-[#0d9488]/30'
                  : 'bg-[#f1f5f9] text-[#64748b] border border-transparent hover:border-[#cbd5e1]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map((item) => (
          <RepairQueueItem
            key={item.id}
            item={item}
            selected={selectedItemId === item.id}
            onClick={() => dispatch({ type: 'SELECT_REPAIR_ITEM', itemId: item.id })}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-[#64748b] text-[13px]">
            No exceptions match this filter
          </div>
        )}
      </div>
    </div>
  )
}
