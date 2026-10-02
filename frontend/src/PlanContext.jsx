import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchPlan, toggleWorkout } from "./api";

const PlanContext = createContext(null);

export function PlanProvider({ children }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPlan();
      setPlan(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(async (id) => {
    const updated = await toggleWorkout(id);
    setPlan((prev) => {
      if (!prev) return prev;
      const weeks = prev.weeks.map((week) => ({
        ...week,
        workouts: week.workouts.map((w) => (w.id === id ? updated : w)),
      }));
      return { ...prev, weeks };
    });
  }, []);

  return (
    <PlanContext.Provider value={{ plan, loading, error, toggle, reload: load }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}

export function allWorkouts(plan) {
  if (!plan) return [];
  return plan.weeks.flatMap((w) => w.workouts);
}
