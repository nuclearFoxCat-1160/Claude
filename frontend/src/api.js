const BASE = "/api";

export async function fetchPlan() {
  const res = await fetch(`${BASE}/plan`);
  if (!res.ok) throw new Error("Failed to load plan");
  return res.json();
}

export async function toggleWorkout(id) {
  const res = await fetch(`${BASE}/workouts/${id}/toggle`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to update workout");
  return res.json();
}
