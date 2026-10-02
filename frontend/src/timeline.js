const WARMUP_SEC = 5 * 60;
const COOLDOWN_SEC = 5 * 60;
const INTERVAL_SEC = 2 * 60; // fixed Run 2 min / Walk 2 min
const EASY_PACE_MIN_PER_KM = 7; // beginner estimate, used for continuous runs only

export function buildTimeline(workout) {
  const segments = [{ id: "warmup", kind: "warmup", label: "Warm-up walk", durationSec: WARMUP_SEC }];

  if (workout.durationMin) {
    const cycles = Math.round(workout.durationMin / 4);
    for (let i = 0; i < cycles; i++) {
      segments.push({ id: `run-${i}`, kind: "run", label: "Run", durationSec: INTERVAL_SEC });
      segments.push({ id: `walk-${i}`, kind: "walk", label: "Walk", durationSec: INTERVAL_SEC });
    }
  } else if (workout.distanceKm) {
    const estMin = Math.max(1, Math.round(workout.distanceKm * EASY_PACE_MIN_PER_KM));
    segments.push({
      id: "run-main",
      kind: "run",
      label: `Continuous run · ${workout.distanceKm} km`,
      note: "~7:00/km pace estimate",
      durationSec: estMin * 60,
    });
  }

  segments.push({ id: "cooldown", kind: "cooldown", label: "Cool-down walk", durationSec: COOLDOWN_SEC });

  let t = 0;
  return segments.map((s) => {
    const start = t;
    t += s.durationSec;
    return { ...s, start, end: t };
  });
}

export function totalSessionMinutes(workout) {
  const segments = buildTimeline(workout);
  return Math.round(segments[segments.length - 1].end / 60);
}

export function workoutMeta(workout) {
  const total = totalSessionMinutes(workout);
  if (workout.distanceKm) return `${workout.detail} · ${workout.distanceKm} km · ~${total} min total`;
  if (workout.durationMin) return `${workout.detail} · ${total} min total`;
  return workout.detail;
}

export function fmtClock(totalSec) {
  const sec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
