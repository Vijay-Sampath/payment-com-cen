'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '@/lib/store'

const navItems = [
  { href: '/', label: 'Command Center', icon: '⚡' },
  { href: '/payment-trace', label: 'Payment Trace', icon: '🔍' },
  { href: '/agent-theater', label: 'Agent Theater', icon: '🤖' },
  { href: '/log-intelligence', label: 'Log Intel', icon: '📊' },
  { href: '/hitl-cockpit', label: 'HITL Cockpit', icon: '🛡️' },
  { href: '/recovery', label: 'Recovery', icon: '✅' },
]

export function NavSidebar() {
  const pathname = usePathname()
  const { state } = useApp()
  const isIncident = state.workflow.current_step >= 0 && state.workflow.current_step < 8

  return (
    <nav
      className="w-16 h-full flex flex-col items-center py-4 shrink-0 border-r border-[#1e293b]"
      style={{ background: '#0f172a' }}
    >
      {/* Incident status dot */}
      <div className="mb-4">
        <div
          className={`w-4 h-4 rounded-full ${
            isIncident ? 'bg-[#ef4444] status-pulse' : 'bg-[#0d9488]'
          }`}
        />
      </div>

      {/* Nav icons */}
      <div className="flex-1 flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all duration-200 ${
                isActive
                  ? 'bg-[#0d9488]/15 border border-[#0d9488]/30 shadow-[0_0_15px_rgba(13,148,136,0.2)]'
                  : 'border border-transparent hover:bg-[#1e293b] hover:border-[#334155]'
              }`}
            >
              <span className={isActive ? '' : 'opacity-50 hover:opacity-80'}>
                {item.icon}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Mode badge */}
      <div className="mt-4">
        <div className="w-8 h-8 rounded-lg bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[10px] font-bold text-[#0d9488]">
          D
        </div>
      </div>
    </nav>
  )
}
