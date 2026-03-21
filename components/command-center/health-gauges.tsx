'use client'

import { useApp } from '@/lib/store'
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'

const rails = [
  { name: 'SWIFT', icon: '🌐' },
  { name: 'ACH', icon: '🏦' },
  { name: 'SEPA', icon: '🇪🇺' },
  { name: 'Fedwire', icon: '🇺🇸' },
  { name: 'RTP', icon: '⚡' },
  { name: 'CHIPS', icon: '💎' },
]

function Gauge({ name, icon, score }: { name: string; icon: string; score: number }) {
  const color = score >= 90 ? '#0d9488' : score >= 70 ? '#d97706' : '#dc2626'
  const data = [{ value: score, fill: color }]

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <RadialBarChart
          width={90} height={90}
          innerRadius="70%" outerRadius="100%"
          data={data} startAngle={90} endAngle={-270}
          barSize={6}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: 'rgba(226, 232, 240, 0.5)' }}
            dataKey="value"
            angleAxisId={0}
            cornerRadius={4}
          />
        </RadialBarChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[20px] font-bold tabular-nums" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[14px]">{icon}</span>
        <span className="text-[13px] font-semibold text-[#0f172a]">{name}</span>
      </div>
    </div>
  )
}

export function HealthGauges() {
  const { state } = useApp()
  const isIncident = state.workflow.current_step >= 0 && state.workflow.current_step < 8

  // Deterministic health scores per rail (no Math.random — avoids hydration mismatch)
  const baseScores: Record<string, number> = {
    SWIFT: 98, ACH: 97, SEPA: 99, Fedwire: 96, RTP: 98, CHIPS: 97,
  }
  const scores = rails.map((r) => {
    let score = baseScores[r.name] ?? 97
    if (isIncident && r.name === 'SWIFT') score = 47
    if (isIncident && r.name === 'CHIPS') score = 68
    if (isIncident && r.name === 'Fedwire') score = 82
    return { ...r, score }
  })

  return (
    <div className="glass p-4">
      <h4 className="text-[16px] font-bold text-[#0f172a] mb-3">Rail Health</h4>
      <div className="grid grid-cols-3 gap-3">
        {scores.map((r) => (
          <Gauge key={r.name} name={r.name} icon={r.icon} score={r.score} />
        ))}
      </div>
    </div>
  )
}
