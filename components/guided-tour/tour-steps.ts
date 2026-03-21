export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TourStep {
  id: string
  target: string | null // data-tour attribute value, null = centered card
  route: string | null  // navigate to this route before showing step
  position: TooltipPosition
  title: string
  description: string
  onEnter?: 'open-director'
  onExit?: 'close-director'
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    route: '/',
    position: 'center',
    title: 'Welcome to the Command Center',
    description: 'This guided tour walks you through the AI-powered payments resilience platform. 16 stops across 6 screens — use arrow keys or click Next.',
  },
  {
    id: 'nav-sidebar',
    target: 'nav-sidebar',
    route: null,
    position: 'right',
    title: 'Navigation Sidebar',
    description: '6 screens: Command Center, Payment Trace, Agent Theater, Log Intelligence, HITL Cockpit, and Recovery & Audit Trail.',
  },
  {
    id: 'scoreboard',
    target: 'scoreboard',
    route: null,
    position: 'bottom',
    title: 'Live Scoreboard',
    description: 'Real-time KPIs always visible: Value at Risk, Payments Stuck, SLA Exposure, MTTR, and STP Rate. Numbers animate as the incident progresses.',
  },
  {
    id: 'bank-switcher',
    target: 'bank-switcher',
    route: null,
    position: 'bottom',
    title: 'Bank Profile Switcher',
    description: '4 bank profiles (BofA, Citi, JPMorgan, Wells Fargo) — switching changes BIC codes, client names, system aliases, and data throughout the entire app.',
  },
  {
    id: 'status-banner',
    target: 'status-banner',
    route: '/',
    position: 'bottom',
    title: 'Incident Status Banner',
    description: 'Transitions through 3 phases: Pre-Incident (green, all systems nominal), Active Incident (red, with value at risk), and Resolved (green, recovery summary).',
  },
  {
    id: 'corridor-map',
    target: null,
    route: '/',
    position: 'center',
    title: 'Payment Corridor Map',
    description: 'World map showing animated payment corridors between financial centers. Arcs change color and speed based on corridor health status.',
  },
  {
    id: 'health-gauges',
    target: null,
    route: '/',
    position: 'center',
    title: 'Payment Rail Health',
    description: 'Radial gauges for SWIFT, ACH, SEPA, Fedwire, RTP, and CHIPS. Each gauge reflects real-time throughput and latency for that payment rail.',
  },
  {
    id: 'launch-button',
    target: 'launch-button',
    route: '/',
    position: 'bottom',
    title: 'Launch AI Response',
    description: '"Launch AI Response" starts the deterministic 9-agent workflow. The AI detects, correlates, analyzes, and recommends — the human decides.',
  },
  {
    id: 'search-bar',
    target: 'search-bar',
    route: '/payment-trace',
    position: 'bottom',
    title: 'Payment Search',
    description: 'Search and filter across all 142 payments by ID, originator, corridor, status, or currency. Results update instantly.',
  },
  {
    id: 'payment-table',
    target: 'payment-table',
    route: '/payment-trace',
    position: 'top',
    title: 'Payment Table',
    description: '142 payments with status badges — click any row to trace its golden journey through the 8-service chain from Channel to Settlement.',
  },
  {
    id: 'agent-cards',
    target: 'agent-cards',
    route: '/agent-theater',
    position: 'top',
    title: 'Agent Orchestration',
    description: '9 sequential agents: Sentinel, Correlator, Log Intel, Impact, Topology, Repair Planner, Governance, Execution, and Verification. Each card expands with findings.',
  },
  {
    id: 'hitl-options',
    target: 'hitl-options',
    route: '/hitl-cockpit',
    position: 'top',
    title: 'Remediation Options',
    description: '3 AI-ranked remediation strategies with speed/risk/impact tradeoff bars. The AI recommends — the human chooses.',
  },
  {
    id: 'hitl-approve',
    target: 'hitl-approve',
    route: '/hitl-cockpit',
    position: 'top',
    title: 'Approve & Execute',
    description: 'One-click approval with countdown timer showing the FX settlement window. Governance gate ensures compliance for high-value decisions.',
  },
  {
    id: 'director-dot',
    target: 'director-dot',
    route: '/payment-trace',
    position: 'left',
    title: 'Director Panel Access',
    description: 'This tiny dot opens the Director Panel — a hidden control surface for presenters. Shortcut: Cmd+Shift+D (or Ctrl+Shift+D).',
  },
  {
    id: 'playback-controls',
    target: 'playback-controls',
    route: '/payment-trace',
    position: 'left',
    title: 'Playback Controls',
    description: 'Play/pause, speed control (0.5x–2x), step jump, HITL skip, and full reset. Control the entire demo flow from here.',
    onEnter: 'open-director',
    onExit: 'close-director',
  },
  {
    id: 'tour-complete',
    target: null,
    route: '/payment-trace',
    position: 'center',
    title: 'Tour Complete',
    description: 'You\'ve seen all 6 screens and key controls. Click "Start Demo" to launch the 9-agent workflow and see the platform in action.',
  },
]
