import { useMemo, useState } from "react";
import { usePlan, allWorkouts } from "../PlanContext";
import Header from "../components/Header";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function workoutMeta(w) {
  if (w.distanceKm) return `${w.detail} · ${w.distanceKm} km`;
  if (w.durationMin) return `${w.detail} · ${w.durationMin} min`;
  return w.detail;
}

export default function CalendarPage() {
  const { plan, loading, error, toggle } = usePlan();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date("2026-09-07T00:00:00")));
  const [selectedId, setSelectedId] = useState(null);

  const workoutsByDate = useMemo(() => {
    const map = {};
    if (plan) {
      for (const w of allWorkouts(plan)) {
        map[w.date] = w;
      }
    }
    return map;
  }, [plan]);

  if (loading) return <div className="state-msg">Loading calendar…</div>;
  if (error) return <div className="state-msg">Couldn't load plan: {error}</div>;
  if (!plan) return null;

  const monthStart = startOfMonth(cursor);
  const monthLabel = monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const firstDow = (monthStart.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const todayIso = toISO(new Date());

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
  }

  const selected = selectedId ? Object.values(workoutsByDate).find((w) => w.id === selectedId) : null;

  return (
    <>
      <Header title="Calendar" />
      <div className="app-content">
        <div className="calendar-header">
          <button
            className="calendar-nav-btn"
            onClick={() => setCursor(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2>{monthLabel}</h2>
          <button
            className="calendar-nav-btn"
            onClick={() => setCursor(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="calendar-grid">
          {DOW.map((d) => (
            <div key={d} className="calendar-dow">
              {d}
            </div>
          ))}
          {cells.map((date, idx) => {
            if (!date) return <div key={idx} className="calendar-day empty" />;
            const iso = toISO(date);
            const workout = workoutsByDate[iso];
            const classes = ["calendar-day"];
            if (workout) classes.push("scheduled");
            if (workout?.completed) classes.push("completed");
            if (iso === todayIso) classes.push("today");
            return (
              <button
                key={iso}
                className={classes.join(" ")}
                onClick={() => workout && setSelectedId(workout.id)}
                disabled={!workout}
              >
                {date.getDate()}
                {workout && <span className="mark" />}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="card workout-detail-card">
            <p className="date-range">
              Week {selected.weekNumber} · {selected.dayLabel}
            </p>
            <h3>{selected.type}</h3>
            <p className="meta">{workoutMeta(selected)}</p>
            <button className="pill-btn" onClick={() => toggle(selected.id)}>
              {selected.completed ? "Mark as not completed" : "Mark as completed"}
            </button>
          </div>
        )}

        {!selected && <p className="state-msg">Tap a highlighted day to view and complete that run.</p>}
      </div>
    </>
  );
}
