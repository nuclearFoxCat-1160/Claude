import Header from "../components/Header";

const ITEMS = [
  {
    title: "How the plan works",
    body: "10 weeks, 3 sessions a week (Mon/Thu/Fri). Sessions start as short walk-run intervals and build up to a continuous 10km run in the final week.",
  },
  {
    title: "Marking a workout complete",
    body: "Tap any workout on the Plan or Calendar tab after you finish it. You can undo a completion the same way.",
  },
  {
    title: "Missed a session?",
    body: "Don't try to cram it in — just pick up with the next scheduled run. Consistency across the week matters more than any single session.",
  },
  {
    title: "Injuries or pain",
    body: "Stop running, rest, and see a healthcare professional if pain persists. This plan is general guidance, not medical advice.",
  },
  {
    title: "Contact support",
    body: "support@runningplan.app",
  },
];

export default function SupportPage() {
  return (
    <>
      <Header title="Support" />
      <div className="app-content">
        {ITEMS.map((item) => (
          <div className="support-item" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
