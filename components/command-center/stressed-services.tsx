'use client'

import { useApp } from '@/lib/store'

interface ServiceRow {
  name: string
  icon: string
  latency: number
  errorRate: number
  trend: 'up' | 'down' | 'stable'
}

export function StressedServices() {
  const { state } = useApp()
  const isIncident = state.workflow.current_step >= 0 && state.workflow.current_step < 8

  const services: ServiceRow[] = isIncident
    ? [
        { name: 'sanctions-svc', icon: '🔍', latency: 3847, errorRate: 47.2, trend: 'up' },
        { name: state.bank.cobolSystemAlias, icon: '🖥️', latency: 2100, errorRate: 31.5, trend: 'up' },
        { name: 'fx-engine', icon: '💱', latency: 890, errorRate: 8.3, trend: 'up' },
        { name: 'routing-svc', icon: '🔀', latency: 120, errorRate: 1.2, trend: 'stable' },
      ]
    : [
        { name: 'sanctions-svc', icon: '🔍', latency: 82, errorRate: 0.1, trend: 'stable' },
        { name: state.bank.cobolSystemAlias, icon: '🖥️', latency: 145, errorRate: 0.3, trend: 'stable' },
        { name: 'fx-engine', icon: '💱', latency: 45, errorRate: 0.0, trend: 'down' },
        { name: 'routing-svc', icon: '🔀', latency: 32, errorRate: 0.0, trend: 'stable' },
      ]

  const maxLat = Math.max(...services.map((s) => s.latency))

  return (
    <div className="glass p-4">
      <h4 className="text-[16px] font-bold text-[#0f172a] mb-3">Top Stressed Services</h4>
      <div className="space-y-2.5">
        {services.map((svc) => {
          const barPct = Math.min((svc.latency / maxLat) * 100, 100)
          const barColor = svc.errorRate > 20 ? '#dc2626' : svc.errorRate > 5 ? '#d97706' : '#0d9488'
          const trendIcon = svc.trend === 'up' ? '↑' : svc.trend === 'down' ? '↓' : '→'
          const trendColor = svc.trend === 'up' ? 'text-[#dc2626]' : svc.trend === 'down' ? 'text-[#0d9488]' : 'text-[#64748b]'
          return (
            <div key={svc.name} className="flex items-center gap-3">
              <span className="text-[16px] shrink-0">{svc.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[14px] font-medium text-[#0f172a] truncate">{svc.name}</span>
                  <span className="text-[13px] font-mono text-[#64748b] shrink-0 ml-2">
                    {svc.latency >= 1000 ? `${(svc.latency / 1000).toFixed(1)}s` : `${svc.latency}ms`}
                  </span>
                </div>
                <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${barPct}%`, background: barColor }}
                  />
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1 w-16">
                <span className="text-[13px] font-mono" style={{ color: barColor }}>
                  {svc.errorRate}%
                </span>
                <span className={`text-[14px] font-bold ${trendColor}`}>{trendIcon}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
