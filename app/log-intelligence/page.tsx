'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/store'

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

interface Cluster {
  id: string
  name: string
  icon: string
  count: number
  severity: 'critical' | 'high' | 'medium'
  services: string[]
  color: string
  firstSeen: string
  lastSeen: string
}

const sevColors = { critical: '#dc2626', high: '#d97706', medium: '#2563eb' }
const sevLabel = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM' }

export default function LogIntelligencePage() {
  const { state } = useApp()
  const { bank } = state
  const [selectedCluster, setSelectedCluster] = useState<string>('ofac-timeout')

  const clusters: Cluster[] = [
    {
      id: 'ofac-timeout', name: 'OFAC Timeout Storm', icon: '🔍', count: 847,
      severity: 'critical', services: ['sanctions-svc', 'routing-svc'], color: '#dc2626',
      firstSeen: '23:17:01', lastSeen: '23:29:47',
    },
    {
      id: 'ack-retry', name: 'ACK Retry Loop', icon: '🔄', count: 312,
      severity: 'high', services: [bank.cobolSystemAlias], color: '#d97706',
      firstSeen: '23:19:12', lastSeen: '23:31:05',
    },
    {
      id: 'queue-overflow', name: 'Queue Overflow', icon: '📦', count: 89,
      severity: 'high', services: ['MQ-broker', bank.cobolSystemAlias], color: '#d97706',
      firstSeen: '23:20:33', lastSeen: '23:28:14',
    },
    {
      id: 'fx-staleness', name: 'FX Rate Staleness', icon: '💱', count: 1,
      severity: 'medium', services: ['fx-engine'], color: '#2563eb',
      firstSeen: '23:27:01', lastSeen: '23:27:01',
    },
  ]

  const aiExplanations: Record<string, string> = {
    'ofac-timeout': `The Sentinel Agent identified a cascading failure originating from the OFAC-SCSN-EU-01 endpoint in the London data center. The sanctions screening service began timing out at 23:17 EST, with p99 latency crossing 3,800ms — 47 times the normal baseline of 82ms. The connection pool (50 threads) saturated within 90 seconds. All 847 occurrences trace to the same upstream node, confirming a single-point failure rather than a distributed degradation. The ${bank.cobolSystemAlias} adapter interprets every timeout as a retryable soft failure, amplifying the problem 3x.`,
    'ack-retry': `The ${bank.cobolSystemAlias} legacy adapter — ${bank.platformName}'s COBOL-era settlement bridge — interprets every sanctions timeout as a retryable soft failure. Each failed payment generates 3 retry attempts, turning 847 failures into 2,541 additional messages. This retry storm is the primary queue amplifier and represents 41% of total log volume during the incident. In a traditional SOC, analysts would spend hours filtering this noise before reaching the root cause.`,
    'queue-overflow': `Message queue depth grew from baseline 12 to peak 2,847 within 8 minutes. The enqueue rate (47/s) overwhelmed the dequeue capacity (12/s) once the sanctions service stopped acknowledging messages. Dead letter queue depth reached 89 messages. Backpressure was applied automatically but couldn't prevent the queue from crossing the 2,000-message alert threshold.`,
    'fx-staleness': `A secondary effect: the USD/EUR FX rate cache aged beyond the 300-second threshold (actual age: 4,823 seconds) because the rate refresh service shares a connection pool with the sanctions service. While this affected only 1 log entry, it signals a risk for any payments that do clear — they may settle at a stale rate, creating potential P&L exposure.`,
  }

  const sampleLogs: Record<string, Array<{ ts: string; sev: string; svc: string; msg: string }>> = {
    'ofac-timeout': [
      { ts: '23:17:03.847', sev: 'WARN', svc: `sanctions-svc/pod-eu-02`, msg: `upstream timeout after 3004ms, txn_ref=FT20250319-00847, retry=2/3, upstream=OFAC-SCSN-EU-01, circuit_breaker=HALF_OPEN` },
      { ts: '23:17:04.121', sev: 'ERROR', svc: `sanctions-svc/pod-eu-01`, msg: `connection pool exhausted, available=0/50, pending_requests=847, upstream=OFAC-SCSN-EU-01` },
      { ts: '23:17:04.893', sev: 'CRIT', svc: `sanctions-svc/pod-eu-02`, msg: `circuit_breaker OPEN, upstream=OFAC-SCSN-EU-01, failure_count=847, threshold=50, recovery_timeout=30s` },
      { ts: '23:18:15.221', sev: 'WARN', svc: `routing-svc/pod-us-03`, msg: `sanctions check pending timeout, payment_id=FT20250319-01247, corridor=USD-EUR, SLA_breach_risk=true` },
      { ts: '23:19:42.556', sev: 'CRIT', svc: `sanctions-svc/pod-eu-01`, msg: `SLA breach imminent, affected_payments=847, avg_wait=4823ms, threshold=3000ms, corridor=USD-EUR` },
    ],
    'ack-retry': [
      { ts: '23:19:12.334', sev: 'ERROR', svc: `${bank.cobolSystemAlias}/wire-out`, msg: `ACK timeout, msg_id=MT103-${bank.bicFamily[0]}-20250319-9921, retry_storm=true, queue_depth=1247` },
      { ts: '23:19:13.001', sev: 'WARN', svc: `${bank.cobolSystemAlias}/wire-out`, msg: `generating duplicate messages, msg_id=MT103-${bank.bicFamily[0]}-9921, retry_count=4, queue_depth=1583` },
      { ts: '23:20:05.889', sev: 'CRIT', svc: `${bank.cobolSystemAlias}/wire-out`, msg: `queue overflow imminent, depth=2847, max=5000, dequeue_rate=12/s, enqueue_rate=47/s` },
      { ts: '23:21:33.112', sev: 'ERROR', svc: `${bank.cobolSystemAlias}/wire-out`, msg: `ACK timeout, msg_id=MT103-${bank.bicFamily[0]}-20250319-9934, retry=7/7, GIVING_UP` },
      { ts: '23:22:01.445', sev: 'WARN', svc: `${bank.cobolSystemAlias}/adapter`, msg: `retry budget exhausted for 312 messages, moving to DLQ, dlq_depth=89` },
    ],
    'queue-overflow': [
      { ts: '23:20:33.100', sev: 'WARN', svc: 'MQ-broker/node-01', msg: `queue depth exceeds warning threshold, depth=2000, threshold=1500, queue=sanctions-inbound` },
      { ts: '23:22:15.334', sev: 'CRIT', svc: 'MQ-broker/node-01', msg: `backpressure applied, enqueue_rate throttled from 47/s to 25/s, depth=2847` },
      { ts: '23:24:01.556', sev: 'ERROR', svc: 'MQ-broker/node-02', msg: `DLQ threshold reached, dlq_depth=89, max=100, oldest_msg_age=287s` },
      { ts: '23:26:12.778', sev: 'WARN', svc: 'MQ-broker/node-01', msg: `queue depth stabilizing, depth=2100, dequeue_rate recovering to 18/s` },
      { ts: '23:28:14.990', sev: 'INFO', svc: 'MQ-broker/node-01', msg: `queue draining normally, depth=847, dequeue_rate=45/s, estimated_drain=19s` },
    ],
    'fx-staleness': [
      { ts: '23:27:01.234', sev: 'CRIT', svc: 'fx-engine/rate-svc', msg: `stale rate detected, pair=USD/EUR, rate_age=4823s, threshold=300s, blocking_payments=847` },
      { ts: '23:27:01.235', sev: 'WARN', svc: 'fx-engine/rate-svc', msg: `rate refresh failed, pair=USD/EUR, source=Reuters, fallback_to=cached, connection_pool=shared` },
      { ts: '23:27:02.100', sev: 'INFO', svc: 'fx-engine/rate-svc', msg: `using stale rate USD/EUR=0.9218, actual_market=0.9224, delta=0.065%, within_tolerance=true` },
      { ts: '23:27:03.001', sev: 'WARN', svc: 'fx-engine/risk-calc', msg: `potential P&L exposure from stale rate, notional=$12.4M, max_slippage=0.065%` },
      { ts: '23:27:03.500', sev: 'INFO', svc: 'fx-engine/rate-svc', msg: `rate refresh queued, will retry when connection pool frees, estimated_wait=45s` },
    ],
  }

  const active = clusters.find((c) => c.id === selectedCluster)!
  const sevColor: Record<string, string> = { WARN: '#d97706', ERROR: '#dc2626', CRIT: '#dc2626', INFO: '#0d9488' }

  return (
    <motion.div {...fade} transition={{ duration: 0.3 }} className="space-y-5 relative z-10">
      <div>
        <h2 className="text-[22px] font-extrabold text-[#0f172a]">Semantic Log Intelligence</h2>
        <p className="text-[14px] text-[#64748b] mt-0.5">{bank.name} — AI-clustered incident log analysis</p>
      </div>

      <div className="grid grid-cols-5 gap-5" style={{ minHeight: '600px' }}>
        {/* Left: Cluster browser (40%) */}
        <div className="col-span-2 space-y-3">
          {clusters.map((cl) => (
            <button
              key={cl.id}
              onClick={() => setSelectedCluster(cl.id)}
              className={`w-full glass p-4 text-left transition-all ${
                selectedCluster === cl.id ? 'border-[#0d9488]/40 glow-teal' : 'hover:border-[#e2e8f0]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{cl.icon}</span>
                  <span className="text-[16px] font-bold text-[#0f172a]">{cl.name}</span>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-[12px] font-bold"
                  style={{ background: `${sevColors[cl.severity]}15`, color: sevColors[cl.severity] }}
                >
                  {sevLabel[cl.severity]}
                </span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-[#64748b]">{cl.services.join(', ')}</span>
                <span className="text-[20px] font-bold tabular-nums" style={{ color: cl.color }}>
                  {cl.count}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-[#64748b] mt-1 font-mono">
                <span>First: {cl.firstSeen}</span>
                <span>Last: {cl.lastSeen}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Right: AI explanation + logs (60%) */}
        <div className="col-span-3 space-y-4">
          {/* AI explanation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCluster}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass p-5 border border-[#0d9488]/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[18px]">🧠</span>
                <span className="text-[13px] font-bold text-[#0d9488] uppercase tracking-wider">
                  AI Semantic Analysis
                </span>
              </div>
              <p className="text-[16px] text-[#64748b] leading-relaxed">
                {aiExplanations[selectedCluster]}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Log cards */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCluster + '-logs'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {(sampleLogs[selectedCluster] || []).map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-[#f8fafc] rounded-lg p-3 font-mono text-[14px] leading-relaxed border border-[#e2e8f0]"
                >
                  <span className="text-[#64748b]">[{log.ts}]</span>{' '}
                  <span className="font-bold" style={{ color: sevColor[log.sev] || '#64748b' }}>
                    {log.sev.padEnd(5)}
                  </span>{' '}
                  <span className="text-[#0d9488]">{log.svc}</span>{' '}
                  <span className="text-[#0f172a]">{log.msg}</span>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
