import { useRef } from "react";
import { usePlan } from "../PlanContext";
import Header from "../components/Header";
import PlanSummaryCard from "../components/PlanSummaryCard";
import QuickActions from "../components/QuickActions";
import WeekCard from "../components/WeekCard";

export default function PlanPage() {
  const { plan, loading, error, toggle } = usePlan();
  const weeksRef = useRef(null);

  if (loading) return <div className="state-msg">Loading your plan…</div>;
  if (error) return <div className="state-msg">Couldn't load plan: {error}</div>;
  if (!plan) return null;

  return (
    <>
      <Header title="Your Plan" />
      <div className="app-content">
        <PlanSummaryCard plan={plan} onManage={() => weeksRef.current?.scrollIntoView({ behavior: "smooth" })} />
        <QuickActions />
        <hr className="divider" />
        <div ref={weeksRef}>
          {plan.weeks.map((week) => (
            <WeekCard key={week.weekNumber} week={week} onToggle={toggle} />
          ))}
        </div>
      </div>
    </>
  );
}
