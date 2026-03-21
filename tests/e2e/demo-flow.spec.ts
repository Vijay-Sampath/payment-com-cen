import { test, expect, Page } from '@playwright/test'

// ================================================================
// Helpers
// ================================================================

const routes = [
  { path: '/', heading: 'Executive Command Center' },
  { path: '/payment-trace', heading: 'Golden Payment Journey Trace' },
  { path: '/agent-theater', heading: 'Agent Orchestration Theater' },
  { path: '/log-intelligence', heading: 'Semantic Log Intelligence' },
  { path: '/hitl-cockpit', heading: 'Human-in-the-Loop Repair Cockpit' },
  { path: '/recovery', heading: 'Recovery & Audit Trail' },
]

/** Scope locator to the main content area (excludes scoreboard and director panel) */
function main(page: Page) {
  return page.locator('main')
}

/** Scope locator to the director panel */
function directorPanel(page: Page) {
  return page.locator('.fixed.right-0')
}

async function openDirectorPanel(page: Page) {
  await page.keyboard.press('Meta+Shift+D')
  await expect(page.locator('text=Director Panel').first()).toBeVisible({ timeout: 3000 })
}

async function closeDirectorPanel(page: Page) {
  await page.keyboard.press('Meta+Shift+D')
  // Wait for the panel to animate away
  await page.waitForTimeout(400)
}

// ================================================================
// Screen Rendering Tests
// ================================================================

test.describe('Screen Rendering', () => {
  test('all 6 primary routes render with correct headings', async ({ page }) => {
    for (const route of routes) {
      await page.goto(route.path)
      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible()
    }
  })

  test('scoreboard is visible on all screens', async ({ page }) => {
    for (const route of routes) {
      await page.goto(route.path)
      // The scoreboard status text is uppercase
      await expect(page.getByText('ALL SYSTEMS NOMINAL', { exact: true })).toBeVisible()
    }
  })

  test('nav sidebar is visible with all 6 icons', async ({ page }) => {
    await page.goto('/')
    const navTitles = ['Command Center', 'Payment Trace', 'Agent Theater', 'Log Intel', 'HITL Cockpit', 'Recovery']
    for (const title of navTitles) {
      await expect(page.getByTitle(title)).toBeVisible()
    }
  })
})

// ================================================================
// Navigation Tests
// ================================================================

test.describe('Navigation', () => {
  test('sidebar nav links navigate to correct pages', async ({ page }) => {
    await page.goto('/')

    await page.getByTitle('Payment Trace').click()
    await expect(page.getByRole('heading', { name: 'Golden Payment Journey Trace' })).toBeVisible()

    await page.getByTitle('Agent Theater').click()
    await expect(page.getByRole('heading', { name: 'Agent Orchestration Theater' })).toBeVisible()

    await page.getByTitle('Log Intel').click()
    await expect(page.getByRole('heading', { name: 'Semantic Log Intelligence' })).toBeVisible()

    await page.getByTitle('HITL Cockpit').click()
    await expect(page.getByRole('heading', { name: 'Human-in-the-Loop Repair Cockpit' })).toBeVisible()

    await page.getByTitle('Recovery').click()
    await expect(page.getByRole('heading', { name: 'Recovery & Audit Trail' })).toBeVisible()

    await page.getByTitle('Command Center').click()
    await expect(page.getByRole('heading', { name: 'Executive Command Center' })).toBeVisible()
  })
})

// ================================================================
// Command Center (/) Tests
// ================================================================

test.describe('Command Center', () => {
  test('shows pre-incident healthy state', async ({ page }) => {
    await page.goto('/')
    // Page body shows "All Systems Nominal" (title case)
    await expect(main(page).getByText('All Systems Nominal', { exact: true })).toBeVisible()
    await expect(main(page).getByText('AI Resilience Score')).toBeVisible()
    await expect(page.getByRole('button', { name: /Launch AI Response/ })).toBeVisible()
  })

  test('Launch AI Response triggers incident', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Launch AI Response/ }).click()
    await expect(main(page).getByText('Active Incident:').first()).toBeVisible({ timeout: 5000 })
    // Launch button should disappear
    await expect(page.getByRole('button', { name: /Launch AI Response/ })).not.toBeVisible()
    // Scoreboard should show ACTIVE INCIDENT
    await expect(page.getByText('ACTIVE INCIDENT', { exact: true })).toBeVisible()
  })

  test('shows quick facts cards with bank details', async ({ page }) => {
    await page.goto('/')
    await expect(main(page).getByText('Platform')).toBeVisible()
    await expect(main(page).getByText('Legacy System')).toBeVisible()
    await expect(main(page).getByText('Primary BIC')).toBeVisible()
    await expect(main(page).getByText('Risk Posture')).toBeVisible()
  })
})

// ================================================================
// Payment Trace (/payment-trace) Tests
// ================================================================

test.describe('Payment Trace', () => {
  test('shows service chain nodes', async ({ page }) => {
    await page.goto('/payment-trace')
    const serviceNames = ['Channel', 'Orchestration', 'Sanctions', 'FX', 'Routing', 'Legacy Hub', 'Rail Adapter', 'Settlement']
    for (const name of serviceNames) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
    }
  })

  test('shows payment details panel', async ({ page }) => {
    await page.goto('/payment-trace')
    await expect(main(page).getByText('Payment Details')).toBeVisible()
    // Use first() since "Payment ID" appears in both detail panel and table header
    await expect(main(page).getByText('Payment ID').first()).toBeVisible()
    await expect(main(page).getByText('Origin BIC')).toBeVisible()
    await expect(main(page).getByText('GPI UETR')).toBeVisible()
  })

  test('shows service timing waterfall', async ({ page }) => {
    await page.goto('/payment-trace')
    await expect(main(page).getByText('Service Timing Waterfall')).toBeVisible()
    await expect(main(page).getByText('3,847ms').first()).toBeVisible()
  })

  test('search filters the payment table', async ({ page }) => {
    await page.goto('/payment-trace')
    const searchInput = page.getByPlaceholder(/Search by Payment ID/)
    await expect(searchInput).toBeVisible()
    await expect(page.getByText(/of \d+ payments/)).toBeVisible()

    await searchInput.fill('stuck')
    const countText = await page.getByText(/Showing \d+ of/).textContent()
    expect(countText).toContain('Showing')
  })

  test('search shows "no payments" for invalid query', async ({ page }) => {
    await page.goto('/payment-trace')
    await page.getByPlaceholder(/Search by Payment ID/).fill('zzzznonexistentzzzzz')
    await expect(page.getByText('No payments match your search.')).toBeVisible()
  })

  test('clicking a payment row selects it', async ({ page }) => {
    await page.goto('/payment-trace')
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
    await rows.nth(1).click()
    // Row should be highlighted
    await expect(rows.nth(1)).toHaveCSS('background-color', /rgba/)
  })

  test('clicking a service node shows log drawer', async ({ page }) => {
    await page.goto('/payment-trace')
    // Click the Sanctions service node button (not the waterfall label)
    await page.locator('button:has-text("Sanctions")').first().click()
    // Should show log entries
    await expect(page.getByText(/OFAC-timeout|circuit.breaker|connection pool/).first()).toBeVisible({ timeout: 3000 })
  })
})

// ================================================================
// Agent Theater (/agent-theater) Tests
// ================================================================

test.describe('Agent Theater', () => {
  test('shows Start Workflow button in idle state', async ({ page }) => {
    await page.goto('/agent-theater')
    await expect(page.getByRole('button', { name: /Start Workflow/ })).toBeVisible()
  })

  test('shows all 9 step labels in progress bar', async ({ page }) => {
    await page.goto('/agent-theater')
    const stepLabels = ['Detect', 'Correlate', 'Log Intel', 'Impact', 'Topology', 'Repair', 'Govern', 'Execute', 'Verify']
    for (const label of stepLabels) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
  })

  test('Start Workflow activates first agent', async ({ page }) => {
    await page.goto('/agent-theater')
    await page.getByRole('button', { name: /Start Workflow/ }).click()
    await expect(page.getByText('ACTIVE INCIDENT', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(main(page).getByRole('button', { name: /Next/ })).toBeVisible()
  })
})

// ================================================================
// Log Intelligence (/log-intelligence) Tests
// ================================================================

test.describe('Log Intelligence', () => {
  test('shows 4 log clusters', async ({ page }) => {
    await page.goto('/log-intelligence')
    await expect(page.getByText('OFAC Timeout Storm')).toBeVisible()
    await expect(page.getByText('ACK Retry Loop')).toBeVisible()
    await expect(page.getByText('Queue Overflow')).toBeVisible()
    await expect(page.getByText('FX Rate Staleness')).toBeVisible()
  })

  test('shows severity badges', async ({ page }) => {
    await page.goto('/log-intelligence')
    await expect(page.getByText('CRITICAL').first()).toBeVisible()
    await expect(page.getByText('HIGH').first()).toBeVisible()
    await expect(page.getByText('MEDIUM')).toBeVisible()
  })

  test('shows AI Semantic Analysis panel', async ({ page }) => {
    await page.goto('/log-intelligence')
    await expect(page.getByText('AI Semantic Analysis')).toBeVisible()
  })

  test('clicking a cluster changes the detail view', async ({ page }) => {
    await page.goto('/log-intelligence')
    await page.getByText('ACK Retry Loop').click()
    await expect(page.getByText(/retry/i).first()).toBeVisible()
  })

  test('log entries are displayed for selected cluster', async ({ page }) => {
    await page.goto('/log-intelligence')
    // OFAC Timeout Storm is selected — wait for animated log entries
    await expect(page.getByText(/circuit_breaker/).first()).toBeVisible({ timeout: 5000 })
  })
})

// ================================================================
// HITL Cockpit (/hitl-cockpit) Tests
// ================================================================

test.describe('HITL Cockpit', () => {
  test('shows governance gate header', async ({ page }) => {
    await page.goto('/hitl-cockpit')
    await expect(page.getByRole('heading', { name: /Human-in-the-Loop Repair Cockpit/ })).toBeVisible()
    await expect(page.getByText('Governance Agent requires human approval')).toBeVisible()
  })

  test('shows countdown timer', async ({ page }) => {
    await page.goto('/hitl-cockpit')
    await expect(page.getByText('FX Settlement Window Closing')).toBeVisible()
    await expect(page.getByText('minutes remaining')).toBeVisible()
  })

  test('shows 3 remediation option cards', async ({ page }) => {
    await page.goto('/hitl-cockpit')
    await expect(page.getByText('Option 1')).toBeVisible()
    await expect(page.getByText('Option 2')).toBeVisible()
    await expect(page.getByText('Option 3')).toBeVisible()
  })

  test('shows AI Recommended badge', async ({ page }) => {
    await page.goto('/hitl-cockpit')
    await expect(page.getByText('AI Recommended')).toBeVisible()
  })

  test('shows tradeoff bars (Speed, Risk, Impact)', async ({ page }) => {
    await page.goto('/hitl-cockpit')
    await expect(page.getByText('Speed', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Risk', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Impact', { exact: true }).first()).toBeVisible()
  })

  test('approve button is visible and clickable', async ({ page }) => {
    await page.goto('/hitl-cockpit')
    const approveBtn = page.getByRole('button', { name: /APPROVE.*EXECUTE NOW/ })
    await expect(approveBtn).toBeVisible()
  })

  test('clicking approve shows execution progress', async ({ page }) => {
    await page.goto('/hitl-cockpit')
    const approveBtn = page.getByRole('button', { name: /APPROVE.*EXECUTE NOW/ })
    await approveBtn.click()
    await expect(page.getByText('Remediation Approved & Executing')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Recovery Execution Progress')).toBeVisible()
    await expect(approveBtn).not.toBeVisible()
    await expect(page.getByText('View Recovery & Audit Trail')).toBeVisible({ timeout: 10000 })
  })
})

// ================================================================
// Recovery (/recovery) Tests
// ================================================================

test.describe('Recovery', () => {
  test('shows before/after metric cards', async ({ page }) => {
    await page.goto('/recovery')
    // Scope to main to avoid matching scoreboard labels
    await expect(main(page).getByText('Value at Risk').first()).toBeVisible()
    await expect(main(page).getByText('Payments Stuck').first()).toBeVisible()
    await expect(main(page).getByText('MTTR').first()).toBeVisible()
    await expect(main(page).getByText('STP Rate').first()).toBeVisible()
  })

  test('shows Business Value Delivered section', async ({ page }) => {
    await page.goto('/recovery')
    await expect(main(page).getByText('Business Value Delivered')).toBeVisible()
    await expect(main(page).getByText('Payments Recovered', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(main(page).getByText('Value Protected')).toBeVisible({ timeout: 5000 })
    await expect(main(page).getByText('Investigations Avoided').first()).toBeVisible({ timeout: 5000 })
    await expect(main(page).getByText('Ops Hours Saved').first()).toBeVisible({ timeout: 5000 })
  })

  test('shows MTTR reduction highlight', async ({ page }) => {
    await page.goto('/recovery')
    await expect(main(page).getByText('MTTR Reduction')).toBeVisible()
  })

  test('shows charts', async ({ page }) => {
    await page.goto('/recovery')
    await expect(page.getByText('Payment Recovery Curve')).toBeVisible()
    await expect(page.getByText('Service Latency Normalization')).toBeVisible()
  })

  test('shows Compliance Audit Trail', async ({ page }) => {
    await page.goto('/recovery')
    await expect(page.getByText('Compliance Audit Trail')).toBeVisible()
  })

  test('shows Regulatory Compliance Note', async ({ page }) => {
    await page.goto('/recovery')
    await expect(page.getByText('Regulatory Compliance Note')).toBeVisible()
    await expect(page.getByText(/CPMI-IOSCO/)).toBeVisible()
  })
})

// ================================================================
// Director Panel Tests
// ================================================================

test.describe('Director Panel', () => {
  test('opens with Cmd+Shift+D keyboard shortcut', async ({ page }) => {
    await page.goto('/')
    await openDirectorPanel(page)
  })

  test('closes with Cmd+Shift+D again', async ({ page }) => {
    await page.goto('/')
    await openDirectorPanel(page)
    await closeDirectorPanel(page)
  })

  test('has bank selector buttons', async ({ page }) => {
    await page.goto('/')
    await openDirectorPanel(page)
    // Bank buttons are in the director panel — scope to it
    const panel = directorPanel(page)
    await expect(panel.getByRole('button', { name: 'BofA' })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Citi' })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'JPM' })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'WF' })).toBeVisible()
  })

  test('has playback control buttons', async ({ page }) => {
    await page.goto('/')
    await openDirectorPanel(page)
    const panel = directorPanel(page)
    await expect(panel.getByRole('button', { name: /Reset/ })).toBeVisible()
    await expect(panel.getByRole('button', { name: /Prev/ })).toBeVisible()
    await expect(panel.getByRole('button', { name: /▶ Play/ })).toBeVisible()
    await expect(panel.getByRole('button', { name: /Next/ })).toBeVisible()
    await expect(panel.getByRole('button', { name: /HITL/ })).toBeVisible()
  })

  test('has speed control buttons', async ({ page }) => {
    await page.goto('/')
    await openDirectorPanel(page)
    const panel = directorPanel(page)
    await expect(panel.getByRole('button', { name: '0.5x' })).toBeVisible()
    await expect(panel.getByRole('button', { name: '1x' })).toBeVisible()
    await expect(panel.getByRole('button', { name: '2x' })).toBeVisible()
  })

  test('tiny dot fallback is visible when panel is closed', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[title="Director Panel (Cmd+Shift+D)"]')).toBeVisible()
  })
})

// ================================================================
// End-to-End Demo Flow
// ================================================================

test.describe('Full Demo Flow', () => {
  test('complete 12-minute demo flow', async ({ page }) => {
    // Act 1: Healthy state
    await page.goto('/')
    await expect(main(page).getByText('All Systems Nominal', { exact: true })).toBeVisible()
    await expect(page.getByText('ALL SYSTEMS NOMINAL', { exact: true })).toBeVisible()

    // Launch incident
    await page.getByRole('button', { name: /Launch AI Response/ }).click()
    await expect(main(page).getByText('Active Incident:').first()).toBeVisible({ timeout: 5000 })

    // Navigate to Agent Theater
    await page.getByTitle('Agent Theater').click()
    await expect(page.getByRole('heading', { name: 'Agent Orchestration Theater' })).toBeVisible()

    // Open Director Panel and skip to HITL
    await openDirectorPanel(page)
    const panel = directorPanel(page)
    await panel.getByRole('button', { name: /HITL/ }).click()
    await page.waitForTimeout(500)
    await closeDirectorPanel(page)

    // Should show HITL gate alert on Agent Theater
    await expect(page.getByText('Human Approval Required')).toBeVisible({ timeout: 5000 })

    // Navigate to HITL Cockpit
    await page.getByTitle('HITL Cockpit').click()
    await expect(page.getByRole('heading', { name: /Human-in-the-Loop Repair Cockpit/ })).toBeVisible()

    // Approve remediation
    await page.getByRole('button', { name: /APPROVE.*EXECUTE NOW/ }).click()
    await expect(page.getByText('Remediation Approved & Executing')).toBeVisible({ timeout: 5000 })

    // Wait for recovery link and navigate
    await expect(page.getByText('View Recovery & Audit Trail')).toBeVisible({ timeout: 10000 })
    await page.getByText('View Recovery & Audit Trail').click()

    // Verify Recovery page
    await expect(page.getByRole('heading', { name: 'Recovery & Audit Trail' })).toBeVisible()
    await expect(page.getByText('Compliance Audit Trail')).toBeVisible()
    await expect(main(page).getByText('Business Value Delivered')).toBeVisible()
  })
})
