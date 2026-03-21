'use client'

import { useMemo, useId } from 'react'
import { useApp } from '@/lib/store'
import { Corridor } from '@/types'

function project(lat: number, lng: number, W: number, H: number): [number, number] {
  const x = ((lng + 180) / 360) * W
  const latRad = (lat * Math.PI) / 180
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
  const y = H / 2 - (mercN / Math.PI) * (H / 2) * 0.75
  return [x, y]
}

function arcPath(from: [number, number], to: [number, number], W: number, H: number): string {
  const [x1, y1] = project(from[0], from[1], W, H)
  const [x2, y2] = project(to[0], to[1], W, H)
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const cpx = mx - dy * 0.3
  const cpy = my + dx * 0.3 - dist * 0.12
  return `M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`
}

export function CorridorMap() {
  const { state } = useApp()
  const W = 880
  const H = 440

  const isIncident = state.workflow.current_step >= 0 && state.workflow.current_step < 8
  const corridors: Corridor[] = useMemo(
    () =>
      state.bank.primaryCorridors.map((c, i) =>
        isIncident && i < 3 ? { ...c, status: i === 0 ? 'critical' as const : 'degraded' as const } : c
      ),
    [state.bank.primaryCorridors, isIncident]
  )

  const uid = useId().replace(/:/g, '')
  const isResolved = state.workflow.current_step >= 8

  const statusColor = (s: string) =>
    s === 'healthy' ? '#0d9488' : s === 'degraded' ? '#d97706' : '#dc2626'

  // Generate particle positions for each corridor
  const particles = useMemo(() => {
    return corridors.map((c, i) => {
      const count = c.status === 'healthy' ? 3 : c.status === 'degraded' ? 2 : 1
      const speed = c.status === 'healthy' ? 3 : c.status === 'degraded' ? 5 : 8
      return Array.from({ length: count }, (_, j) => ({
        delay: (j * speed) / count,
        duration: speed,
        color: statusColor(c.status),
        size: c.status === 'critical' ? 3 : 4,
      }))
    })
  }, [corridors])

  return (
    <div className="glass h-full p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[18px] font-bold text-[#0f172a]">
            Payment Corridor Health
          </h3>
          <p className="text-[13px] text-[#64748b] mt-0.5">
            {state.bank.name} global estate — {corridors.length} active corridors
          </p>
        </div>
        <div className="flex items-center gap-4 text-[13px]">
          {(['healthy', 'degraded', 'critical'] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[#64748b]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor(s) }} />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id={`arc-glow-${uid}`}>
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`particle-glow-${uid}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={(i * H) / 7} x2={W} y2={(i * H) / 7}
            stroke="#e2e8f0" strokeWidth={0.5} opacity={0.6} />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`v${i}`} x1={(i * W) / 9} y1={0} x2={(i * W) / 9} y2={H}
            stroke="#e2e8f0" strokeWidth={0.5} opacity={0.6} />
        ))}

        {/* Arcs + Particles */}
        {corridors.map((c, i) => {
          const d = arcPath(c.fromCoords, c.toCoords, W, H)
          const col = statusColor(c.status)
          const cls = c.status === 'healthy' ? 'arc-flowing' : c.status === 'degraded' ? 'arc-degraded' : 'arc-critical'
          const pathId = `arc-${uid}-${i}`
          return (
            <g key={i}>
              {/* Arc glow + main stroke */}
              <path id={pathId} d={d} fill="none" stroke={col} strokeWidth={4} opacity={0.12} filter={`url(#arc-glow-${uid})`} />
              <path d={d} fill="none" stroke={col} strokeWidth={2} opacity={0.85} className={cls} />
              {/* Flowing particles along arc */}
              {particles[i].map((p, j) => (
                <circle key={`p-${i}-${j}`} r={p.size} fill={p.color} filter={`url(#particle-glow-${uid})`} opacity={0.9}>
                  <animateMotion
                    dur={`${p.duration}s`}
                    repeatCount="indefinite"
                    begin={`${p.delay}s`}
                  >
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur={`${p.duration}s`} repeatCount="indefinite" begin={`${p.delay}s`} />
                </circle>
              ))}
            </g>
          )
        })}

        {/* Nodes */}
        {corridors.flatMap((c, i) => {
          const pairs: Array<{ coords: [number, number]; city: string; status: string }> = [
            { coords: c.fromCoords, city: c.fromCity, status: c.status },
            { coords: c.toCoords, city: c.toCity, status: c.status },
          ]
          return pairs.map((p, j) => {
            const [cx, cy] = project(p.coords[0], p.coords[1], W, H)
            const col = statusColor(p.status)
            return (
              <g key={`${i}-${j}`}>
                <circle cx={cx} cy={cy} r={5} fill={col} opacity={0.9} />
                <circle cx={cx} cy={cy} r={10} fill={col} opacity={0.15}>
                  <animate attributeName="r" from="10" to="20" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.15" to="0" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <text x={cx} y={cy - 14} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="Inter" fontWeight="500">
                  {p.city}
                </text>
              </g>
            )
          })
        })}

        {/* Corridor labels on arcs */}
        {corridors.map((c, i) => {
          const [x1, y1] = project(c.fromCoords[0], c.fromCoords[1], W, H)
          const [x2, y2] = project(c.toCoords[0], c.toCoords[1], W, H)
          const mx = (x1 + x2) / 2
          const my = (y1 + y2) / 2 - 20
          return (
            <text key={`lbl-${i}`} x={mx} y={my} textAnchor="middle" fill="#64748b"
              fontSize="10" fontFamily="Inter" opacity={0.7}>
              {c.currency} · {c.volume}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
