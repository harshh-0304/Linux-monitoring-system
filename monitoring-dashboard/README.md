# Linux Server Monitor — AIOps Dashboard

A production-grade, SaaS-quality monitoring dashboard for the AI-Powered Linux Server Monitor backend. Built with Next.js 15, TypeScript, Tailwind CSS, TanStack Query, and Recharts.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  monitoring-dashboard/ (Next.js 15 App Router)              │
│                                                             │
│  app/         ← Pages (Dashboard, Metrics, Alerts, AI,      │
│                 Health) with loading.tsx + error.tsx         │
│  components/  ← UI primitives + Feature components          │
│  services/    ← Axios API client layer (type-safe)          │
│  hooks/       ← TanStack Query hooks for all endpoints      │
│  types/       ← TypeScript interfaces matching backend      │
│  lib/         ← Utilities, constants, mock data             │
│  providers/   ← QueryClientProvider                         │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ http://localhost:8000
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: FastAPI on port 8000                               │
│  Auth: X-API-Key header                                      │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install dependencies

```bash
cd monitoring-dashboard
npm install
```

### 2. Configure environment

Copy `.env.local` and edit:

```bash
# Backend URL (your running Linux Monitor API)
NEXT_PUBLIC_API_URL=http://localhost:8000

# API key from your backend's .env
NEXT_PUBLIC_API_KEY=your_api_key_here

# Mock data mode (works without backend for UI development)
NEXT_PUBLIC_USE_MOCK_DATA=true  # set to false when backend is live
```

### 3. Start dev server

```bash
npm run dev
```

Visit **http://localhost:3000**

### 4. Build for production

```bash
npm run build
npm start
```

## Features

| Page | Endpoint | Description |
|------|----------|-------------|
| **Dashboard** | `/` | System overview, live gauges, AI insights, active alerts |
| **Metrics** | `/metrics` | Historical charts with time range selection |
| **Alerts** | `/alerts` | Alert history with search and severity filtering |
| **AI Insights** | `/ai-insights` | Gemini analysis history, anomaly explanations, risk scoring |
| **System Health** | `/health` | API, DB, Scheduler, Collector, Gemini health status |

## API Contract

See `API_CONTRACT.md` for the complete backend API reference extracted from `app/main.py`, `app/collector.py`, `app/ai_analyzer.py`, and `app/alerting.py`.

## Mock Data Mode

Set `NEXT_PUBLIC_USE_MOCK_DATA=true` in `.env.local` to develop the UI independently without a running backend. Mock data includes realistic random metrics, sample alerts, and fake AI analysis responses.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 15 (App Router) | Framework |
| TypeScript | Type safety |
| Tailwind CSS 4 | Styling (glassmorphism + dark theme) |
| TanStack Query | Server state + auto-refresh |
| Recharts | Area charts for metrics |
| Axios | HTTP client with API key interceptor |
| Lucide React | Icons |
| clsx + tailwind-merge | Class utilities |

## File Structure

```
monitoring-dashboard/
├── app/                    # Next.js App Router pages
│   ├── DashboardPage.tsx   # Dashboard logic (client)
│   ├── page.tsx            # Home route
│   ├── layout.tsx          # Root layout (providers)
│   ├── globals.css         # Tailwind + theme
│   ├── loading.tsx         # Dashboard loading skeleton
│   ├── error.tsx           # Global error boundary
│   ├── metrics/            # Metrics page
│   ├── alerts/             # Alerts page
│   ├── ai-insights/        # AI Insights page
│   └── health/             # System Health page
├── components/
│   ├── ui/                 # Primitives (GlassCard, Badge, Button, etc.)
│   ├── layout/             # App shell, sidebar, header
│   ├── dashboard/          # Dashboard widgets
│   ├── metrics/            # Charts + time range selector
│   ├── alerts/             # Alert table + filters
│   ├── ai/                 # Analysis cards + risk badges
│   └── health/             # Health check cards
├── services/               # Axios client + endpoint functions
├── hooks/                  # TanStack Query wrappers
├── types/                  # TypeScript interfaces
├── lib/                    # Constants, utils, mock data
└── providers/              # React context providers
```

## Design

- **Dark mode default** with glassmorphism cards (`backdrop-blur-xl`, `bg-white/[0.03]`)
- **Fully responsive** sidebar (collapses to overlay on mobile)
- **Auto-refresh** via TanStack Query `refetchInterval` (10s live, 30s history)
- **Loading skeletons** for every component
- **Error states** with retry buttons
- **Empty states** with actionable CTAs
