'use client'

import { useApp } from '@/lib/store'
import { AnimatedCounter } from './animated-counter'

interface KPIProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  trend: 'good' | 'bad' | 'neutral'
}

function KPI({ label, value, prefix = '', suffix = '', decimals = 0, trend }: KPIProps) {
  const color = trend === 'good' ? 'text-[#0d9488]' : trend === 'bad' ? 'text-[#dc2626]' : 'text-[#0f172a]'

  return (
    <div className="flex flex-col items-center justify-center px-5 min-w-[120px]">
      <AnimatedCounter
        value={value}
        prefix={prefix}
        suffix={suffix}
        decimals={decimals}
        className={`text-[32px] font-extrabold leading-none tabular-nums ${color}`}
      />
      <span className="text-[13px] text-[#64748b] mt-1 whitespace-nowrap font-medium tracking-wide">
        {label}
      </span>
    </div>
  )
}

export function Scoreboard() {
  const { state } = useApp()
  const m = state.scoreboard
  const phase = state.workflow.incidentPhase
  const isPreIncident = phase === 'pre-incident'
  const resolved = phase === 'resolved'

  // Phase-aware status label
  const statusLabel = isPreIncident
    ? 'ALL SYSTEMS NOMINAL'
    : resolved
      ? 'RESOLVED'
      : 'ACTIVE INCIDENT'

  const statusColor = isPreIncident
    ? 'text-[#0d9488]'
    : resolved
      ? 'text-[#0d9488]'
      : 'text-[#dc2626]'

  const dotClass = isPreIncident
    ? 'bg-[#0d9488] ambient-breathe'
    : resolved
      ? 'bg-[#0d9488]'
      : 'bg-[#dc2626] status-pulse'

  return (
    <div
      className="w-full h-16 shrink-0 flex items-center justify-between px-6 border-b border-[#e2e8f0]"
      style={{ background: '#ffffff' }}
    >
      <div className="flex items-center divide-x divide-[#e2e8f0]">
        {isPreIncident ? (
          /* Pre-incident: show healthy baseline metrics */
          <>
            <KPI label="Value at Risk" value={0} prefix="$" suffix="M" trend="good" />
            <KPI label="Payments Stuck" value={0} trend="good" />
            <KPI label="SLA Exposure" value={m.slaBreach} suffix="m" trend="neutral" />
            <div className="flex flex-col items-center justify-center px-5">
              <span className="text-[32px] font-extrabold leading-none tabular-nums text-[#0d9488] ambient-breathe">
                98
              </span>
              <span className="text-[13px] text-[#64748b] mt-1 whitespace-nowrap font-medium tracking-wide">
                AI Resilience Score
              </span>
            </div>
            <KPI label="STP Rate" value={m.stpRateRestored} suffix="%" decimals={1} trend="good" />
            <div className="flex flex-col items-center justify-center px-5">
              <div className="flex items-center gap-2">
                <span className="text-[24px] font-bold text-[#64748b]/30 tabular-nums">{m.mttrBefore}m</span>
                <span className="text-[#64748b] text-lg">→</span>
                <span className="text-[32px] font-extrabold leading-none tabular-nums text-[#64748b]/50">{m.mttrAfter}m</span>
              </div>
              <span className="text-[13px] text-[#64748b] mt-1 font-medium tracking-wide">MTTR</span>
            </div>
          </>
        ) : (
          /* Active incident / resolved: show live metrics */
          <>
            <KPI label="Value at Risk" value={m.valueAtRisk} prefix="$" suffix="M" trend={m.valueAtRisk > 50 ? 'bad' : 'good'} />
            <KPI label="Payments Stuck" value={m.paymentsStuck} trend={m.paymentsStuck > 10 ? 'bad' : 'good'} />
            <KPI label="SLA Exposure" value={m.slaBreach} suffix="m" trend={m.slaBreach < 20 ? 'bad' : 'neutral'} />
            <KPI label="Investigations Avoided" value={m.investigationsAvoided} trend={m.investigationsAvoided > 0 ? 'good' : 'neutral'} />
            <KPI label="Ops Hours Saved" value={m.opsHoursSaved} trend={m.opsHoursSaved > 0 ? 'good' : 'neutral'} />

            {/* MTTR special */}
            <div className="flex flex-col items-center justify-center px-5">
              <div className="flex items-center gap-2">
                <span className="text-[24px] font-bold text-[#dc2626]/50 line-through tabular-nums">{m.mttrBefore}m</span>
                <span className="text-[#64748b] text-lg">→</span>
                <AnimatedCounter
                  value={m.mttrAfter}
                  suffix="m"
                  className="text-[32px] font-extrabold leading-none tabular-nums text-[#0d9488]"
                />
              </div>
              <span className="text-[13px] text-[#64748b] mt-1 font-medium tracking-wide">MTTR</span>
            </div>

            <KPI label="STP Rate" value={m.stpRateRestored} suffix="%" decimals={1} trend={m.stpRateRestored > 95 ? 'good' : 'bad'} />
          </>
        )}
      </div>

      {/* Status pill */}
      <div className="flex items-center gap-3 pl-6">
        <div className={`w-3 h-3 rounded-full ${dotClass}`} />
        <span className={`text-[16px] font-bold tracking-wide ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
    </div>
  )
}
