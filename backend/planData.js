// Default 10-week "New To Running" plan: 3 sessions/week (Mon, Thu, Fri),
// progressing from a 20-minute walk-run to a continuous 10km run.

export const PLAN_START_DATE = "2026-09-07"; // Monday
export const TOTAL_WEEKS = 10;
export const TRAINING_DAYS = ["Mon", "Thu", "Fri"];

const DAY_OFFSET = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const DAY_LABEL = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

// Each entry is the 3 sessions (Mon / Thu / Fri) for that week.
// Weeks 1-4: a fixed Run 2 min / Walk 2 min interval, with the total
// session duration increasing each week. Weeks 5-10: continuous runs
// building distance up to the goal run - 10km in week 10.
const WEEKLY_SESSIONS = [
  // Week 1 - 20 minutes: 5 x (run 2 / walk 2)
  [
    { day: "Mon", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 5", durationMin: 20 },
    { day: "Thu", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 5", durationMin: 20 },
    { day: "Fri", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 5", durationMin: 20 },
  ],
  // Week 2 - 24 minutes: 6 x (run 2 / walk 2)
  [
    { day: "Mon", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 6", durationMin: 24 },
    { day: "Thu", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 6", durationMin: 24 },
    { day: "Fri", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 6", durationMin: 24 },
  ],
  // Week 3 - 28 minutes: 7 x (run 2 / walk 2)
  [
    { day: "Mon", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 7", durationMin: 28 },
    { day: "Thu", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 7", durationMin: 28 },
    { day: "Fri", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 7", durationMin: 28 },
  ],
  // Week 4 - 32 minutes: 8 x (run 2 / walk 2)
  [
    { day: "Mon", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 8", durationMin: 32 },
    { day: "Thu", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 8", durationMin: 32 },
    { day: "Fri", type: "Walk-Run", detail: "Run 2 min / Walk 2 min x 8", durationMin: 32 },
  ],
  // Week 5 - first fully continuous week
  [
    { day: "Mon", type: "Run", detail: "Easy continuous run", durationMin: null, distanceKm: 2 },
    { day: "Thu", type: "Run", detail: "Continuous run, steady pace", durationMin: null, distanceKm: 2.5 },
    { day: "Fri", type: "Run", detail: "Long run, steady pace", durationMin: null, distanceKm: 3 },
  ],
  // Week 6
  [
    { day: "Mon", type: "Run", detail: "Easy continuous run", durationMin: null, distanceKm: 3 },
    { day: "Thu", type: "Run", detail: "Continuous run, steady pace", durationMin: null, distanceKm: 3.5 },
    { day: "Fri", type: "Run", detail: "Long run, steady pace", durationMin: null, distanceKm: 4.5 },
  ],
  // Week 7
  [
    { day: "Mon", type: "Run", detail: "Easy continuous run", durationMin: null, distanceKm: 4 },
    { day: "Thu", type: "Run", detail: "Continuous run, steady pace", durationMin: null, distanceKm: 4.5 },
    { day: "Fri", type: "Run", detail: "Long run, steady pace", durationMin: null, distanceKm: 6 },
  ],
  // Week 8
  [
    { day: "Mon", type: "Run", detail: "Easy continuous run", durationMin: null, distanceKm: 5 },
    { day: "Thu", type: "Run", detail: "Continuous run, steady pace", durationMin: null, distanceKm: 5.5 },
    { day: "Fri", type: "Run", detail: "Long run, steady pace", durationMin: null, distanceKm: 7.5 },
  ],
  // Week 9
  [
    { day: "Mon", type: "Run", detail: "Easy continuous run", durationMin: null, distanceKm: 5.5 },
    { day: "Thu", type: "Run", detail: "Continuous run, steady pace", durationMin: null, distanceKm: 6 },
    { day: "Fri", type: "Run", detail: "Long run, steady pace", durationMin: null, distanceKm: 9 },
  ],
  // Week 10 - taper then the goal: 10km continuous
  [
    { day: "Mon", type: "Run", detail: "Easy taper run", durationMin: null, distanceKm: 4 },
    { day: "Thu", type: "Run", detail: "Easy taper run, relaxed pace", durationMin: null, distanceKm: 3 },
    { day: "Fri", type: "Run", detail: "Goal run: continuous 10km", durationMin: null, distanceKm: 10 },
  ],
];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatISO(date) {
  return date.toISOString().slice(0, 10);
}

function formatShort(date) {
  return date
    .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    .toUpperCase();
}

export function buildPlan() {
  const start = new Date(`${PLAN_START_DATE}T00:00:00`);
  const weeks = WEEKLY_SESSIONS.slice(0, TOTAL_WEEKS).map((sessions, w) => {
    const weekStart = addDays(start, w * 7);
    const weekEnd = addDays(weekStart, 6);
    const workouts = sessions.map((s) => {
      const date = addDays(weekStart, DAY_OFFSET[s.day]);
      return {
        id: `w${w + 1}-${s.day.toLowerCase()}`,
        weekNumber: w + 1,
        day: s.day,
        dayLabel: DAY_LABEL[s.day],
        date: formatISO(date),
        type: s.type,
        detail: s.detail,
        durationMin: s.durationMin ?? null,
        distanceKm: s.distanceKm ?? null,
        completed: false,
      };
    });
    return {
      weekNumber: w + 1,
      startDate: formatISO(weekStart),
      endDate: formatISO(weekEnd),
      dateRangeLabel: `${formatShort(weekStart)} - ${formatShort(weekEnd)}`,
      workouts,
    };
  });

  return {
    name: "New To Running Plan",
    badge: "NTR",
    totalWeeks: TOTAL_WEEKS,
    startDate: formatISO(start),
    endDate: weeks[weeks.length - 1].endDate,
    weeks,
  };
}
