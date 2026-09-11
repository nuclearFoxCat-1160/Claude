import { workoutMeta } from "../timeline";

function isCurrentWeek(week) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${week.startDate}T00:00:00`);
  const end = new Date(`${week.endDate}T23:59:59`);
  return today >= start && today <= end;
}

export default function WeekCard({ week, onToggle }) {
  const completedCount = week.workouts.filter((w) => w.completed).length;
  const current = isCurrentWeek(week);

  return (
    <section className={`week-card ${current ? "current" : ""}`}>
      <p className="date-range">{week.dateRangeLabel}</p>
      <h3>Week {week.weekNumber}</h3>

      <div className="progress-track">
        {week.workouts.map((w) => (
          <span key={w.id} className={`seg ${w.completed ? "done" : ""}`} />
        ))}
      </div>

      <p className="total-workouts">
        Total Workouts: <strong>{week.workouts.length}</strong>
      </p>

      <div>
        {week.workouts.map((w) => (
          <button
            key={w.id}
            className={`workout-row ${w.completed ? "done" : ""}`}
            onClick={() => onToggle(w.id)}
          >
            <span className={`swatch ${w.completed ? "done" : ""}`} />
            <span className="day">{w.day}</span>
            <span className="info">
              <span className="title">{w.type}</span>
              <span className="detail">{workoutMeta(w)}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="total-workouts" style={{ marginTop: 4 }}>
        {completedCount}/{week.workouts.length} completed
      </p>
    </section>
  );
}
