# Synthetic Payments Data — README

## Generation

```bash
# Full dataset (75K payments × 4 banks = 300K total)
uv run --project scripts python scripts/generate_data.py --bank ALL --scale full

# Single bank
uv run --project scripts python scripts/generate_data.py --bank BOFA --scale full

# Quick test (5K payments)
uv run --project scripts python scripts/generate_data.py --bank BOFA --scale small

# Medium (25K)
uv run --project scripts python scripts/generate_data.py --bank ALL --scale medium
```

## Output Files

### Raw Data (`data/raw/`)

| File | Records (full) | Format | Description |
|------|----------------|--------|-------------|
| `payments.parquet` | 300,000 | Parquet | Core payment events with all fields |
| `trace_spans.json` | 480,000 | JSON | Distributed trace spans (8 per sampled payment) |
| `service_logs.json` | 114,165 | JSON | Realistic service log entries |
| `service_metrics.json` | 3,840 | JSON | 1-minute time-series metrics per service |
| `queue_metrics.json` | 2,880 | JSON | Queue depth/rate metrics per service |
| `sanctions_events.json` | 22,750 | JSON | Sanctions screening events |

### Workflow JSONs (`data/scenarios/{BANK_ID}/`)

| File | Description |
|------|-------------|
| `flagship_workflow.json` | Precomputed 9-step agent workflow with narratives, evidence refs, scoreboard deltas, remediation options, and outcome metrics |

### Bank Profiles (`data/bank-profiles/`)

| File | Bank |
|------|------|
| `BOFA.json` | Bank of America |
| `CITI.json` | Citibank |
| `JPM.json` | JPMorgan Chase |
| `WF.json` | Wells Fargo |

## Key Schema Fields

### Payment Events
- `payment_id`, `trace_id` — Primary + correlation keys
- `bank_profile` — BOFA / CITI / JPM / WF
- `debtor_bic`, `creditor_bic` — Bank-specific BIC codes embedded in records
- `client_archetype` — Bank-specific client names (Siemens, Apple, Chevron, etc.)
- `incident_tag` — `flagship` (15%), `backup` (5%), or null (normal)
- `sanctions_flag` — CLEAR / HIT / NEAR_MATCH / TIMEOUT
- `circuit_breaker_state` — CLOSED / OPEN / HALF_OPEN
- `operational_risk_score` — 0.0–1.0

### Incident Distribution
- **Flagship** (sanctions cascade): 15% of payments, `incident_tag="flagship"`
- **Backup** (ISO 20022 address): 5% of payments, `incident_tag="backup"`
- **Normal**: 80% of payments

## Corridors (25)

World Bank remittance corridors across USD, EUR, GBP, SGD, JPY, CHF, CNY, BRL, AUD, CAD.

## Rails (6)

SWIFT, ACH, SEPA, Fedwire, RTP, CHIPS.

## Services (8)

channel, orchestration, sanctions, fx, routing, legacy-hub, rail-adapter, settlement.

## Dependencies

Managed via `uv` — see `scripts/pyproject.toml`:
faker, duckdb, pandas, pyarrow, numpy, python-dateutil, rich
