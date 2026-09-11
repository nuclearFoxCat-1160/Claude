function formatDate(iso) {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export default function PlanSummaryCard({ plan, onManage }) {
  const completedWeeks = plan.weeks.filter((w) => w.workouts.every((wo) => wo.completed)).length;

  return (
    <section className="card plan-summary">
      <div className="plan-summary-top">
        <div>
          <h2>{plan.name}</h2>
          <p className="end-date">
            Your end date: <strong>{formatDate(plan.endDate)}</strong>
          </p>
        </div>
        <div className="badge">
          <span>{plan.badge}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2 3 5v6c0 5.25 3.75 9.75 9 11 5.25-1.25 9-5.75 9-11V5l-9-3z" />
          </svg>
        </div>
      </div>

      <div className="dot-row">
        {plan.weeks.map((w) => (
          <span key={w.weekNumber} className={`dot ${w.weekNumber <= completedWeeks ? "filled" : ""}`} />
        ))}
      </div>

      <p className="total-weeks-label">Total Weeks</p>
      <p className="total-weeks-value">
        {completedWeeks}/{plan.totalWeeks}
      </p>

      <button className="pill-btn" onClick={onManage}>
        Manage Plan
      </button>
    </section>
  );
}
