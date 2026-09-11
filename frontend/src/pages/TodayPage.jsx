import { usePlan, allWorkouts } from "../PlanContext";
import Header from "../components/Header";

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function workoutMeta(w) {
  if (w.distanceKm) return `${w.detail} · ${w.distanceKm} km`;
  if (w.durationMin) return `${w.detail} · ${w.durationMin} min`;
  return w.detail;
}

export default function TodayPage() {
  const { plan, loading, error, toggle } = usePlan();

  if (loading) return <div className="state-msg">Loading…</div>;
  if (error) return <div className="state-msg">Couldn't load plan: {error}</div>;
  if (!plan) return null;

  const todayIso = toISO(new Date());
  const workouts = allWorkouts(plan);
  const todayWorkout = workouts.find((w) => w.date === todayIso);
  const nextWorkout = workouts
    .filter((w) => w.date >= todayIso && !w.completed)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <>
      <Header title="Today" />
      <div className="app-content">
        {todayWorkout ? (
          <div className="card today-card">
            <div className="big-icon">🏃</div>
            <h2>{todayWorkout.type}</h2>
            <p>{workoutMeta(todayWorkout)}</p>
            <button className="pill-btn" onClick={() => toggle(todayWorkout.id)}>
              {todayWorkout.completed ? "Completed ✓" : "Mark as completed"}
            </button>
          </div>
        ) : (
          <div className="card today-card">
            <div className="big-icon">😴</div>
            <h2>Rest day</h2>
            <p>No workout scheduled for today. Recover well.</p>
          </div>
        )}

        {nextWorkout && nextWorkout.id !== todayWorkout?.id && (
          <div className="card" style={{ marginTop: 16 }}>
            <p className="date-range">Up next · {nextWorkout.dayLabel}, {nextWorkout.date}</p>
            <h3 style={{ margin: "6px 0" }}>{nextWorkout.type}</h3>
            <p className="meta" style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
              {workoutMeta(nextWorkout)}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
