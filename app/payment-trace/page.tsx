'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/store'
import { PaymentRecord } from '@/types'
import { filterPayments, getNodeStatus } from '@/lib/payment-trace-utils'

const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

const SERVICE_CHAIN = [
  { key: 'channel', label: 'Channel', icon: '📡', field: 'submitted_at' },
  { key: 'orchestration', label: 'Orchestration', icon: '🎯', field: 'submitted_at' },
  { key: 'sanctions', label: 'Sanctions', icon: '🔍', field: 'sanctions_start' },
  { key: 'fx', label: 'FX', icon: '💱', field: 'fx_start' },
  { key: 'routing', label: 'Routing', icon: '🔀', field: 'routing_start' },
  { key: 'legacy', label: 'Legacy Hub', icon: '🖥️', field: 'legacy_start' },
  { key: 'rail', label: 'Rail Adapter', icon: '🚂', field: null },
  { key: 'settlement', label: 'Settlement', icon: '✅', field: 'settled_at' },
]

const nodeColors = { ok: '#0d9488', slow: '#d97706', failed: '#dc2626' }

const statusBadgeColors: Record<string, { bg: string; text: string }> = {
  recovered: { bg: 'bg-[#0d9488]/10', text: 'text-[#0d9488]' },
  completed: { bg: 'bg-[#0d9488]/10', text: 'text-[#0d9488]' },
  stuck: { bg: 'bg-[#d97706]/10', text: 'text-[#d97706]' },
  failed: { bg: 'bg-[#dc2626]/10', text: 'text-[#dc2626]' },
}

function ServiceNode({ svc, status, onClick, isSelected, hasToken }: {
  svc: typeof SERVICE_CHAIN[0]; status: 'ok' | 'slow' | 'failed'; onClick: () => void; isSelected: boolean; hasToken: boolean
}) {
  const color = nodeColors[status]
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group relative">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[24px] border-2 transition-all ${
          isSelected ? 'scale-110' : 'group-hover:scale-105'
        }`}
        style={{
          borderColor: color,
          background: `${color}10`,
          boxShadow: status === 'failed' ? `0 0 12px ${color}30` : isSelected ? `0 0 10px ${color}20` : 'none',
        }}
      >
        {svc.icon}
      </div>
      <span className="text-[13px] font-semibold" style={{ color }}>{svc.label}</span>
      {/* Animated token dot */}
      <AnimatePresence>
        {hasToken && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#0d9488] flex items-center justify-center token-active"
            style={{ zIndex: 10 }}
          >
            <span className="text-[10px] font-bold text-white">$</span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}

function ConnectorLine({ status, hasToken }: { status: 'ok' | 'slow' | 'failed'; hasToken: boolean }) {
  const color = status === 'failed' ? '#dc2626' : '#0d9488'
  return (
    <div className="relative w-12 h-0.5 mx-1">
      <div className="w-full h-full" style={{
        background: color,
        opacity: status === 'failed' ? 0.6 : 0.3,
      }} />
      {/* Token traveling across connector */}
      {hasToken && (
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: '100%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0d9488]"
          style={{ boxShadow: '0 0 6px rgba(13,148,136,0.4)' }}
        />
      )}
    </div>
  )
}

function LogDrawer({ service, bank }: { service: string; bank: string }) {
  const logs = [
    { ts: '23:17:03.847', sev: 'WARN', svc: `${service}/pod-eu-02`, msg: `OFAC-timeout txn=FT20250319-00847 retry=2/3 upstream=OFAC-SCSN-EU-01 cb=HALF_OPEN` },
    { ts: '23:17:04.121', sev: 'ERROR', svc: `${service}/pod-eu-01`, msg: `ACK-timeout msg=MT103-${bank}-9921 queue_depth=1247 retry_storm=true` },
    { ts: '23:17:04.893', sev: 'CRIT', svc: `${service}/pod-eu-02`, msg: `circuit-breaker OPEN upstream=OFAC-SCSN-EU-01 threshold=50 failures=847` },
  ]
  const sevColor: Record<string, string> = { WARN: '#d97706', ERROR: '#dc2626', CRIT: '#dc2626' }

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <div className="mt-4 space-y-2">
        {logs.map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#f8fafc] rounded-lg p-3 font-mono text-[14px] leading-relaxed border border-[#e2e8f0]"
          >
            <span className="text-[#64748b]">[{log.ts}]</span>{' '}
            <span style={{ color: sevColor[log.sev] || '#64748b' }} className="font-bold">{log.sev}</span>{' '}
            <span className="text-[#0d9488]">{log.svc}</span>{' '}
            <span className="text-[#0f172a]">{log.msg}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default function PaymentTracePage() {
  const { state } = useApp()
  const { scenario, bank, workflow } = state
  const payments = scenario.payments
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)

  // Hop-by-hop token animation
  const [tokenIndex, setTokenIndex] = useState(-1)
  const isActive = workflow.current_step >= 0

  // Filter payments by search query
  const filteredPayments = useMemo(() => filterPayments(payments, searchQuery), [payments, searchQuery])

  // The selected payment for the golden trace (either clicked or default)
  const selectedPayment = selectedPaymentId
    ? payments.find((p) => p.id === selectedPaymentId) || payments[0]
    : null

  // Pick the "worst" payment as golden trace default
  const golden = selectedPayment || payments.find((p) => p.status === 'stuck' && p.retryCount > 0) || payments.find((p) => p.status !== 'completed') || payments[0]

  // Find the failure node index
  const failureIndex = SERVICE_CHAIN.findIndex((svc) => getNodeStatus(golden, svc.key) === 'failed')

  // Auto-animate token hopping through nodes
  useEffect(() => {
    if (!isActive) { setTokenIndex(-1); return }
    setTokenIndex(0)
    let current = 0
    const stopAt = failureIndex >= 0 ? failureIndex : SERVICE_CHAIN.length - 1
    const interval = setInterval(() => {
      if (current < stopAt) {
        current++
        setTokenIndex(current)
      } else {
        clearInterval(interval)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [isActive, failureIndex])

  // If workflow is resolved, resume token through remaining nodes
  const isResolved = workflow.current_step >= 8
  useEffect(() => {
    if (!isResolved || failureIndex < 0) return
    let current = failureIndex
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (current < SERVICE_CHAIN.length - 1) {
          current++
          setTokenIndex(current)
        } else {
          clearInterval(interval)
        }
      }, 400)
      return () => clearInterval(interval)
    }, 300)
    return () => clearTimeout(timer)
  }, [isResolved, failureIndex])

  const timings = [
    { label: 'Sanctions', dur: '3,847ms', pct: 72, color: '#dc2626' },
    { label: 'Legacy Hub', dur: '2,100ms', pct: 40, color: '#d97706' },
    { label: 'FX', dur: '180ms', pct: 3, color: '#0d9488' },
    { label: 'Routing', dur: '95ms', pct: 2, color: '#0d9488' },
    { label: 'Channel', dur: '45ms', pct: 1, color: '#0d9488' },
  ]

  return (
    <motion.div {...fade} transition={{ duration: 0.3 }} className="space-y-5 relative z-10">
      <div>
        <h2 className="text-[22px] font-extrabold text-[#0f172a]">Golden Payment Journey Trace</h2>
        <p className="text-[14px] text-[#64748b] mt-0.5">
          End-to-end trace — {bank.name} — Tracking {golden.id}
        </p>
      </div>

      {/* Horizontal service chain with token hop */}
      <div className="glass p-6">
        <div className="flex items-center justify-between">
          {SERVICE_CHAIN.map((svc, i) => {
            const status = getNodeStatus(golden, svc.key)
            return (
              <div key={svc.key} className="flex items-center">
                <ServiceNode
                  svc={svc}
                  status={status}
                  isSelected={selectedNode === svc.key}
                  onClick={() => setSelectedNode(selectedNode === svc.key ? null : svc.key)}
                  hasToken={tokenIndex === i}
                />
                {i < SERVICE_CHAIN.length - 1 && (
                  <ConnectorLine
                    status={status}
                    hasToken={tokenIndex === i && tokenIndex < SERVICE_CHAIN.length - 1}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Failure annotation */}
        {golden.sanctionsCheckStatus === 'timeout' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-5 p-4 bg-[#dc2626]/5 rounded-xl border border-[#dc2626]/20">
            <span className="text-[16px] font-bold text-[#dc2626]">
              Timeout after 3,847ms — 47x baseline
            </span>
            <p className="text-[14px] text-[#64748b] mt-1">
              OFAC-SCSN-EU-01 unreachable. Circuit breaker entered HALF_OPEN state. {bank.cobolSystemAlias} retry storm amplifying queue depth.
            </p>
          </motion.div>
        )}

        {/* Stuck indicator at failure point */}
        {tokenIndex === failureIndex && failureIndex >= 0 && !isResolved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-[#dc2626] status-pulse" />
            <span className="text-[14px] text-[#dc2626] font-medium">
              Payment stuck at {SERVICE_CHAIN[failureIndex].label} — awaiting remediation
            </span>
          </motion.div>
        )}

        {/* Log drawer */}
        <AnimatePresence>
          {selectedNode && <LogDrawer service={selectedNode} bank={bank.bicFamily[0]} />}
        </AnimatePresence>
      </div>

      {/* Two-column detail */}
      <div className="grid grid-cols-2 gap-5">
        {/* Payment metadata */}
        <div className="glass p-5">
          <h4 className="text-[16px] font-bold text-[#0f172a] mb-4">Payment Details</h4>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Payment ID', value: golden.id },
              { label: 'Amount', value: `${golden.currency} ${(golden.amount / 1e6).toFixed(2)}M` },
              { label: 'Corridor', value: golden.corridor },
              { label: 'Originator', value: golden.originator },
              { label: 'Origin BIC', value: golden.originBic },
              { label: 'Dest BIC', value: golden.destBic },
              { label: 'GPI UETR', value: golden.uetr.slice(0, 18) + '...' },
              { label: 'Status', value: golden.status.toUpperCase() },
            ].map((item) => (
              <div key={item.label}>
                <span className="text-[13px] text-[#64748b]">{item.label}</span>
                <p className="text-[16px] font-semibold text-[#0f172a] mt-0.5 font-mono truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Span waterfall */}
        <div className="glass p-5">
          <h4 className="text-[16px] font-bold text-[#0f172a] mb-4">Service Timing Waterfall</h4>
          <div className="space-y-3">
            {timings.map((t, i) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className="text-[14px] text-[#64748b] w-24 shrink-0">{t.label}</span>
                <div className="flex-1 h-4 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(t.pct, 3)}%` }}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: t.color }}
                  />
                </div>
                <span className="text-[14px] font-mono text-[#64748b] w-20 text-right shrink-0">{t.dur}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Search & Table */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[16px] font-bold text-[#0f172a]">All Payments</h4>
          <span className="text-[13px] text-[#64748b] font-medium">
            Showing {filteredPayments.length} of {payments.length} payments
          </span>
        </div>

        {/* Search bar */}
        <div className="mb-4" data-tour="search-bar">
          <input
            type="text"
            placeholder="Search by Payment ID, Originator, Corridor, Status, Currency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-[14px] text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488]/50 transition-all"
          />
        </div>

        {/* Payment table */}
        <div data-tour="payment-table" className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-[14px]">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-[#e2e8f0]">
                <th className="text-left py-2.5 px-3 text-[12px] font-semibold text-[#64748b] uppercase tracking-wider">Payment ID</th>
                <th className="text-left py-2.5 px-3 text-[12px] font-semibold text-[#64748b] uppercase tracking-wider">Originator</th>
                <th className="text-right py-2.5 px-3 text-[12px] font-semibold text-[#64748b] uppercase tracking-wider">Amount</th>
                <th className="text-left py-2.5 px-3 text-[12px] font-semibold text-[#64748b] uppercase tracking-wider">Currency</th>
                <th className="text-left py-2.5 px-3 text-[12px] font-semibold text-[#64748b] uppercase tracking-wider">Corridor</th>
                <th className="text-left py-2.5 px-3 text-[12px] font-semibold text-[#64748b] uppercase tracking-wider">Status</th>
                <th className="text-left py-2.5 px-3 text-[12px] font-semibold text-[#64748b] uppercase tracking-wider">Sanctions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => {
                const badge = statusBadgeColors[p.status] || statusBadgeColors.stuck
                const isSelected = golden.id === p.id
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPaymentId(p.id)}
                    className={`border-b border-[#f1f5f9] cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#0d9488]/5' : 'hover:bg-[#f8fafc]'
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-[#0f172a] font-medium">{p.id}</td>
                    <td className="py-2 px-3 text-[#0f172a] truncate max-w-[180px]">{p.originator}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#0f172a] tabular-nums">
                      {(p.amount / 1e6).toFixed(2)}M
                    </td>
                    <td className="py-2 px-3 text-[#64748b] font-mono">{p.currency}</td>
                    <td className="py-2 px-3 text-[#64748b]">{p.corridor}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[12px] font-bold uppercase ${badge.bg} ${badge.text}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-[12px] font-medium ${
                        p.sanctionsCheckStatus === 'passed' ? 'text-[#0d9488]' :
                        p.sanctionsCheckStatus === 'timeout' ? 'text-[#dc2626]' :
                        p.sanctionsCheckStatus === 'failed' ? 'text-[#dc2626]' :
                        'text-[#d97706]'
                      }`}>
                        {p.sanctionsCheckStatus}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredPayments.length === 0 && (
            <div className="py-8 text-center text-[14px] text-[#64748b]">
              No payments match your search.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
