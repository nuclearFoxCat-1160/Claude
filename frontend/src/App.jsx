import { Routes, Route } from "react-router-dom";
import { PlanProvider } from "./PlanContext";
import BottomNav from "./components/BottomNav";
import PlanPage from "./pages/PlanPage";
import CalendarPage from "./pages/CalendarPage";
import TodayPage from "./pages/TodayPage";
import ProgressPage from "./pages/ProgressPage";
import SupportPage from "./pages/SupportPage";

export default function App() {
  return (
    <PlanProvider>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<PlanPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/support" element={<SupportPage />} />
        </Routes>
        <BottomNav />
      </div>
    </PlanProvider>
  );
}
