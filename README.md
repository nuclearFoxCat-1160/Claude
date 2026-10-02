# Running Plan Builder

A running plan builder web app: a 10-week "New To Running" plan that
progresses from a 20-minute walk-run to a continuous 10km run, with a
calendar to mark workouts complete after each run.

- `frontend/` — React (Vite) single-page app, dark UI matching the app design.
- `backend/` — Express API that generates the plan and persists completion state to `backend/data.json`.

## Plan structure

- 10 weeks, 3 sessions per week by default (Monday / Thursday / Friday).
- Week 1 starts with 20-minute walk-run intervals (e.g. run 1 min / walk 1.5 min x 8).
- Intervals lengthen and walk breaks shrink through weeks 2–4.
- From week 5 the long (Friday) session becomes a continuous run, growing from 3km to the week 10 goal: a continuous **10km run**.
- Workouts can be marked complete from the Plan tab, the Calendar tab, or the Today tab; completion state is shared everywhere.

## Running locally

Backend (http://localhost:4000):

```bash
cd backend
npm install
npm start
```

Frontend (http://localhost:5173, proxies `/api` to the backend):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in a browser (works well at mobile widths).

## API

- `GET /api/plan` — full plan with weeks and workouts.
- `POST /api/workouts/:id/toggle` — toggle a workout's completed state.
- `POST /api/plan/reset` — regenerate the plan, clearing all completion state.
