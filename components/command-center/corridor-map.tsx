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

/** Simplified continent coastlines as [lat, lng] arrays for the world map background */
const CONTINENTS: Array<{ name: string; coords: [number, number][] }> = [
  {
    name: 'North America',
    coords: [
      [50,-125],[55,-130],[60,-140],[65,-168],[71,-157],[71,-95],[60,-65],[52,-56],
      [47,-53],[44,-64],[42,-70],[40,-74],[30,-81],[25,-80],[30,-90],[29,-95],
      [26,-97],[22,-98],[18,-92],[15,-84],[10,-77],[8,-82],[16,-96],[20,-105],
      [23,-106],[32,-117],[38,-123],[48,-124],[50,-125],
    ],
  },
  {
    name: 'South America',
    coords: [
      [12,-72],[10,-62],[7,-55],[2,-50],[-3,-38],[-8,-35],[-15,-39],[-23,-43],
      [-33,-52],[-38,-57],[-42,-64],[-52,-69],[-55,-67],[-55,-72],[-46,-76],
      [-38,-74],[-28,-71],[-18,-70],[-15,-76],[-5,-81],[-1,-76],[3,-73],[8,-77],
      [12,-72],
    ],
  },
  {
    name: 'Europe',
    coords: [
      [36,-10],[38,-5],[43,-2],[46,0],[48,-4],[50,2],[52,5],[55,8],[58,12],
      [60,5],[63,5],[65,14],[70,20],[72,28],[71,44],[68,44],[62,42],[57,40],
      [53,40],[50,40],[47,42],[42,28],[38,26],[36,22],[40,20],[36,12],
      [38,8],[42,3],[36,-10],
    ],
  },
  {
    name: 'Africa',
    coords: [
      [37,10],[36,-5],[33,-8],[28,-13],[21,-17],[15,-17],[10,-15],[5,-8],[5,2],
      [1,9],[-3,12],[-10,14],[-15,12],[-20,15],[-25,20],[-30,28],[-35,20],
      [-34,18],[-28,32],[-20,35],[-12,44],[-1,42],[5,44],[10,45],[12,50],
      [20,40],[25,37],[30,32],[32,35],[35,36],[37,10],
    ],
  },
  {
    name: 'Asia',
    coords: [
      [42,28],[38,44],[33,44],[30,48],[28,62],[25,62],[20,56],[28,68],[35,78],
      [30,90],[28,97],[22,100],[20,106],[10,106],[1,104],[-7,106],[-8,114],
      [-6,120],[-2,141],[0,128],[5,118],[10,117],[18,106],[22,108],[24,120],
      [30,122],[35,129],[40,130],[42,132],[46,135],[50,140],[53,140],[58,137],
      [62,130],[66,140],[70,130],[73,140],[77,105],[72,100],[70,90],[68,55],
      [62,50],[55,55],[55,70],[50,87],[45,60],[50,52],[48,44],[42,28],
    ],
  },
  {
    name: 'Australia',
    coords: [
      [-12,131],[-14,127],[-23,114],[-28,114],[-32,116],[-34,118],[-35,137],
      [-38,145],[-38,148],[-33,152],[-28,153],[-24,151],[-19,146],[-16,146],
      [-14,136],[-12,131],
    ],
  },
  {
    name: 'UK',
    coords: [
      [50,-5],[51,1],[53,0],[54,-1],[56,-5],[58,-3],[58,-5],[57,-7],[55,-6],
      [53,-4],[52,-5],[50,-5],
    ],
  },
  {
    name: 'Japan',
    coords: [
      [31,131],[33,130],[34,132],[35,137],[37,137],[38,140],[40,140],[42,141],
      [44,145],[43,146],[41,141],[38,139],[36,136],[34,134],[33,133],[31,131],
    ],
  },
]

/** Convert a continent's [lat, lng] array into an SVG polygon path string */
function continentPath(coords: [number, number][], W: number, H: number): string {
  return coords
    .map(([lat, lng], i) => {
      const [x, y] = project(lat, lng, W, H)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ') + ' Z'
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

        {/* Continent outlines */}
        {CONTINENTS.map((continent) => (
          <path
            key={continent.name}
            d={continentPath(continent.coords, W, H)}
            fill="#e2e8f0"
            stroke="#cbd5e1"
            strokeWidth={0.5}
            opacity={0.5}
          />
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
