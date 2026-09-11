import express from "express";
import cors from "cors";
import { getPlan, setWorkoutCompleted, resetPlan } from "./db.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/plan", async (req, res) => {
  const plan = await getPlan();
  res.json(plan);
});

app.post("/api/workouts/:id/toggle", async (req, res) => {
  const plan = await getPlan();
  let current = null;
  for (const week of plan.weeks) {
    const workout = week.workouts.find((w) => w.id === req.params.id);
    if (workout) {
      current = workout;
      break;
    }
  }
  if (!current) {
    return res.status(404).json({ error: "Workout not found" });
  }
  const updated = await setWorkoutCompleted(req.params.id, !current.completed);
  res.json(updated);
});

app.post("/api/plan/reset", async (req, res) => {
  const plan = await resetPlan();
  res.json(plan);
});

app.listen(PORT, () => {
  console.log(`Running plan API listening on http://localhost:${PORT}`);
});
