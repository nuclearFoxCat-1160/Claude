import { usePlan, allWorkouts } from "../PlanContext";
import Header from "../components/Header";

export default function ProgressPage() {
  const { plan, loading, error } = usePlan();

  if (loading) return <div className="state-msg">Loading…</div>;
  if (error) return <div className="state-msg">Couldn't load plan: {error}</div>;
  if (!plan) return null;

  const workouts = allWorkouts(plan);
  const completed = workouts.filter((w) => w.completed);
  const totalDistance = workouts.reduce((sum, w) => sum + (w.completed ? w.distanceKm || 0 : 0), 0);

  let streak = 0;
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  for (const w of sorted) {
    if (w.completed) streak += 1;
    else break;
  }

  return (
    <>
      <Header title="Progress" />
      <div className="app-content">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="value">
              {completed.length}/{workouts.length}
            </div>
            <div className="label">Workouts completed</div>
          </div>
          <div className="stat-card">
            <div className="value">{streak}</div>
            <div className="label">Current streak</div>
          </div>
          <div className="stat-card">
            <div className="value">{totalDistance.toFixed(1)} km</div>
            <div className="label">Distance run</div>
          </div>
          <div className="stat-card">
            <div className="value">
              {plan.weeks.filter((w) => w.workouts.every((wo) => wo.completed)).length}/{plan.totalWeeks}
            </div>
            <div className="label">Weeks finished</div>
          </div>
        </div>

        <h3 style={{ margin: "4px 0 12px" }}>Weekly breakdown</h3>
        {plan.weeks.map((week) => {
          const done = week.workouts.filter((w) => w.completed).length;
          const pct = (done / week.workouts.length) * 100;
          return (
            <div className="week-bar-row" key={week.weekNumber}>
              <span className="wk-label">Week {week.weekNumber}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="wk-frac">
                {done}/{week.workouts.length}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
