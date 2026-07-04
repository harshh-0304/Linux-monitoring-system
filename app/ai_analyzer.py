"""
ai_analyzer.py — Uses Google Gemini AI to analyze metric trends and detect anomalies.

How the AI analysis works:
  1. We fetch the last N metric snapshots from the database
  2. We format them as a table in a text prompt
  3. We send that prompt to Gemini via the Google AI Studio API
  4. Gemini responds with a natural-language analysis
  5. If an anomaly is detected, we trigger an alert

Why AI instead of just rules?
  - Rules are brittle: CPU at 79% is "fine" but CPU at 79% for 2 hours is NOT
  - AI understands context: "CPU spiked during a known backup window = normal"
  - AI can correlate multiple signals: "CPU + RAM both rising = likely memory leak"
  - AI gives actionable advice: "check top/htop for the offending process"
"""

import os
import logging
from datetime import datetime, timedelta

import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .database import MetricSnapshot, SessionLocal

logger = logging.getLogger(__name__)

# The Google AI Studio API key is loaded from the environment (set in .env file).
# Never put your actual key in source code.
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# How many recent snapshots to include in the AI prompt.
# 10 snapshots at 60s intervals = last 10 minutes of data.
ANALYSIS_WINDOW = int(os.getenv("AI_ANALYSIS_WINDOW", "10"))

# Model to use. gemini-2.0-flash is fast and cheap; gemini-1.5-pro is smarter.
AI_MODEL = os.getenv("AI_MODEL", "gemini-2.0-flash")


def _fetch_recent_snapshots(db: Session, n: int) -> list[MetricSnapshot]:
    """Fetch the N most recent metric snapshots from the database."""
    return (
        db.query(MetricSnapshot)
        .order_by(desc(MetricSnapshot.timestamp))
        .limit(n)
        .all()
    )


def _build_prompt(snapshots: list[MetricSnapshot]) -> str:
    """
    Format the snapshots as a structured text table for Gemini to read.

    The prompt engineering here is important:
    - We give Gemini clear context about what it's looking at
    - We specify exactly what we want back (structured analysis)
    - We tell it the format of the response we need
    """
    if not snapshots:
        return ""

    # Build a simple text table (oldest → newest)
    rows = []
    for s in reversed(snapshots):  # reverse so time goes forward
        ts = s.timestamp.strftime("%H:%M:%S")
        load = f"{s.load_avg_1:.2f}" if s.load_avg_1 is not None else "N/A"
        rows.append(
            f"  {ts} | CPU: {s.cpu_percent:5.1f}% | "
            f"RAM: {s.ram_percent:5.1f}% | "
            f"Disk: {s.disk_percent:5.1f}% | "
            f"Load1m: {load}"
        )

    table = "\n".join(rows)
    latest = snapshots[0]  # most recent

    prompt = f"""You are an expert Linux system administrator analyzing server metrics.

Here are the last {len(snapshots)} metric readings (most recent last):

{table}

Current server specs:
- CPU cores: {latest.cpu_count}
- Total RAM: {latest.ram_total_mb / 1024:.1f} GB
- Total Disk: {latest.disk_total_gb:.1f} GB

Analyze these metrics and respond in this exact format:

ANOMALY_DETECTED: [YES/NO]
SEVERITY: [NONE/WARNING/CRITICAL]
SUMMARY: [One sentence describing what you see]
ANALYSIS: [2-3 sentences explaining the trend, what might be causing it, and what to investigate]
RECOMMENDED_ACTION: [Specific Linux commands or steps to investigate/fix]

Rules:
- Only flag YES if there is a genuine concern (sustained high usage, worrying trend, or spike)
- A single high reading is less concerning than a sustained trend
- Consider that 80%+ CPU for a brief period during compilation is normal
- Flag CRITICAL only if immediate action is likely needed
- Be specific and actionable in your recommendations
"""
    return prompt


def analyze_metrics(db: Session | None = None) -> dict:
    """
    Fetch recent metrics and ask Gemini to analyze them.

    Returns a dict:
        {
            "anomaly_detected": bool,
            "severity": "none" | "warning" | "critical",
            "summary": str,
            "analysis": str,
            "recommended_action": str,
            "raw_response": str,
        }

    Returns a safe default dict if AI is not configured or fails.
    """
    default = {
        "anomaly_detected": False,
        "severity": "none",
        "summary": "AI analysis unavailable",
        "analysis": "",
        "recommended_action": "",
        "raw_response": "",
    }

    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set — skipping AI analysis")
        return default

    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        snapshots = _fetch_recent_snapshots(db, ANALYSIS_WINDOW)
        if len(snapshots) < 3:
            logger.info("Not enough snapshots for AI analysis yet (need >= 3)")
            return default

        prompt = _build_prompt(snapshots)

        # Configure the Gemini client with our API key
        genai.configure(api_key=GOOGLE_API_KEY)

        # GenerativeModel selects which Gemini model to use.
        # generate_content() sends the prompt and returns the response.
        model = genai.GenerativeModel(AI_MODEL)
        response = model.generate_content(prompt)

        raw = response.text
        result = _parse_ai_response(raw)
        result["raw_response"] = raw
        return result

    except Exception as e:
        err = str(e).lower()
        logger.error(f"AI analysis error (raw): {e}")
        if "api_key" in err or "permission" in err or "403" in err:
            logger.error("Invalid Google API key or permission denied")
        elif "quota" in err or "429" in err or "rate" in err:
            logger.warning("Google AI rate limit hit — skipping this analysis cycle")
        else:
            logger.error(f"AI analysis failed: {e}")
        return default
    finally:
        if close_db:
            db.close()


def _parse_ai_response(text: str) -> dict:
    """
    Parse Gemini's structured response into a Python dict.

    We use simple line-by-line parsing because the format is predictable.
    If Gemini goes off-format, we fall back to safe defaults.
    """
    result = {
        "anomaly_detected": False,
        "severity": "none",
        "summary": "",
        "analysis": "",
        "recommended_action": "",
    }

    for line in text.strip().splitlines():
        line = line.strip()
        if line.startswith("ANOMALY_DETECTED:"):
            val = line.split(":", 1)[1].strip().upper()
            result["anomaly_detected"] = val == "YES"
        elif line.startswith("SEVERITY:"):
            val = line.split(":", 1)[1].strip().lower()
            if val in ("none", "warning", "critical"):
                result["severity"] = val
        elif line.startswith("SUMMARY:"):
            result["summary"] = line.split(":", 1)[1].strip()
        elif line.startswith("ANALYSIS:"):
            result["analysis"] = line.split(":", 1)[1].strip()
        elif line.startswith("RECOMMENDED_ACTION:"):
            result["recommended_action"] = line.split(":", 1)[1].strip()

    return result
