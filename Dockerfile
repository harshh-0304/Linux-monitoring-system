# ---- Stage: base Python image ----
# python:3.12-slim is a minimal Debian image with Python pre-installed.
# "slim" removes dev tools and docs → smaller image (~130 MB vs ~1 GB full).
FROM python:3.12-slim

# Set working directory inside the container.
# All subsequent commands run relative to /app.
WORKDIR /app

# --- Install system dependencies ---
# gcc is needed to compile some Python packages (like psutil's C extensions).
# We clean up apt lists afterwards to reduce image size.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

# --- Install Python dependencies FIRST (before copying app code) ---
# Docker builds images in layers. Each instruction is a layer.
# If only app code changes, Docker reuses the cached pip install layer.
# This makes rebuilds much faster during development.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Copy application code ---
# Done after pip install so code changes don't invalidate the pip cache.
COPY app/ ./app/

# --- Create data directory for SQLite database ---
RUN mkdir -p /data

# --- Environment defaults ---
# These can be overridden by docker-compose.yml or at runtime.
ENV DATABASE_URL=sqlite:////data/metrics.db
ENV COLLECT_INTERVAL_SECONDS=60
ENV AI_INTERVAL_SECONDS=300
ENV AI_ANALYSIS_WINDOW=10
ENV AI_MODEL=gemini-2.0-flash

# Expose port 8000 (the port uvicorn listens on).
# This doesn't actually publish the port — docker-compose does that.
EXPOSE 8000

# --- Healthcheck ---
# Docker will call this every 30s. If it fails 3 times, the container is
# marked "unhealthy". Useful for orchestrators like Docker Swarm/Kubernetes.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/').raise_for_status()"

# --- Start command ---
# uvicorn is the ASGI server that runs our FastAPI app.
# --host 0.0.0.0 means "listen on all network interfaces" (required in Docker).
# --workers 1 is important: multiple workers would each have their own
# scheduler instance, each collecting metrics independently (we don't want that).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
