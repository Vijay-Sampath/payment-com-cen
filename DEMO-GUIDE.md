# Agentic AI Payments Resilience Command Center — Demo Guide

> Preparation guide for the workshop demo. Read this before presenting.

---

## Quick Reference

| Item | Detail |
|------|--------|
| **URL** | `http://localhost:3000` |
| **Director Panel** | `Cmd+Shift+D` (hidden from audience) |
| **Demo Duration** | 12-18 minutes (adjustable via speed control) |
| **No API Key Needed** | Static fallback is ON by default |
| **Reset** | Director Panel > Reset button, or refresh browser |

---

## 1. Pre-Demo Checklist

### 30 Minutes Before

- [ ] Run `npm run build` — confirm 0 errors
- [ ] Run `npm run dev` — confirm app loads at `localhost:3000`
- [ ] Open browser in **full-screen mode** (F11 or Cmd+Ctrl+F)
- [ ] Clear browser cache (`Cmd+Shift+Delete`) to avoid stale CSS
- [ ] Close all other browser tabs (prevent notification popups)
- [ ] Disable system notifications (Do Not Disturb)
- [ ] Connect to a reliable display/projector — verify resolution
- [ ] Test audio if narrating (no system sounds needed)

### 5 Minutes Before

- [ ] Navigate to `http://localhost:3000` — should show Command Center
- [ ] Open Director Panel (`Cmd+Shift+D`) — verify it slides in from right
- [ ] Confirm bank is set to **BofA** (default)
- [ ] Confirm **Static Fallback** toggle is ON (amber banner visible)
- [ ] Confirm **Autoplay** toggle is ON
- [ ] Set speed to **1x** (use 2x for time-constrained demos)
- [ ] Close Director Panel before audience arrives
- [ ] Ensure the page shows "ALL SYSTEMS NOMINAL" with green dot

### Backup Plan

- If the dev server crashes: `npm run dev` restarts in ~2 seconds
- If layout looks broken: hard refresh `Cmd+Shift+R`
- If data looks wrong: Director Panel > Hard Reset Demo
- The entire demo runs offline — no network dependency

---

## 2. The Story Arc

The demo tells a single, compelling story in three acts:

### Act 1 — "Everything is Fine" (2 min)
Show the healthy Command Center. All corridors green, STP rate high, no alerts. This is the baseline the audience should remember.

**Key line:** *"This is what your operations team sees right now. All green. But what happens when something goes wrong at 11 PM on a Friday?"*

### Act 2 — "The Cascade" (6-8 min)
Launch the AI Response. Watch 9 agents detect, analyze, and recommend a fix — all in under 11 minutes. The HITL gate is the dramatic pause.

**Key line:** *"Nine AI agents. Zero humans paged. The system found the root cause, mapped the blast radius, and generated three ranked remediation options — all before your ops team would have opened their laptop."*

### Act 3 — "The Resolution" (3-4 min)
Approve the fix. Watch payments drain. Show the green scoreboard. Present the audit trail.

**Key line:** *"$182M protected. 11 minutes. One human approval. Every decision logged for your examiners. That's what AI-orchestrated resilience looks like."*

---

## 3. Screen-by-Screen Walkthrough

### Screen 1: Executive Command Center (`/`)

**What the audience sees:** World map with animated payment corridors, health gauges for 6 rails, stressed services panel, and quick facts.

**Before clicking "Launch AI Response":**
- Point to the corridor map: *"These are live payment corridors — USD/GBP, USD/JPY, USD/SGD. All healthy, all flowing."*
- Point to health gauges: *"SWIFT at 98%, ACH at 97%. This is the baseline."*
- Point to the scoreboard: *"Value at Risk: $0. Payments Stuck: 0. All systems nominal."*

**After clicking "Launch AI Response":**
- The banner turns red with incident details
- Corridor arcs change from green to amber/red
- Health gauges drop (SWIFT goes to 47%)
- Scoreboard numbers climb in real-time

**Talking point:** *"Within seconds, the AI detected what would take a human SOC 30-60 minutes to even notice."*

### Screen 2: Payment Trace (`/payment-trace`)

**What the audience sees:** A horizontal service chain showing the payment journey from Channel through to Settlement, with an animated token hopping through each node.

**Key moments:**
- The token stops at the Sanctions node (turns red) — *"This is where every payment is getting stuck. The sanctions screening service in London is timing out."*
- Click on any service node to see raw logs
- Show the **Payment Details** panel: ID, amount, corridor, BICs
- Show the **Timing Waterfall**: Sanctions at 3,847ms (47x baseline)
- Use the **Search bar** to filter: try typing "stuck" to show only stuck payments, or a client name

**Talking point:** *"142 payments, $847M, three of your largest corporate clients — Siemens, Rio Tinto, Merck — all stuck in the same bottleneck."*

### Screen 3: Agent Theater (`/agent-theater`)

**What the audience sees:** 9 agent cards that activate sequentially with typewriter text, confidence bars, and evidence references.

**This is the centerpiece of the demo.** Let autoplay run. Each agent:
1. Shows thinking dots (600ms)
2. Typewriter-reveals its finding
3. Fills its confidence bar
4. Shows business signal and evidence

**Key agents to narrate:**

| Step | Agent | What to Say |
|------|-------|-------------|
| 1 | Sentinel | *"The AI detected the anomaly — 47 timeouts in 90 seconds. No human paged."* |
| 2 | Correlator | *"Root cause found: sanctions latency cascading into the COBOL retry storm."* |
| 3 | Log Intel | *"2,847 log entries clustered into 4 patterns. 41% is retry noise a human would have chased for hours."* |
| 4 | Impact | *"$847M at risk across 142 payments. Three clients named. This is business language, not infrastructure jargon."* |
| 5 | Topology | *"A backup sanctions cluster exists in Region B. The AI found it. Does your ops team know it's there?"* |
| 6 | Repair | *"Three options ranked by speed, risk, and business impact. The AI did the tradeoff analysis."* |
| 7 | Governance | **PAUSE.** *"This is the HITL gate. The value exceeds $500M. The AI will NOT proceed without human approval. This is compliance by design."* |

**When the HITL gate triggers**, a banner appears: "Navigate to HITL Cockpit." Click it.

### Screen 4: Log Intelligence (`/log-intelligence`)

**Optional screen** — use if the audience is technical. Skip for executive audiences.

**What it shows:** Four log clusters with AI-generated semantic explanations. Click each cluster to see the raw logs and the AI's analysis of what's happening.

**Talking point:** *"Traditional monitoring gives you thousands of alerts. This gives you four clusters with root cause explanations. The AI separates signal from noise."*

### Screen 5: HITL Cockpit (`/hitl-cockpit`)

**What the audience sees:** A dramatic decision screen with countdown timer, three remediation cards, and a pulsing "APPROVE" button.

**The countdown timer is real** — it ticks down from 23:00. This creates genuine tension.

**Walk through the three options:**

| Option | Speed | Risk | When to Use |
|--------|-------|------|-------------|
| **A: Reroute via Backup** (Recommended) | 9/10 | 2/10 | Standard choice — safe and fast |
| **B: Batch Override** | 10/10 | 6/10 | When time is critical, accept compliance risk |
| **C: Manual Escalation** | 3/10 | 1/10 | When you can't afford any risk |

**Key moment:** Click "APPROVE" — the screen transforms with a green checkmark, and recovery execution steps appear one by one.

**Talking point for CFO/CRO:** *"One button. One human. Informed by everything the AI found in the last 8 minutes. The audit trail captures who approved what, when, and why."*

### Screen 6: Recovery & Audit Trail (`/recovery`)

**What the audience sees:** Before/after metric cards with flip animation, recovery curve chart, latency normalization chart, confetti burst, and full compliance audit trail.

**Key numbers to highlight:**

| Metric | Before | After |
|--------|--------|-------|
| Value at Risk | $182M | $12M |
| Payments Stuck | 1,247 | 3 |
| MTTR | 90 min | 11 min |
| STP Rate | 71% | 98% |
| Investigations Avoided | 0 | 847 |
| Ops Hours Saved | 0 | 72 |

**The confetti burst** fires when the workflow reaches "resolved" state. Let it play — it's a celebration moment.

**Talking point:** *"Every step is auditable. Every decision has an evidence chain. When your examiner asks what happened — you hand them this."*

---

## 4. Director Panel Reference

Open with `Cmd+Shift+D`. This is your hidden control surface — never show it to the audience.

### Controls at a Glance

| Control | What It Does |
|---------|-------------|
| **Bank buttons** (BofA/Citi/JPM/WF) | Switch the entire dataset — BICs, clients, system names, corridors |
| **Static Fallback** toggle | Keep ON. Turns OFF only if you have an LLM API connected |
| **Autoplay** toggle | Auto-advances steps on a timer |
| **Speed** (0.5x / 1x / 2x) | Controls autoplay pace |
| **Reset** | Returns to T+0 healthy state |
| **Prev / Next** | Manual step-by-step control |
| **Skip to HITL** | Jumps directly to Governance Gate (Step 7) |
| **Step grid** (1-9) | Jump to any specific step |
| **Force Recovery** | Immediately resolve the incident |
| **Presenter Notes** | Expandable talking points per step |
| **Copy Debug State** | Copies JSON state to clipboard |
| **Export Audit CSV** | Downloads audit log as CSV |

### Recommended Settings by Demo Length

| Duration | Speed | Strategy |
|----------|-------|----------|
| **5 min** (elevator pitch) | 2x | Start on Command Center, click Launch, skip to HITL, approve, show Recovery |
| **12 min** (standard demo) | 1x | Full flow with autoplay, narrate each agent, pause at HITL |
| **20 min** (deep dive) | 0.5x | Full flow + Log Intelligence + Payment Trace search + bank switch |
| **30 min** (workshop) | Manual | Step-by-step with Next button, discuss each agent, show all screens |

---

## 5. Bank Switching — Tailoring to the Audience

If you know the audience's bank, switch to the closest profile. Each bank changes everything: BIC codes, system names, client names, corridor cities.

| If Audience Is... | Use Profile | Why |
|-------------------|-------------|-----|
| Bank of America / US large bank | **BofA** | CashPro platform, FTS-2000 COBOL, Siemens/Rio Tinto/Merck clients |
| Citibank / Global transaction bank | **Citi** | TTS/CitiDirect, FLEXCUBE 11, Shell/P&G/SoftBank clients |
| JPMorgan / Investment bank | **JPM** | J.P. Morgan ACCESS, Hogan CBS, Apple/Boeing/TOTAL clients |
| Wells Fargo / Regional US bank | **WF** | CEO Portal, MISER CBS, Chevron/Walmart/Ford clients |
| Unknown / Generic | **BofA** | Default, most recognizable names |

**How to switch:** Director Panel > Demo Configuration > Click bank button. A toast notification confirms the switch. All data reloads in ~300ms.

---

## 6. Handling Questions

### Technical Questions

| Question | Answer |
|----------|--------|
| *"Are these real AI agents?"* | "This is a deterministic workflow engine that simulates what production agents would do. The 9-step pattern, the confidence scores, the evidence chains — all match real agentic architectures. In production, each agent would call an LLM for reasoning." |
| *"Does this connect to real payment systems?"* | "This is a demonstration environment with synthetic data. In production, it would connect via APIs to your sanctions service, message queues, and settlement systems." |
| *"How does the sanctions reroute work?"* | "The Topology Agent verifies a backup sanctions cluster exists in a different region with zero shared dependencies. The Execution Agent redirects the message queue to the backup cluster, drains stuck payments at 47/minute, and monitors until stable." |
| *"What about false positives?"* | "The Sentinel Agent uses a 96% confidence threshold. The multi-agent chain — detect, correlate, cluster, impact — progressively filters noise. By the time it reaches the human, 41% of retry noise has been eliminated." |

### Executive / Compliance Questions

| Question | Answer |
|----------|--------|
| *"Who is liable for the AI decision?"* | "The AI recommends. The human approves. The HITL gate is triggered by policy — any remediation above $500M requires human sign-off. The audit trail records who approved what." |
| *"Is this CPMI-IOSCO compliant?"* | "The governance gate implements CPMI-IOSCO threshold policies. Every agent decision is logged with evidence chains. The audit trail is exportable for supervisory review." |
| *"How fast can this be deployed?"* | "The platform integrates via standard APIs — SWIFT gpi, ISO 20022, message queue taps. Core deployment is 8-12 weeks. Bank-specific adapters add 4-6 weeks." |
| *"What's the ROI?"* | "In this scenario: 72 ops hours saved, 847 investigations avoided, MTTR reduced from 90 to 11 minutes. Annualized across P1 incidents, that's typically $15-30M in operational savings." |

---

## 7. Common Demo Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Starting the demo with Director Panel visible | Always close it before the audience sees the screen |
| Talking over the typewriter animation | Let each agent's text finish before narrating |
| Rushing through the HITL gate | This is the most important moment — pause, explain, let tension build |
| Forgetting to show the Recovery screen | This is the payoff — always end here |
| Running autoplay too fast | 1x is the sweet spot. 2x only for <5 min demos |
| Not naming the clients | "Siemens, Rio Tinto, Merck" resonate more than "3 clients" |
| Showing the Log Intelligence screen to non-technical audiences | Skip it. Go directly from Agent Theater to HITL Cockpit |
| Leaving speed at 2x after a bank switch | Reset speed to 1x when switching banks |

---

## 8. Narrative Script (12-Minute Version)

### Opening (1 min)
> "What you're looking at is an AI-operated command center for a global payments estate. Right now, everything is green. Six payment rails — SWIFT, ACH, SEPA, Fedwire, RTP, CHIPS — all healthy. Four corridors flowing: New York to London, New York to Tokyo, Charlotte to Singapore, London to Hong Kong. STP rate at 71%. AI Resilience Score: 98 out of 100."
>
> "But what happens when something breaks at 11 PM on a Friday?"

### Incident Launch (1 min)
> *Click "Launch AI Response"*
>
> "The sanctions screening service in London just started timing out. Watch the corridors turn red. The SWIFT health gauge is dropping — from 98% down to 47%. The scoreboard is climbing: $40M at risk... $90M... payments stuck: 200... 500... 1,247."
>
> "Let's go to the Agent Theater to see what the AI is doing about it."

### Agent Theater (5-6 min)
> *Navigate to Agent Theater. Let autoplay run.*
>
> "Nine AI agents are working this incident. Watch them activate in sequence."
>
> *[Narrate each agent as it activates — see the table in Section 3]*
>
> *When Governance Agent triggers:*
> "Stop. This is the governance gate. The AI has found $847M at risk. That exceeds the $500M autonomous threshold. The system will NOT proceed without human approval. Let's go to the cockpit."

### HITL Approval (2 min)
> *Navigate to HITL Cockpit*
>
> "Three options. Option A: reroute through backup — fast and safe. Option B: batch override — fastest but carries compliance risk. Option C: manual escalation — safest but slow, and we'll miss the FX window."
>
> "Look at the countdown: [X] minutes until the FX settlement window closes. Every second matters."
>
> *Click APPROVE*
>
> "One button. One human. Informed by everything the AI found in the last 8 minutes."

### Recovery (2 min)
> *Navigate to Recovery*
>
> "Value at Risk: $182M down to $12M. Payments Stuck: 1,247 down to 3. MTTR: 90 minutes down to 11. STP Rate: 71% restored to 98%."
>
> "847 investigations avoided. 72 ops hours saved. And every single step — every agent decision, every piece of evidence, the human approval — it's all in this audit trail. When your examiner asks what happened, you hand them this."

### Close (1 min)
> "This is what AI-orchestrated payments resilience looks like. Not replacing humans — augmenting them. The AI finds, analyzes, and recommends. The human decides. And the entire process — from detection to resolution — takes 11 minutes instead of 90."
>
> *Pause. Let the green scoreboard sit.*
>
> "What was your last P1 payments incident? How long did it take to resolve?"

---

## 9. Post-Demo Actions

- [ ] Export the audit trail: Director Panel > Export Audit CSV
- [ ] Share the demo URL if the audience wants to explore
- [ ] Reset the demo for the next session: Director Panel > Hard Reset Demo
- [ ] Note any questions that came up — feed them back to the product team
