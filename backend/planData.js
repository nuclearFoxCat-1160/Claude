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
const WEEKLY_SESSIONS = [
  // Week 1 - introduce walk-run intervals, 20 minutes total
  [
    { day: "Mon", type: "Walk-Run", detail: "Run 1 min / Walk 1.5 min x 8", durationMin: 20 },
    { day: "Thu", type: "Walk-Run", detail: "Run 1 min / Walk 1.5 min x 8", durationMin: 20 },
    { day: "Fri", type: "Walk-Run", detail: "Run 1 min / Walk 1.5 min x 8", durationMin: 20 },
  ],
  // Week 2 - slightly longer session, longer run intervals
  [
    { day: "Mon", type: "Walk-Run", detail: "Run 1.5 min / Walk 2 min x 7", durationMin: 24 },
    { day: "Thu", type: "Walk-Run", detail: "Run 1.5 min / Walk 2 min x 7", durationMin: 24 },
    { day: "Fri", type: "Walk-Run", detail: "Run 1.5 min / Walk 2 min x 7", durationMin: 24 },
  ],
  // Week 3 - run intervals grow, Friday is the "long" session
  [
    { day: "Mon", type: "Walk-Run", detail: "Run 3 min / Walk 1.5 min x 6", durationMin: 27 },
    { day: "Thu", type: "Walk-Run", detail: "Run 3 min / Walk 1.5 min x 6", durationMin: 27 },
    { day: "Fri", type: "Walk-Run", detail: "Run 5 min / Walk 2 min x 4 + Run 5 min", durationMin: 33 },
  ],
  // Week 4 - fewer, longer run blocks
  [
    { day: "Mon", type: "Walk-Run", detail: "Run 5 min / Walk 2.5 min x 4", durationMin: 30 },
    { day: "Thu", type: "Walk-Run", detail: "Run 5 min / Walk 2.5 min x 4", durationMin: 30 },
    { day: "Fri", type: "Walk-Run", detail: "Run 8 min / Walk 3 min x 3", durationMin: 33 },
  ],
  // Week 5 - first continuous run on the long day
  [
    { day: "Mon", type: "Walk-Run", detail: "Run 8 min / Walk 2 min x 3", durationMin: 30 },
    { day: "Thu", type: "Walk-Run", detail: "Run 10 min / Walk 2 min x 2", durationMin: 24 },
    { day: "Fri", type: "Run", detail: "Continuous run, easy pace", durationMin: null, distanceKm: 3 },
  ],
  // Week 6
  [
    { day: "Mon", type: "Run", detail: "Easy continuous run", durationMin: null, distanceKm: 3 },
    { day: "Thu", type: "Run", detail: "Continuous run, 1 min walk break each km", durationMin: null, distanceKm: 3.5 },
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
