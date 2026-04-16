# FinOps Tur — Frontend

Tur Assist Grubu bütçe & performans platformunun React 19 + Vite 8 + Tailwind v4 single-page uygulaması.

## Teknoloji

| | |
|---|---|
| React 19 · Vite 8 · TypeScript strict |
| Tailwind CSS v4 (`@tailwindcss/vite` + `@theme`) |
| Zustand 5 (UI state) + TanStack Query 5 (server state) |
| Axios (Bearer + refresh interceptor) · React Router 7 |
| Chart.js 4 + react-chartjs-2 |
| Playwright (E2E; şu an spec yok) |

Design system utility class'ları `src/styles/finopstur.css` içinde (prototip `docs/FinOpsTur_Prototip.html` birebir).

## Komutlar

```bash
pnpm install
pnpm dev          # Vite dev server — :3000, host:true
pnpm build        # tsc -b && vite build
pnpm lint
pnpm preview
```

API proxy'si `/api/v1` ve `/connect/token`'i `http://localhost:5100`'e yönlendiriyor (`vite.config.ts`). Backend için repo kökündeki `dotnet run --project src/BudgetTracker.Api`.

## Klasör yapısı

```
src/
├── pages/              # 11 sayfa (Dashboard, Budget, Actuals, Forecast, Variance, Reports, ...)
├── components/
│   ├── layout/         # AppLayout, Sidebar, TopNavBar, AuthGuard
│   ├── dashboard/      # FinOpsTrendChart, FinOpsSecondaryCharts
│   ├── forecast/       # ForecastChart
│   └── variance/       # WaterfallChart
├── stores/             # auth, appContext (Zustand)
├── lib/                # api.ts (axios), chart-config.ts (Chart.js register), query.ts
├── styles/finopstur.css
├── index.css           # @theme palette + finopstur.css import
└── main.tsx
```

Detay için repo kökünde `docs/TECH_STACK.md`.
