# Agentic AI Payments Resilience Command Center

AI-operated control tower for global payments estate resilience. Demonstrates how Agentic AI detects, explains, and safely remediates complex cross-border payment failures.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No API key required. Static fallback mode is ON by default.

## Bank Switching

Four bank profiles available: **Bank of America**, **Citi**, **JPMorgan Chase**, **Wells Fargo**.

Switching banks changes BIC codes, system names, client names, and corridor mixes inside the actual synthetic data records.

Use the top-bar bank switcher or the Director Panel.

## Director Panel (Hidden)

**Keyboard shortcut:** `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Windows)

Invisible overlay for controlling the demo during presentations:
- Bank profile selection
- Workflow start/pause/step/reset
- Playback speed control (0.5x–5x)
- Step-by-step navigator
- HITL gate approval
- State inspector

## Six Screens

1. **Executive Command Center** (`/`) — KPI dashboard, corridor map, incident summary
2. **Golden Payment Journey Trace** (`/payment-trace`) — End-to-end payment tracking with 142 transactions
3. **Agent Orchestration Theater** (`/agent-theater`) — 9-step deterministic agent workflow visualization
4. **Semantic Log Intelligence** (`/log-intelligence`) — AI-clustered log analysis
5. **HITL Repair Cockpit** (`/hitl-cockpit`) — Full-screen remediation approval with countdown
6. **Recovery & Audit Trail** (`/recovery`) — Before/after business value metrics and compliance trail

## 9-Step Agent Workflow

Detect → Correlate → Cluster Logs → Identify Cohort → Estimate Impact → Propose Repair → Governance Gate → Execute Recovery → Verify Outcome

## Flagship Scenario

**"Sanctions screening latency cascade + legacy adapter retry storm"**

A high-value USD batch sweep begins failing intermittently. Sanctions service times out. Queue depth rises. Legacy hub starts retrying. FX settlement window closes in 43 minutes. AI detects, traces, explains, and safely reroutes — in under 4 minutes.

## Architecture

- **Deterministic Workflow Engine** — precomputed, repeatable, no real agents
- **Static Fallback Mode** — all outputs precomputed as JSON, zero external dependencies
- **Bank-Aware Data Hydration** — BIC codes, system names, client names change per bank profile

## Tech Stack

- Next.js 14, React 18, TypeScript (strict)
- Tailwind CSS v3, Framer Motion v11
- Recharts + D3 v7
- Fully offline after `npm install`
