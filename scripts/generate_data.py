#!/usr/bin/env python3
"""
Synthetic Payments Data Generator
==================================
Generates realistic cross-border payment data for the
Agentic AI Payments Resilience Command Center.

Usage:
    uv run python scripts/generate_data.py
    uv run python scripts/generate_data.py --bank BOFA
    uv run python scripts/generate_data.py --scale small
    uv run python scripts/generate_data.py --bank ALL --scale full
"""

import argparse
import hashlib
import json
import math
import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from dateutil import parser as dtparser
from faker import Faker
from rich.console import Console
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
)
from rich.table import Table

console = Console()
fake = Faker()
Faker.seed(42)
random.seed(42)
np.random.seed(42)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCALE_MAP = {"small": 5_000, "medium": 25_000, "full": 75_000}

CURRENCIES = ["USD", "EUR", "GBP", "SGD", "JPY", "CHF", "CNY", "BRL", "AUD", "CAD"]

RAILS = ["SWIFT", "ACH", "SEPA", "Fedwire", "RTP", "CHIPS"]

SERVICES = [
    "channel",
    "orchestration",
    "sanctions",
    "fx",
    "routing",
    "legacy-hub",
    "rail-adapter",
    "settlement",
]

PRIORITIES = ["HIGH", "NORMAL", "BULK"]
PRIORITY_WEIGHTS = [0.15, 0.65, 0.20]

CUSTOMER_SEGMENTS = ["CORPORATE", "INSTITUTIONAL", "CORRESPONDENT"]
SEGMENT_WEIGHTS = [0.50, 0.30, 0.20]

MSG_TYPES = ["pacs.008", "pain.001", "pacs.004"]
MSG_TYPE_WEIGHTS = [0.70, 0.25, 0.05]

STATUSES_NORMAL = ["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "PENDING", "PROCESSING"]
STATUSES_INCIDENT = ["STUCK", "FAILED", "TIMEOUT", "RJCT08", "RJCT11", "PENDING", "COMPLETED"]

REJECT_CODES = {
    "RJCT08": "AC08 - Invalid clearing system member identifier",
    "RJCT11": "FF01 - Invalid file format / unstructured address",
    "TIMEOUT": "TOUT - Sanctions screening timeout exceeded SLA",
    "STUCK": "QFUL - Queue capacity exceeded, message held",
    "FAILED": "RJCT - General processing failure",
}

CB_STATES = ["CLOSED", "OPEN", "HALF_OPEN"]
SANCTIONS_FLAGS = ["CLEAR", "HIT", "NEAR_MATCH", "TIMEOUT"]

# World Bank remittance corridors (25)
CORRIDORS = [
    ("US", "MX", "USD", "MXN"), ("US", "CN", "USD", "CNY"),
    ("US", "IN", "USD", "INR"), ("US", "PH", "USD", "PHP"),
    ("US", "GB", "USD", "GBP"), ("US", "JP", "USD", "JPY"),
    ("US", "DE", "USD", "EUR"), ("US", "SG", "USD", "SGD"),
    ("US", "BR", "USD", "BRL"), ("US", "CA", "USD", "CAD"),
    ("US", "AU", "USD", "AUD"), ("US", "CH", "USD", "CHF"),
    ("GB", "IN", "GBP", "INR"), ("GB", "DE", "GBP", "EUR"),
    ("GB", "SG", "GBP", "SGD"), ("GB", "HK", "GBP", "HKD"),
    ("DE", "CH", "EUR", "CHF"), ("DE", "JP", "EUR", "JPY"),
    ("SG", "HK", "SGD", "HKD"), ("SG", "AU", "SGD", "AUD"),
    ("JP", "AU", "JPY", "AUD"), ("JP", "SG", "JPY", "SGD"),
    ("CA", "GB", "CAD", "GBP"), ("AU", "NZ", "AUD", "NZD"),
    ("CH", "GB", "CHF", "GBP"),
]

# FX rates (approximate, for realism)
FX_RATES = {
    "USD/MXN": 17.15, "USD/CNY": 7.24, "USD/INR": 83.45, "USD/PHP": 56.20,
    "USD/GBP": 0.79, "USD/JPY": 149.80, "USD/EUR": 0.92, "USD/SGD": 1.34,
    "USD/BRL": 4.97, "USD/CAD": 1.36, "USD/AUD": 1.53, "USD/CHF": 0.88,
    "GBP/INR": 105.63, "GBP/EUR": 1.16, "GBP/SGD": 1.70, "GBP/HKD": 9.92,
    "EUR/CHF": 0.96, "EUR/JPY": 162.83, "SGD/HKD": 5.83, "SGD/AUD": 1.14,
    "JPY/AUD": 0.0102, "JPY/SGD": 0.0090, "CAD/GBP": 0.58,
    "AUD/NZD": 1.08, "CHF/GBP": 0.90,
}

# ---------------------------------------------------------------------------
# Bank Profiles
# ---------------------------------------------------------------------------

BANK_PROFILES = {
    "BOFA": {
        "bank_id": "BOFA",
        "name": "Bank of America",
        "bic_family": ["BOFAUS3N", "BOFAUS6S", "BOFAGB2L"],
        "platform_alias": "CashPro / GPP Hub",
        "legacy_system": "FTS-2000 (COBOL)",
        "corridors_primary": ["USD-EUR", "USD-GBP", "USD-SGD", "USD-JPY"],
        "client_archetypes": [
            "Siemens AG Treasury",
            "Rio Tinto Commodities",
            "Merck FX Desk",
        ],
        "risk_posture": "OCC supervised · DFAST · Basel III LCR",
        "hosts": ["cashpro-prod-use1-{:03d}", "gpp-hub-prod-euw1-{:03d}"],
        "pods": ["cashpro-gw-{}", "gpp-sanctions-{}", "fts2000-adapter-{}"],
    },
    "CITI": {
        "bank_id": "CITI",
        "name": "Citibank",
        "bic_family": ["CITIUS33", "CITIGB2L", "CITISGSG"],
        "platform_alias": "TTS / CitiDirect",
        "legacy_system": "FLEXCUBE 11 (COBOL)",
        "corridors_primary": ["USD-CNY", "USD-BRL", "USD-INR", "USD-SGD"],
        "client_archetypes": [
            "Shell Energy Trading",
            "Procter & Gamble Treasury",
            "SoftBank FX",
        ],
        "risk_posture": "Fed + OCC dual supervised · GSIB · FRTB",
        "hosts": ["tts-prod-use1-{:03d}", "citidirect-prod-euw1-{:03d}"],
        "pods": ["tts-gateway-{}", "tts-sanctions-{}", "flexcube-adapter-{}"],
    },
    "JPM": {
        "bank_id": "JPM",
        "name": "JPMorgan Chase",
        "bic_family": ["CHASUS33", "CHASGB2L", "CHASDEFX"],
        "platform_alias": "J.P. Morgan ACCESS",
        "legacy_system": "Hogan CBS (COBOL)",
        "corridors_primary": ["USD-JPY", "USD-CHF", "USD-AUD", "USD-EUR"],
        "client_archetypes": [
            "Apple Treasury Operations",
            "Boeing Supply Chain",
            "TOTAL Energy Hedging",
        ],
        "risk_posture": "Fed supervised · GSIB surcharge · CCAR stress test",
        "hosts": ["access-prod-use1-{:03d}", "jpm-pay-prod-euw1-{:03d}"],
        "pods": ["access-gateway-{}", "jpm-sanctions-{}", "hogan-adapter-{}"],
    },
    "WF": {
        "bank_id": "WF",
        "name": "Wells Fargo",
        "bic_family": ["WFBIUS6S", "WFBIGB2L", "WFBIUS66"],
        "platform_alias": "CEO Portal / WF Global Pay",
        "legacy_system": "MISER CBS (COBOL)",
        "corridors_primary": ["USD-MXN", "USD-CAD", "USD-EUR", "USD-GBP"],
        "client_archetypes": [
            "Chevron Energy Operations",
            "Walmart Supply Payments",
            "Ford Dealer Network",
        ],
        "risk_posture": "OCC supervised · Consent Order context · Fed stress test",
        "hosts": ["ceo-prod-usw2-{:03d}", "wfgp-prod-euw1-{:03d}"],
        "pods": ["ceo-gateway-{}", "wf-sanctions-{}", "miser-adapter-{}"],
    },
}

# ---------------------------------------------------------------------------
# Incident Timeline Templates
# ---------------------------------------------------------------------------

FLAGSHIP_TIMELINE_MINUTES = {
    0: "sanctions_latency_spike",
    2: "circuit_breaker_half_open",
    3: "queue_depth_rising",
    5: "legacy_retry_storm",
    7: "error_rate_spike",
    8: "sla_breach_flags",
    10: "fx_staleness",
    12: "peak_exposure",
    15: "ai_detection",
    18: "hitl_gate",
    20: "recovery_approved",
    22: "queue_draining",
    28: "circuit_breaker_closed",
    30: "incident_closed",
}

BACKUP_TIMELINE_MINUTES = {
    0: "address_quality_rejects_start",
    3: "rjct11_rate_rising",
    5: "manual_queue_growing",
    8: "cbpr_validation_failures",
    12: "ai_detection",
    15: "structured_address_fix_proposed",
    18: "hitl_gate",
    20: "batch_remediation_approved",
    25: "resubmission_complete",
    28: "incident_closed",
}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def make_trace_id() -> str:
    return uuid.uuid4().hex[:32]


def make_span_id() -> str:
    return uuid.uuid4().hex[:16]


def make_uetr() -> str:
    return str(uuid.uuid4())


def make_payment_id(bank_id: str, idx: int) -> str:
    return f"FT{datetime.now(timezone.utc).strftime('%Y%m%d')}-{bank_id}-{idx:06d}"


def corridor_key(sender: str, receiver: str) -> str:
    return f"{sender}-{receiver}"


def fx_pair(base: str, quote: str) -> str:
    return f"{base}/{quote}"


def jitter(base: float, pct: float = 0.1) -> float:
    return base * (1 + random.uniform(-pct, pct))


def pick_weighted(options: list, weights: list):
    return random.choices(options, weights=weights, k=1)[0]


def ts_offset(base: datetime, minutes: float) -> datetime:
    return base + timedelta(minutes=minutes)


def ts_ms(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)


# ---------------------------------------------------------------------------
# Core generators
# ---------------------------------------------------------------------------

def generate_payments(
    bank_id: str,
    n: int,
    incident_start: datetime,
    progress: Progress,
) -> list[dict]:
    """Generate n payment events for a given bank profile."""
    bp = BANK_PROFILES[bank_id]
    payments = []

    # Determine incident windows
    flagship_start = incident_start
    flagship_end = flagship_start + timedelta(minutes=30)
    backup_start = flagship_start - timedelta(hours=2)
    backup_end = backup_start + timedelta(minutes=28)

    n_flagship = int(n * 0.15)
    n_backup = int(n * 0.05)
    n_normal = n - n_flagship - n_backup

    task = progress.add_task(
        f"[cyan]Payments ({bank_id})", total=n
    )

    # Helper to build a single payment
    def build_payment(idx: int, incident_tag: str, base_time: datetime) -> dict:
        corridor = random.choice(CORRIDORS)
        sender_c, receiver_c, base_ccy, quote_ccy = corridor

        # Use bank-specific BICs
        debtor_bic = random.choice(bp["bic_family"])
        creditor_bic = f"{receiver_c.upper()}BANKXX{random.randint(10,99)}"

        client = random.choice(bp["client_archetypes"])
        priority = pick_weighted(PRIORITIES, PRIORITY_WEIGHTS)
        segment = pick_weighted(CUSTOMER_SEGMENTS, SEGMENT_WEIGHTS)
        msg_type = pick_weighted(MSG_TYPES, MSG_TYPE_WEIGHTS)
        rail = random.choice(RAILS)

        amount_usd = round(random.lognormvariate(11, 2.5), 2)  # ~60K median, wide range
        amount_usd = max(500, min(amount_usd, 500_000_000))

        pair_key = fx_pair(base_ccy, quote_ccy)
        rate = FX_RATES.get(pair_key, 1.0)
        fx_rate = round(jitter(rate, 0.002), 6)
        fx_required = base_ccy != quote_ccy
        local_amount = round(amount_usd * fx_rate, 2) if fx_required else amount_usd

        # Timestamps — spread across the day for normal, clustered for incidents
        if incident_tag == "flagship":
            # Cluster around the incident window
            offset_min = random.uniform(0, 30)
            submitted = ts_offset(flagship_start, offset_min)
        elif incident_tag == "backup":
            offset_min = random.uniform(0, 28)
            submitted = ts_offset(backup_start, offset_min)
        else:
            # Spread across 24 hours before incident
            offset_hours = random.uniform(-24, 0)
            submitted = ts_offset(incident_start, offset_hours * 60)

        # Processing timestamps
        sanctions_start = submitted + timedelta(milliseconds=random.randint(50, 300))
        queue_wait_ms = random.randint(5, 200)
        retry_count = 0
        retry_reason = None
        cb_state = "CLOSED"
        sanctions_flag = "CLEAR"
        status = "COMPLETED"
        reject_code = None
        op_risk = round(random.uniform(0.01, 0.15), 3)

        if incident_tag == "flagship":
            # Inject failure patterns based on timeline position
            minutes_in = (submitted - flagship_start).total_seconds() / 60
            if 0 <= minutes_in <= 12:
                # Degraded state
                sanctions_flag = random.choices(
                    ["TIMEOUT", "CLEAR", "NEAR_MATCH", "TIMEOUT"],
                    weights=[0.45, 0.25, 0.1, 0.2], k=1
                )[0]
                if sanctions_flag == "TIMEOUT":
                    status = random.choice(["STUCK", "TIMEOUT", "RJCT08"])
                    reject_code = REJECT_CODES.get(status)
                    queue_wait_ms = random.randint(3000, 15000)
                    retry_count = random.randint(1, 5)
                    retry_reason = "sanctions-svc timeout"
                    cb_state = random.choice(["HALF_OPEN", "OPEN"])
                    op_risk = round(random.uniform(0.6, 0.95), 3)
                else:
                    status = "COMPLETED" if random.random() > 0.3 else "PENDING"
                    queue_wait_ms = random.randint(500, 5000)
                    op_risk = round(random.uniform(0.2, 0.5), 3)
            elif 12 < minutes_in <= 20:
                # Peak / detection / approval
                sanctions_flag = random.choices(
                    ["TIMEOUT", "CLEAR"], weights=[0.6, 0.4], k=1
                )[0]
                if sanctions_flag == "TIMEOUT":
                    status = "STUCK"
                    retry_count = random.randint(3, 7)
                    retry_reason = "sanctions-svc timeout + legacy retry storm"
                    cb_state = "OPEN"
                    queue_wait_ms = random.randint(8000, 25000)
                    op_risk = round(random.uniform(0.8, 0.99), 3)
                else:
                    status = "PENDING"
                    queue_wait_ms = random.randint(2000, 8000)
            else:
                # Recovery phase
                status = random.choices(
                    ["COMPLETED", "COMPLETED", "COMPLETED", "PENDING"],
                    k=1
                )[0]
                cb_state = random.choice(["HALF_OPEN", "CLOSED"])
                queue_wait_ms = random.randint(100, 1500)
                op_risk = round(random.uniform(0.05, 0.25), 3)

        elif incident_tag == "backup":
            minutes_in = (submitted - backup_start).total_seconds() / 60
            if 0 <= minutes_in <= 15:
                if random.random() < 0.4:
                    status = "RJCT11"
                    reject_code = REJECT_CODES["RJCT11"]
                    sanctions_flag = "CLEAR"
                    retry_count = random.randint(0, 2)
                    retry_reason = "CBPR+ unstructured address rejection"
                    op_risk = round(random.uniform(0.3, 0.7), 3)
            else:
                status = random.choices(
                    ["COMPLETED", "COMPLETED", "PENDING"], k=1
                )[0]

        # Compute rest of timestamps based on status
        sanctions_dur = random.randint(50, 500) if sanctions_flag == "CLEAR" else random.randint(3000, 15000)
        sanctions_end = sanctions_start + timedelta(milliseconds=sanctions_dur)

        fx_start = sanctions_end + timedelta(milliseconds=random.randint(10, 100))
        fx_dur = random.randint(20, 300) if fx_required else 0
        fx_end = fx_start + timedelta(milliseconds=fx_dur)

        routing_start = fx_end + timedelta(milliseconds=random.randint(10, 50))
        routing_dur = random.randint(30, 500)
        routing_end = routing_start + timedelta(milliseconds=routing_dur)

        legacy_start = routing_end + timedelta(milliseconds=random.randint(10, 100))
        legacy_dur = random.randint(100, 2000)
        legacy_end = legacy_start + timedelta(milliseconds=legacy_dur)

        settled_at = legacy_end + timedelta(milliseconds=random.randint(50, 500)) if status == "COMPLETED" else None

        sla_target = 30 if priority == "HIGH" else 120 if priority == "NORMAL" else 480
        elapsed_min = (datetime.now(timezone.utc) - submitted).total_seconds() / 60 if settled_at is None else (settled_at - submitted).total_seconds() / 60
        sla_breach_risk = elapsed_min > sla_target * 0.8

        deadline = submitted + timedelta(minutes=sla_target)

        return {
            "payment_id": make_payment_id(bank_id, idx),
            "trace_id": make_trace_id(),
            "bank_profile": bank_id,
            "corridor": corridor_key(sender_c, receiver_c),
            "sender_country": sender_c,
            "receiver_country": receiver_c,
            "amount_usd": round(amount_usd, 2),
            "local_amount": round(local_amount, 2),
            "currency": base_ccy,
            "rail": rail,
            "channel": random.choice(["API", "SWIFT-FIN", "H2H", "Portal"]),
            "priority": priority,
            "customer_segment": segment,
            "client_archetype": client,
            "debtor_name": fake.company(),
            "creditor_name": fake.company(),
            "debtor_bic": debtor_bic,
            "creditor_bic": creditor_bic,
            "debtor_account": fake.iban(),
            "creditor_account": fake.iban(),
            "msg_type": msg_type,
            "status": status,
            "reject_code": reject_code,
            "submitted_at": submitted.isoformat(),
            "sanctions_start": sanctions_start.isoformat(),
            "sanctions_end": sanctions_end.isoformat(),
            "fx_start": fx_start.isoformat() if fx_required else None,
            "fx_end": fx_end.isoformat() if fx_required else None,
            "routing_start": routing_start.isoformat(),
            "routing_end": routing_end.isoformat(),
            "legacy_start": legacy_start.isoformat(),
            "legacy_end": legacy_end.isoformat(),
            "settled_at": settled_at.isoformat() if settled_at else None,
            "sanctions_flag": sanctions_flag,
            "fx_required": fx_required,
            "fx_rate": fx_rate if fx_required else None,
            "fx_rate_source": random.choice(["Reuters", "Bloomberg", "ECB", "WMR"]) if fx_required else None,
            "queue_wait_ms": queue_wait_ms,
            "retry_count": retry_count,
            "retry_reason": retry_reason,
            "circuit_breaker_state": cb_state,
            "settlement_deadline": deadline.isoformat(),
            "gpi_uetr": make_uetr(),
            "operational_risk_score": op_risk,
            "sla_target_minutes": sla_target,
            "sla_breach_risk": sla_breach_risk,
            "incident_tag": incident_tag if incident_tag else None,
        }

    # Generate normal payments
    for i in range(n_normal):
        payments.append(build_payment(i, "", incident_start))
        progress.update(task, advance=1)

    # Generate flagship incident payments
    for i in range(n_flagship):
        payments.append(build_payment(n_normal + i, "flagship", incident_start))
        progress.update(task, advance=1)

    # Generate backup incident payments
    for i in range(n_backup):
        payments.append(build_payment(n_normal + n_flagship + i, "backup", incident_start))
        progress.update(task, advance=1)

    return payments


def generate_trace_spans(
    payments: list[dict],
    bank_id: str,
    progress: Progress,
) -> list[dict]:
    """Generate distributed trace spans correlated to payments."""
    bp = BANK_PROFILES[bank_id]
    spans = []
    task = progress.add_task(f"[green]Trace spans ({bank_id})", total=len(payments))

    for pmt in payments:
        trace_id = pmt["trace_id"]
        base_time = dtparser.parse(pmt["submitted_at"])

        # Root span
        root_span = make_span_id()
        root_end = base_time + timedelta(milliseconds=random.randint(500, 30000))

        # Build span chain: channel → orchestration → sanctions → fx → routing → legacy-hub → rail-adapter → settlement
        parent = root_span
        current_time = base_time
        for svc in SERVICES:
            span_id = make_span_id()
            dur_ms = random.randint(10, 500)
            svc_status = "OK"
            http_status = 200
            error_code = None
            error_msg = None

            if svc == "sanctions" and pmt["sanctions_flag"] in ("TIMEOUT", "HIT"):
                dur_ms = random.randint(3000, 15000)
                svc_status = "TIMEOUT" if pmt["sanctions_flag"] == "TIMEOUT" else "ERROR"
                http_status = 504 if svc_status == "TIMEOUT" else 403
                error_code = "SANCTIONS_TIMEOUT" if svc_status == "TIMEOUT" else "SANCTIONS_HIT"
                error_msg = f"Upstream timeout after {dur_ms}ms" if svc_status == "TIMEOUT" else "Entity match on screening list"

            if svc == "legacy-hub" and pmt["retry_count"] > 2:
                dur_ms = random.randint(2000, 8000)
                svc_status = "ERROR"
                http_status = 500
                error_code = "LEGACY_ACK_TIMEOUT"
                error_msg = f"ACK timeout from {bp['legacy_system']}, retry={pmt['retry_count']}"

            if svc == "fx" and not pmt["fx_required"]:
                dur_ms = 5
                svc_status = "OK"

            span_start = current_time
            span_end = span_start + timedelta(milliseconds=dur_ms)
            current_time = span_end + timedelta(milliseconds=random.randint(2, 20))

            host_tpl = random.choice(bp["hosts"])
            pod_tpl = random.choice(bp["pods"])

            spans.append({
                "span_id": span_id,
                "parent_span_id": parent,
                "trace_id": trace_id,
                "service": svc,
                "operation_name": f"{svc}.process_payment",
                "start_time": span_start.isoformat(),
                "end_time": span_end.isoformat(),
                "duration_ms": dur_ms,
                "status": svc_status,
                "http_status": http_status,
                "error_code": error_code,
                "error_message": error_msg,
                "tags": json.dumps({
                    "bank": bank_id,
                    "payment_id": pmt["payment_id"],
                    "corridor": pmt["corridor"],
                    "priority": pmt["priority"],
                }),
                "bank_profile": bank_id,
            })
            parent = span_id

        progress.update(task, advance=1)

    return spans


def generate_service_logs(
    payments: list[dict],
    bank_id: str,
    progress: Progress,
) -> list[dict]:
    """Generate realistic service log entries correlated to payments."""
    bp = BANK_PROFILES[bank_id]
    logs = []
    task = progress.add_task(f"[yellow]Service logs ({bank_id})", total=len(payments))

    log_templates = {
        "sanctions": {
            "normal": [
                "[INFO] sanctions-svc screening complete, txn_ref={pid}, result=CLEAR, duration={dur}ms, list=OFAC+EU+UK, entity_count=1",
                "[INFO] sanctions-svc batch screening, batch_size=1, avg_duration={dur}ms, all_clear=true",
            ],
            "timeout": [
                "[WARN] sanctions-svc upstream timeout after {dur}ms, txn_ref={pid}, retry={retry}/3, upstream=OFAC-SCSN-EU-01, circuit_breaker={cb}",
                "[ERROR] sanctions-svc connection pool exhausted, available=0/50, pending_requests={qdepth}, txn_ref={pid}, upstream=OFAC-SCSN-EU-01",
                "[CRIT] sanctions-svc SLA breach imminent, p99_latency={dur}ms, threshold=3000ms, affected_payments={qdepth}, corridor={corridor}",
            ],
            "hit": [
                "[WARN] sanctions-svc NEAR_MATCH detected, txn_ref={pid}, entity={entity}, score=0.{score}, list=OFAC-SDN, disposition=REVIEW",
            ],
        },
        "legacy-hub": {
            "normal": [
                "[INFO] {legacy} ACK received, msg_id=MT103-{bic}-{date}-{seq}, processing_time={dur}ms",
            ],
            "retry": [
                "[ERROR] {legacy} ACK timeout, msg_id=MT103-{bic}-{date}-{seq}, retry_storm=true, queue_depth={qdepth}, adapter={adapter}",
                "[WARN] {legacy} generating duplicate messages, msg_id=MT103-{bic}-{date}-{seq}, retry_count={retry}, queue_depth={qdepth}",
                "[CRIT] {legacy} queue overflow imminent, depth={qdepth}, max=5000, dequeue_rate=12/s, enqueue_rate=47/s",
            ],
        },
        "fx": {
            "normal": [
                "[INFO] fx-service rate applied, pair={pair}, rate={rate}, source={source}, age={age}s",
            ],
            "stale": [
                "[CRIT] fx-service stale rate detected, pair={pair}, rate_age={age}s, threshold=300s, blocking_payments={qdepth}",
                "[WARN] fx-service rate refresh failed, pair={pair}, source={source}, fallback_to=cached, age={age}s",
            ],
        },
        "channel": {
            "normal": [
                "[INFO] channel-svc payment received, payment_id={pid}, channel={channel}, msg_type={msg_type}, priority={priority}",
            ],
        },
        "orchestration": {
            "normal": [
                "[INFO] orchestration workflow started, trace_id={tid}, payment_id={pid}, steps=8, bank={bank}",
            ],
            "detection": [
                "[WARN] orchestration anomaly detected, pattern=multi-corridor-failure, affected={qdepth}, confidence=0.{score}",
                "[INFO] orchestration AI workflow triggered, scenario=sanctions_cascade, step=sentinel_detection",
            ],
        },
        "settlement": {
            "normal": [
                "[INFO] settlement confirmed, payment_id={pid}, rail={rail}, beneficiary_bank={cbic}, settlement_time={dur}ms",
            ],
            "failure": [
                "[ERROR] settlement rejected, payment_id={pid}, rail={rail}, reject_code={reject}, reason={reason}",
            ],
        },
    }

    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")

    for pmt in payments:
        base_time = dtparser.parse(pmt["submitted_at"])
        trace_id = pmt["trace_id"]
        pid = pmt["payment_id"]
        is_flagship = pmt.get("incident_tag") == "flagship"
        is_backup = pmt.get("incident_tag") == "backup"

        host_tpl = random.choice(bp["hosts"])
        pod_tpl = random.choice(bp["pods"])

        # Generate 1-4 log entries per payment (more for incidents)
        n_logs = random.randint(2, 5) if (is_flagship or is_backup) else random.randint(1, 2)

        for j in range(n_logs):
            log_time = base_time + timedelta(milliseconds=random.randint(50, 15000))
            svc = random.choice(SERVICES)
            severity = "INFO"
            msg = ""

            dur = random.randint(50, 500)
            qdepth = random.randint(10, 50)
            retry = pmt["retry_count"]

            if is_flagship and svc == "sanctions" and pmt["sanctions_flag"] == "TIMEOUT":
                severity = random.choice(["WARN", "ERROR", "CRITICAL"])
                dur = random.randint(3000, 15000)
                qdepth = random.randint(200, 2500)
                tpl = random.choice(log_templates["sanctions"]["timeout"])
                msg = tpl.format(
                    pid=pid, dur=dur, retry=retry, cb=pmt["circuit_breaker_state"],
                    qdepth=qdepth, corridor=pmt["corridor"],
                )
            elif is_flagship and svc == "legacy-hub" and retry > 2:
                severity = random.choice(["ERROR", "CRITICAL"])
                qdepth = random.randint(500, 3000)
                tpl = random.choice(log_templates["legacy-hub"]["retry"])
                msg = tpl.format(
                    legacy=bp["legacy_system"], bic=pmt["debtor_bic"], date=date_str,
                    seq=random.randint(1000, 9999), qdepth=qdepth, retry=retry,
                    adapter=bp["legacy_system"].split(" ")[0],
                )
            elif is_flagship and svc == "fx":
                pair = fx_pair(pmt["currency"], "EUR")
                age = random.randint(300, 5000) if random.random() < 0.3 else random.randint(10, 200)
                if age > 300:
                    severity = random.choice(["WARN", "CRITICAL"])
                    tpl = random.choice(log_templates["fx"]["stale"])
                else:
                    tpl = random.choice(log_templates["fx"]["normal"])
                msg = tpl.format(
                    pair=pair, rate=pmt.get("fx_rate", 1.0),
                    source=pmt.get("fx_rate_source", "Reuters"),
                    age=age, qdepth=qdepth,
                )
            elif is_flagship and svc == "orchestration" and random.random() < 0.2:
                severity = "WARN"
                tpl = random.choice(log_templates["orchestration"]["detection"])
                msg = tpl.format(
                    qdepth=random.randint(500, 2000), score=random.randint(85, 99),
                    tid=trace_id, pid=pid, bank=bank_id,
                )
            elif is_backup and pmt["status"] == "RJCT11":
                severity = "ERROR"
                msg = f"[ERROR] CBPR+ validation failure, payment_id={pid}, field=/Ustrd/PstlAdr, reject=FF01, corridor={pmt['corridor']}, msg_type={pmt['msg_type']}"
            elif svc == "channel":
                tpl = random.choice(log_templates["channel"]["normal"])
                msg = tpl.format(
                    pid=pid, channel=pmt["channel"],
                    msg_type=pmt["msg_type"], priority=pmt["priority"],
                )
            elif svc == "settlement" and pmt["status"] == "COMPLETED":
                tpl = random.choice(log_templates["settlement"]["normal"])
                msg = tpl.format(
                    pid=pid, rail=pmt["rail"],
                    cbic=pmt["creditor_bic"], dur=dur,
                )
            else:
                tpl = random.choice(log_templates.get(svc, log_templates["channel"])["normal"])
                try:
                    msg = tpl.format(
                        pid=pid, dur=dur, tid=trace_id,
                        pair=fx_pair(pmt["currency"], "EUR"),
                        rate=pmt.get("fx_rate", 1.0),
                        source=pmt.get("fx_rate_source", "Reuters"),
                        age=random.randint(5, 100),
                        channel=pmt.get("channel", "API"),
                        msg_type=pmt["msg_type"], priority=pmt["priority"],
                        legacy=bp["legacy_system"], bic=pmt["debtor_bic"],
                        date=date_str, seq=random.randint(1000, 9999),
                        qdepth=qdepth, retry=retry, cb=pmt["circuit_breaker_state"],
                        corridor=pmt["corridor"], bank=bank_id,
                        rail=pmt["rail"], cbic=pmt["creditor_bic"],
                        adapter=bp["legacy_system"].split(" ")[0],
                        reject=pmt.get("reject_code", ""), reason="",
                        entity=fake.company(), score=random.randint(60, 95),
                    )
                except (KeyError, IndexError):
                    msg = f"[INFO] {svc} processing payment_id={pid}, status=OK, duration={dur}ms"

            logs.append({
                "log_id": uuid.uuid4().hex[:16],
                "timestamp_ms": ts_ms(log_time),
                "service": svc,
                "host_id": host_tpl.format(random.randint(1, 20)),
                "pod_id": pod_tpl.format(uuid.uuid4().hex[:8]),
                "env": "production",
                "severity": severity,
                "message": msg,
                "error_code": pmt.get("reject_code"),
                "trace_id": trace_id,
                "payment_id": pid,
                "retry_count": retry,
                "circuit_breaker_state": pmt["circuit_breaker_state"],
                "upstream_service": "OFAC-SCSN-EU-01" if svc == "sanctions" else None,
                "duration_ms": dur,
                "additional_context": json.dumps({
                    "corridor": pmt["corridor"],
                    "incident_tag": pmt.get("incident_tag"),
                }),
                "bank_profile": bank_id,
            })

        progress.update(task, advance=1)

    return logs


def generate_service_metrics(
    bank_id: str,
    incident_start: datetime,
    progress: Progress,
) -> list[dict]:
    """Generate 1-minute time-series service metrics."""
    bp = BANK_PROFILES[bank_id]
    metrics = []
    # 2 hours of data: 1 hour before + 1 hour during/after
    start = incident_start - timedelta(hours=1)
    n_buckets = 120  # 2 hours × 60 minutes
    task = progress.add_task(f"[magenta]Metrics ({bank_id})", total=n_buckets * len(SERVICES))

    for minute in range(n_buckets):
        ts = start + timedelta(minutes=minute)
        minutes_from_incident = (ts - incident_start).total_seconds() / 60

        for svc in SERVICES:
            # Baseline metrics
            p50 = random.randint(20, 100)
            p95 = p50 * random.uniform(2, 4)
            p99 = p95 * random.uniform(1.5, 3)
            error_rate = round(random.uniform(0.01, 0.5), 3)
            throughput = round(random.uniform(50, 200), 1)
            queue_depth = random.randint(5, 50)
            reject_count = random.randint(0, 2)
            retry_count = random.randint(0, 3)

            # Inject incident patterns
            if 0 <= minutes_from_incident <= 30:
                phase = minutes_from_incident / 30  # 0→1 over incident

                if svc == "sanctions":
                    if minutes_from_incident < 15:
                        # Degradation ramp
                        factor = 1 + (minutes_from_incident / 15) * 40
                        p50 = int(p50 * factor)
                        p95 = int(p95 * factor * 1.5)
                        p99 = int(p99 * factor * 2)
                        error_rate = round(min(error_rate * factor * 3, 95), 2)
                        throughput = round(throughput * max(0.1, 1 - phase), 1)
                        queue_depth = int(50 + minutes_from_incident * 180)
                    else:
                        # Recovery
                        recovery = (minutes_from_incident - 15) / 15
                        factor = max(1, 40 * (1 - recovery))
                        p50 = int(p50 * factor)
                        p95 = int(p95 * factor)
                        p99 = int(p99 * factor)
                        error_rate = round(max(0.01, 95 * (1 - recovery)), 2)
                        queue_depth = int(max(10, 2700 * (1 - recovery)))

                elif svc == "legacy-hub":
                    if 3 <= minutes_from_incident <= 22:
                        storm_intensity = min(1, (minutes_from_incident - 3) / 10)
                        retry_count = int(storm_intensity * random.randint(50, 300))
                        queue_depth = int(storm_intensity * random.randint(500, 3000))
                        error_rate = round(min(storm_intensity * 60, 80), 2)
                        p99 = int(p99 * (1 + storm_intensity * 15))

                elif svc == "fx":
                    if 10 <= minutes_from_incident <= 20:
                        error_rate = round(random.uniform(5, 25), 2)
                        p99 = int(p99 * random.uniform(3, 8))

            metrics.append({
                "metric_id": uuid.uuid4().hex[:16],
                "timestamp": ts.isoformat(),
                "service": svc,
                "metric_name": f"{svc}_health",
                "value": round(100 - error_rate, 2),
                "unit": "percent",
                "p50_ms": p50,
                "p95_ms": int(p95),
                "p99_ms": int(p99),
                "error_rate_pct": error_rate,
                "throughput_tps": throughput,
                "queue_depth": queue_depth,
                "reject_count": reject_count,
                "retry_count": retry_count,
                "bank_profile": bank_id,
            })
            progress.update(task, advance=1)

    return metrics


def generate_queue_metrics(
    bank_id: str,
    incident_start: datetime,
    progress: Progress,
) -> list[dict]:
    """Generate queue metrics time-series."""
    metrics = []
    start = incident_start - timedelta(hours=1)
    n_buckets = 120
    queues = [
        ("sanctions", "sanctions-inbound-q"),
        ("sanctions", "sanctions-outbound-q"),
        ("legacy-hub", "legacy-wire-outbound-q"),
        ("legacy-hub", "legacy-ack-inbound-q"),
        ("settlement", "settlement-pending-q"),
        ("routing", "routing-dispatch-q"),
    ]
    task = progress.add_task(f"[blue]Queue metrics ({bank_id})", total=n_buckets * len(queues))

    for minute in range(n_buckets):
        ts = start + timedelta(minutes=minute)
        minutes_from_incident = (ts - incident_start).total_seconds() / 60

        for svc, q_name in queues:
            depth = random.randint(2, 30)
            enqueue_rate = round(random.uniform(10, 50), 1)
            dequeue_rate = round(random.uniform(10, 50), 1)
            oldest_msg_ms = random.randint(100, 5000)
            dlq_depth = 0

            if 0 <= minutes_from_incident <= 30 and svc in ("sanctions", "legacy-hub"):
                if minutes_from_incident < 15:
                    ramp = minutes_from_incident / 15
                    depth = int(30 + ramp * 2700)
                    enqueue_rate = round(50 + ramp * 200, 1)
                    dequeue_rate = round(max(5, 50 - ramp * 40), 1)
                    oldest_msg_ms = int(5000 + ramp * 300000)
                    dlq_depth = int(ramp * random.randint(10, 100))
                else:
                    recovery = (minutes_from_incident - 15) / 15
                    depth = int(max(5, 2730 * (1 - recovery)))
                    enqueue_rate = round(max(20, 250 * (1 - recovery)), 1)
                    dequeue_rate = round(50 + recovery * 150, 1)
                    oldest_msg_ms = int(max(500, 305000 * (1 - recovery)))
                    dlq_depth = int(max(0, 100 * (1 - recovery)))

            metrics.append({
                "timestamp": ts.isoformat(),
                "service": svc,
                "queue_name": q_name,
                "depth": depth,
                "enqueue_rate": enqueue_rate,
                "dequeue_rate": dequeue_rate,
                "age_oldest_msg_ms": oldest_msg_ms,
                "dlq_depth": dlq_depth,
                "bank_profile": bank_id,
            })
            progress.update(task, advance=1)

    return metrics


def generate_sanctions_events(
    payments: list[dict],
    bank_id: str,
    progress: Progress,
) -> list[dict]:
    """Generate sanctions screening events."""
    events = []
    flagged = [p for p in payments if p["sanctions_flag"] != "CLEAR"]
    clear_sample = random.sample(
        [p for p in payments if p["sanctions_flag"] == "CLEAR"],
        min(500, len([p for p in payments if p["sanctions_flag"] == "CLEAR"])),
    )
    subset = flagged + clear_sample
    task = progress.add_task(f"[red]Sanctions events ({bank_id})", total=len(subset))

    for pmt in subset:
        base_time = dtparser.parse(pmt["sanctions_start"])
        processing_ms = random.randint(50, 500)

        if pmt["sanctions_flag"] == "TIMEOUT":
            processing_ms = random.randint(3000, 15000)
        elif pmt["sanctions_flag"] == "HIT":
            processing_ms = random.randint(200, 1000)
        elif pmt["sanctions_flag"] == "NEAR_MATCH":
            processing_ms = random.randint(500, 2000)

        events.append({
            "event_id": uuid.uuid4().hex[:16],
            "timestamp": base_time.isoformat(),
            "payment_id": pmt["payment_id"],
            "trace_id": pmt["trace_id"],
            "entity_screened": pmt["debtor_name"],
            "list_matched": random.choice(["OFAC-SDN", "EU-CONSOLIDATED", "UK-HMT", "UN-SANCTIONS"]) if pmt["sanctions_flag"] in ("HIT", "NEAR_MATCH") else None,
            "match_score": round(random.uniform(0.7, 0.99), 3) if pmt["sanctions_flag"] in ("HIT", "NEAR_MATCH") else None,
            "match_type": random.choice(["EXACT", "FUZZY", "NEAR"]) if pmt["sanctions_flag"] in ("HIT", "NEAR_MATCH") else None,
            "disposition": "CLEAR" if pmt["sanctions_flag"] == "CLEAR" else "REVIEW" if pmt["sanctions_flag"] == "NEAR_MATCH" else "BLOCK" if pmt["sanctions_flag"] == "HIT" else "TIMEOUT",
            "processing_ms": processing_ms,
            "bank_profile": bank_id,
        })
        progress.update(task, advance=1)

    return events


# ---------------------------------------------------------------------------
# Workflow JSON generator
# ---------------------------------------------------------------------------

def generate_flagship_workflow(bank_id: str) -> dict:
    """Generate the precomputed 9-step deterministic workflow for a bank."""
    bp = BANK_PROFILES[bank_id]
    incident_start = datetime(2025, 3, 19, 23, 17, 0, tzinfo=timezone.utc)

    legacy = bp["legacy_system"]
    bic = bp["bic_family"][0]
    clients = bp["client_archetypes"]
    corridor = bp["corridors_primary"][0]

    steps = [
        {
            "step": 1,
            "agent": "Sentinel Agent",
            "input_summary": f"SWIFT rail health degrading — p95 latency 3,847ms on sanctions-svc",
            "finding_summary": f"Anomaly detected: sanctions-svc timeout rate 47x baseline. Circuit breaker HALF_OPEN on OFAC-SCSN-EU-01. 847 payments queuing across {corridor} corridor.",
            "confidence": 94,
            "handoff_target": "Correlator Agent",
            "evidence_refs": [f"span_{uuid.uuid4().hex[:8]}", f"log_{uuid.uuid4().hex[:8]}"],
            "business_signal": "Queue depth: 847 payments, $61M notional",
            "duration_ms": 1240,
            "static_narrative": f"The Sentinel Agent detected a critical anomaly in the {corridor} corridor at 23:17 EST. Sanctions screening latency crossed 3,800ms — 47 times the baseline — triggering a circuit breaker on the OFAC SCSN EU node. 847 high-value payments from {clients[0]}, {clients[1]}, and {clients[2]} are now queuing behind the {bp['platform_alias']} gateway.",
            "scoreboard_delta": {"value_at_risk_m": 61, "payments_stuck": 847, "sla_breach_minutes": 43},
        },
        {
            "step": 2,
            "agent": "Correlator Agent",
            "input_summary": f"847 payment failures + {legacy} adapter telemetry + MQ depth signals",
            "finding_summary": f"Root cause chain identified: sanctions-svc connection pool saturated → {legacy} interpreting timeouts as soft-fail → 3x retry amplification → queue depth 2,847.",
            "confidence": 91,
            "handoff_target": "Log Cluster Agent",
            "evidence_refs": [f"span_{uuid.uuid4().hex[:8]}", f"metric_{uuid.uuid4().hex[:8]}", f"trace_{uuid.uuid4().hex[:8]}"],
            "business_signal": f"Retry storm: {legacy} generating 3x message volume",
            "duration_ms": 1870,
            "static_narrative": f"Cross-referencing 847 payment traces with {legacy} adapter telemetry reveals the amplification chain. The sanctions service connection pool (50 threads) is fully saturated. {legacy} — the bank's COBOL-era settlement adapter — interprets every timeout as a retryable soft failure and re-submits 3 times per message. This turned a linear latency spike into an exponential queue growth event. The {bp['platform_alias']} message queue has grown from 12 to 2,847 messages.",
            "scoreboard_delta": {"value_at_risk_m": 98, "payments_stuck": 1247, "sla_breach_minutes": 38},
        },
        {
            "step": 3,
            "agent": "Log Cluster Agent",
            "input_summary": f"12,847 log entries from sanctions-svc, {legacy}, MQ broker, fx-engine",
            "finding_summary": f"4 semantic clusters: sanctions-timeout (38%), {legacy} retry-noise (41%), queue-overflow (15%), fx-staleness (6%). Retry noise masks root cause in manual triage.",
            "confidence": 89,
            "handoff_target": "Cohort Agent",
            "evidence_refs": [f"cluster_{uuid.uuid4().hex[:6]}" for _ in range(4)],
            "business_signal": "41% of logs are retry noise masking root cause",
            "duration_ms": 2340,
            "static_narrative": f"Semantic clustering of 12,847 log entries reveals the signal-to-noise problem. {legacy} retry noise constitutes 41% of all log volume — in a traditional SOC, analysts would spend hours filtering these before reaching the sanctions root cause (38%). The AI semantic engine cut through this in 2.3 seconds. A secondary FX rate staleness cluster (6%) indicates the USD/EUR rate cache is aging beyond threshold, creating a downstream risk for any payments that do clear.",
            "scoreboard_delta": {"value_at_risk_m": 124, "payments_stuck": 1247, "sla_breach_minutes": 33},
        },
        {
            "step": 4,
            "agent": "Cohort Agent",
            "input_summary": "Clustered failure patterns + active payment records + client SLA data",
            "finding_summary": f"Affected cohort: 1,247 payments across 3 clients. {clients[0]}: 487 ($74M). {clients[1]}: 412 ($63M). {clients[2]}: 348 ($45M). All stuck in sanctions-check-pending.",
            "confidence": 97,
            "handoff_target": "Impact Agent",
            "evidence_refs": [f"cohort_{uuid.uuid4().hex[:6]}" for _ in range(3)],
            "business_signal": f"3 Tier-1 clients affected: {', '.join(clients)}",
            "duration_ms": 980,
            "static_narrative": f"Complete cohort identification: 1,247 payments totaling $182M across three institutional clients. {clients[0]} has the largest exposure at $74M with a time-critical batch sweep that must settle before the Tokyo FX window. {clients[1]} has $63M in queued energy hedging payments. {clients[2]} has $45M in supply chain settlements. All 1,247 payments are frozen in sanctions-check-pending state with BIC {bic} as originator.",
            "scoreboard_delta": {"value_at_risk_m": 182, "payments_stuck": 1247, "sla_breach_minutes": 28},
        },
        {
            "step": 5,
            "agent": "Impact Agent",
            "input_summary": "1,247-payment cohort + FX window schedules + regulatory thresholds",
            "finding_summary": f"Total value at risk: $182M. FX settlement window closes in 28 min. GPI SLA breach on all 1,247 payments. Regulatory reporting trigger if >$100M delayed >60min.",
            "confidence": 95,
            "handoff_target": "Repair Agent",
            "evidence_refs": [f"sla_{uuid.uuid4().hex[:6]}", f"reg_{uuid.uuid4().hex[:6]}", f"fx_{uuid.uuid4().hex[:6]}"],
            "business_signal": "SLA breach: 1,247 payments, $182M, 28 min to FX close",
            "duration_ms": 1120,
            "static_narrative": f"Business impact is severe and time-critical. $182M at risk with a hard deadline — the FX settlement window closes at 23:45 UTC (28 minutes). All 1,247 payments are in GPI SLA breach. The {bp['risk_posture']} framework triggers mandatory regulatory reporting if >$100M remains delayed beyond 60 minutes. Manual alternative: estimated 72 ops-hours across three regional investigation teams, well beyond the window.",
            "scoreboard_delta": {"value_at_risk_m": 182, "payments_stuck": 1247, "sla_breach_minutes": 28},
        },
        {
            "step": 6,
            "agent": "Repair Agent",
            "input_summary": f"Impact assessment + {bp['platform_alias']} topology + redundancy paths",
            "finding_summary": f"3 remediation options generated. Recommended: Reroute via REFINITIV-WCO-US-01 (speed 9/10, risk 3/10). Backup vendor verified healthy — 99.97% uptime.",
            "confidence": 92,
            "handoff_target": "Governance Agent",
            "evidence_refs": [f"repair_{uuid.uuid4().hex[:6]}" for _ in range(3)],
            "business_signal": "Recommended: reroute via backup sanctions provider, est. 4 min",
            "duration_ms": 1560,
            "static_narrative": f"Evaluated {bp['platform_alias']} topology and identified three remediation paths. Top recommendation: reroute all 1,247 queued payments through REFINITIV-WCO-US-01 (secondary sanctions vendor). This secondary provider has maintained 99.97% uptime over the past 30 days and has spare capacity. Critically, this is not a sanctions bypass — all payments still undergo full OFAC+EU+UK screening through an equivalent provider. Estimated 4-minute switchover including queue drain.",
            "scoreboard_delta": {"value_at_risk_m": 182, "payments_stuck": 1247, "sla_breach_minutes": 24},
        },
        {
            "step": 7,
            "agent": "Governance Agent",
            "input_summary": "3 remediation options with risk/speed/impact tradeoff matrix",
            "finding_summary": f"HUMAN APPROVAL REQUIRED. Value ($182M) exceeds autonomous threshold ($50M). Escalating to authorized operator. Countdown: FX window 24 min.",
            "confidence": 100,
            "handoff_target": "HITL Cockpit",
            "evidence_refs": [f"gov_{uuid.uuid4().hex[:6]}", f"auth_{uuid.uuid4().hex[:6]}"],
            "business_signal": "Governance gate: $182M exceeds $50M autonomous limit",
            "duration_ms": 480,
            "static_narrative": f"Under {bp['risk_posture']} governance framework, remediation actions affecting >$50M require human-in-the-loop approval. The $182M exposure is 3.6x the autonomous threshold. Escalating to the HITL cockpit with all three options, tradeoff analysis, and the 24-minute countdown. The Governance Agent has pre-validated Option A against the bank's compliance rulebook — no sanctions bypass, all screening maintained through equivalent vendor.",
            "scoreboard_delta": {"value_at_risk_m": 182, "payments_stuck": 1247, "sla_breach_minutes": 24},
        },
        {
            "step": 8,
            "agent": "Recovery Agent",
            "input_summary": "Approved: Option A — reroute via REFINITIV-WCO-US-01",
            "finding_summary": f"Executing 6-step recovery. Queue redirected. {legacy} retry cycle halted. Draining 1,247 payments at 52 payments/min. Circuit breaker transitioning CLOSED.",
            "confidence": 96,
            "handoff_target": "Verification Agent",
            "evidence_refs": [f"exec_{uuid.uuid4().hex[:6]}" for _ in range(4)],
            "business_signal": "Recovery in progress: 52 payments/min drain rate",
            "duration_ms": 240000,
            "static_narrative": f"Recovery sequence executing. REFINITIV-WCO-US-01 activated and confirmed healthy. Message queue redirected from OFAC-SCSN-EU-01 to secondary vendor. {legacy} retry cycle halted — adapter set to single-attempt mode. Currently draining 1,247 queued payments at 52 payments per minute through the backup screening path. Circuit breaker on primary sanctions node transitioning to CLOSED as load is removed. Queue depth falling: 2,847 → 1,900 → 1,100.",
            "scoreboard_delta": {"value_at_risk_m": 45, "payments_stuck": 312, "sla_breach_minutes": 18},
        },
        {
            "step": 9,
            "agent": "Verification Agent",
            "input_summary": "Recovery execution logs + settlement confirmations + GPI tracker",
            "finding_summary": f"Recovery verified: 1,247/1,247 payments cleared. STP rate restored to 98%. MTTR: 11 min (vs 90 min manual). FX window met with 17 min to spare.",
            "confidence": 99,
            "handoff_target": "Audit Trail",
            "evidence_refs": [f"verify_{uuid.uuid4().hex[:6]}", f"settle_{uuid.uuid4().hex[:6]}", f"gpi_{uuid.uuid4().hex[:6]}"],
            "business_signal": "RESOLVED: 1,247 payments cleared, $182M protected, 17 min to spare",
            "duration_ms": 2680,
            "static_narrative": f"Final verification complete. All 1,247 payments have been processed through REFINITIV-WCO-US-01 and confirmed settled via GPI tracker. STP rate restored from 71% to 98%. Mean time to resolution: 11 minutes — compared to the estimated 90-minute manual baseline, that's an 88% improvement. The FX settlement window was met with 17 minutes to spare. {legacy} has resumed normal retry behavior. Circuit breaker on OFAC-SCSN-EU-01 now CLOSED. Full 9-step audit trail generated for {bp['risk_posture']} compliance review.",
            "scoreboard_delta": {"value_at_risk_m": 0, "payments_stuck": 0, "sla_breach_minutes": 17},
        },
    ]

    remediation_options = [
        {
            "id": "opt_a",
            "title": "Reroute via backup sanctions provider",
            "description": f"Switch OFAC screening to REFINITIV-WCO-US-01 (secondary vendor). Estimated 3min switchover. Full compliance screening maintained through equivalent provider.",
            "speed_score": 9,
            "risk_score": 3,
            "business_impact_score": 9,
            "estimated_recovery_min": 4,
            "payments_recovered": 1247,
            "value_recovered_m": 182,
            "requires_approval": True,
            "recommended": True,
        },
        {
            "id": "opt_b",
            "title": "Pause batch + retry at 06:00 EST",
            "description": f"Hold all queued payments. Schedule batch re-submission at 06:00 EST when sanctions service has been restarted. Misses current FX window.",
            "speed_score": 2,
            "risk_score": 1,
            "business_impact_score": 4,
            "estimated_recovery_min": 410,
            "payments_recovered": 1247,
            "value_recovered_m": 182,
            "requires_approval": True,
            "recommended": False,
        },
        {
            "id": "opt_c",
            "title": "Isolate affected cohort + manual review queue",
            "description": f"Quarantine 1,247 stuck payments. Route to manual review queue for Ops team triage. Partial recovery possible within 45 min.",
            "speed_score": 5,
            "risk_score": 2,
            "business_impact_score": 6,
            "estimated_recovery_min": 45,
            "payments_recovered": 980,
            "value_recovered_m": 143,
            "requires_approval": True,
            "recommended": False,
        },
    ]

    outcome = {
        "mttr_before_min": 90,
        "mttr_after_min": 11,
        "payments_recovered": 1247,
        "value_protected_m": 182,
        "ops_hours_saved": 72,
        "sla_breaches_prevented": 1247,
        "stp_rate_before_pct": 71,
        "stp_rate_after_pct": 98,
        "manual_investigations_avoided": 847,
        "audit_entries": 9,
    }

    return {
        "scenario_id": "sanctions_cascade",
        "bank_id": bank_id,
        "incident_start": incident_start.isoformat(),
        "steps": steps,
        "remediation_options": remediation_options,
        "outcome": outcome,
    }


# ---------------------------------------------------------------------------
# Updated bank profile JSONs for the frontend
# ---------------------------------------------------------------------------

def generate_bank_profile_json(bank_id: str) -> dict:
    bp = BANK_PROFILES[bank_id]
    return {
        "bank_id": bp["bank_id"],
        "name": bp["name"],
        "bic_family": bp["bic_family"],
        "platform_alias": bp["platform_alias"],
        "legacy_system": bp["legacy_system"],
        "corridors_primary": bp["corridors_primary"],
        "client_archetypes": bp["client_archetypes"],
        "risk_posture": bp["risk_posture"],
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate synthetic payments data")
    parser.add_argument(
        "--bank",
        default="ALL",
        choices=["BOFA", "CITI", "JPM", "WF", "ALL"],
        help="Bank profile to generate (default: ALL)",
    )
    parser.add_argument(
        "--scale",
        default="full",
        choices=["small", "medium", "full"],
        help="Dataset scale: small=5K, medium=25K, full=75K (default: full)",
    )
    args = parser.parse_args()

    n_payments = SCALE_MAP[args.scale]
    banks = list(BANK_PROFILES.keys()) if args.bank == "ALL" else [args.bank]
    incident_start = datetime(2025, 3, 19, 23, 17, 0, tzinfo=timezone.utc)

    # Resolve paths relative to project root
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    data_dir = project_root / "data"
    raw_dir = data_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    console.print()
    console.rule("[bold cyan]Agentic AI Payments — Synthetic Data Generator[/bold cyan]")
    console.print(f"  Scale:  [bold]{args.scale}[/bold] ({n_payments:,} payments per bank)")
    console.print(f"  Banks:  [bold]{', '.join(banks)}[/bold]")
    console.print(f"  Output: [bold]{data_dir}[/bold]")
    console.print()

    all_payments = []
    all_spans = []
    all_logs = []
    all_metrics = []
    all_queues = []
    all_sanctions = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        for bank_id in banks:
            console.print(f"\n[bold green]▶ Generating data for {BANK_PROFILES[bank_id]['name']}[/bold green]")

            # 1. Payments
            payments = generate_payments(bank_id, n_payments, incident_start, progress)
            all_payments.extend(payments)

            # 2. Trace spans (sample for efficiency — 20% of payments)
            sample_size = max(1000, len(payments) // 5)
            sampled_payments = random.sample(payments, min(sample_size, len(payments)))
            spans = generate_trace_spans(sampled_payments, bank_id, progress)
            all_spans.extend(spans)

            # 3. Service logs
            log_sample = random.sample(payments, min(sample_size, len(payments)))
            logs = generate_service_logs(log_sample, bank_id, progress)
            all_logs.extend(logs)

            # 4. Service metrics
            metrics = generate_service_metrics(bank_id, incident_start, progress)
            all_metrics.extend(metrics)

            # 5. Queue metrics
            queues = generate_queue_metrics(bank_id, incident_start, progress)
            all_queues.extend(queues)

            # 6. Sanctions events
            sanctions = generate_sanctions_events(payments, bank_id, progress)
            all_sanctions.extend(sanctions)

            # 7. Workflow JSON
            scenario_dir = data_dir / "scenarios" / bank_id
            scenario_dir.mkdir(parents=True, exist_ok=True)
            workflow = generate_flagship_workflow(bank_id)
            with open(scenario_dir / "flagship_workflow.json", "w") as f:
                json.dump(workflow, f, indent=2)

            # 8. Bank profile JSON (written to generator-profiles to avoid overwriting frontend JSONs)
            bp_dir = data_dir / "generator-profiles"
            bp_dir.mkdir(parents=True, exist_ok=True)
            bp_json = generate_bank_profile_json(bank_id)
            with open(bp_dir / f"{bank_id}.json", "w") as f:
                json.dump(bp_json, f, indent=2)

    # Write consolidated outputs
    console.print("\n[bold yellow]Writing output files...[/bold yellow]")

    # Payments — try parquet first, fall back to JSON
    try:
        df_payments = pd.DataFrame(all_payments)
        parquet_path = raw_dir / "payments.parquet"
        df_payments.to_parquet(parquet_path, index=False, engine="pyarrow")
        console.print(f"  ✓ {parquet_path} ({len(all_payments):,} records)")
    except Exception as e:
        json_path = raw_dir / "payments.json"
        with open(json_path, "w") as f:
            json.dump(all_payments, f)
        console.print(f"  ✓ {json_path} ({len(all_payments):,} records) [parquet failed: {e}]")

    # Other outputs as JSON
    outputs = [
        ("service_logs.json", all_logs),
        ("trace_spans.json", all_spans),
        ("service_metrics.json", all_metrics),
        ("queue_metrics.json", all_queues),
        ("sanctions_events.json", all_sanctions),
    ]
    for filename, data in outputs:
        path = raw_dir / filename
        with open(path, "w") as f:
            json.dump(data, f)
        console.print(f"  ✓ {path} ({len(data):,} records)")

    # Summary
    console.print()
    console.rule("[bold cyan]Generation Complete[/bold cyan]")

    table = Table(title="Dataset Summary")
    table.add_column("Dataset", style="cyan")
    table.add_column("Records", justify="right", style="green")
    table.add_column("Banks", style="yellow")

    table.add_row("Payments", f"{len(all_payments):,}", ", ".join(banks))
    table.add_row("Trace Spans", f"{len(all_spans):,}", ", ".join(banks))
    table.add_row("Service Logs", f"{len(all_logs):,}", ", ".join(banks))
    table.add_row("Service Metrics", f"{len(all_metrics):,}", ", ".join(banks))
    table.add_row("Queue Metrics", f"{len(all_queues):,}", ", ".join(banks))
    table.add_row("Sanctions Events", f"{len(all_sanctions):,}", ", ".join(banks))

    console.print(table)

    # Incident stats
    flagship_count = sum(1 for p in all_payments if p.get("incident_tag") == "flagship")
    backup_count = sum(1 for p in all_payments if p.get("incident_tag") == "backup")
    console.print(f"\n  Flagship incident payments: [bold red]{flagship_count:,}[/bold red] ({flagship_count/len(all_payments)*100:.1f}%)")
    console.print(f"  Backup incident payments:   [bold yellow]{backup_count:,}[/bold yellow] ({backup_count/len(all_payments)*100:.1f}%)")
    console.print(f"  Normal payments:            [bold green]{len(all_payments)-flagship_count-backup_count:,}[/bold green]")

    # Workflow files
    console.print("\n  Workflow JSONs:")
    for bank_id in banks:
        path = data_dir / "scenarios" / bank_id / "flagship_workflow.json"
        console.print(f"    ✓ {path}")

    console.print()


if __name__ == "__main__":
    main()
