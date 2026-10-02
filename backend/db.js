import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildPlan } from "./planData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data.json");

async function load() {
  if (!existsSync(DATA_FILE)) {
    const plan = buildPlan();
    await save(plan);
    return plan;
  }
  const raw = await readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

async function save(plan) {
  await writeFile(DATA_FILE, JSON.stringify(plan, null, 2), "utf-8");
}

export async function getPlan() {
  return load();
}

export async function setWorkoutCompleted(workoutId, completed) {
  const plan = await load();
  let found = null;
  for (const week of plan.weeks) {
    const workout = week.workouts.find((w) => w.id === workoutId);
    if (workout) {
      workout.completed = completed;
      found = workout;
      break;
    }
  }
  if (!found) return null;
  await save(plan);
  return found;
}

export async function resetPlan() {
  const plan = buildPlan();
  await save(plan);
  return plan;
}
