import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import useDarkMode from "./hooks/useDarkMode";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ScanPage from "./components/ScanPage";
import IngredientsPage from "./components/IngredientsPage";
import RecipesPage from "./components/RecipesPage";
import MealPlannerPage from "./components/MealPlannerPage";
import ShoppingPage from "./components/ShoppingPage";
import SettingsPage from "./components/SettingsPage";
import api from "./api";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dark, toggleDark] = useDarkMode();

  const refreshGlobal = async () => {
    const [s, e] = await Promise.all([
      api.get("/api/stats"),
      api.get("/api/expiry-alerts"),
    ]);
    setStats(s.data);
    setExpiryAlerts(e.data);
  };

  useEffect(() => { refreshGlobal(); }, []);

  const pages = {
    dashboard: <Dashboard stats={stats} alerts={expiryAlerts} onNavigate={setPage} onRefresh={refreshGlobal} />,
    scan: <ScanPage onComplete={refreshGlobal} />,
    ingredients: <IngredientsPage onUpdate={refreshGlobal} />,
    recipes: <RecipesPage onUpdate={refreshGlobal} />,
    planner: <MealPlannerPage />,
    shopping: <ShoppingPage onUpdate={refreshGlobal} />,
    settings: <SettingsPage />,
  };

  const urgentAlerts = expiryAlerts.filter((a) => a.status === "expired" || a.status === "critical").length;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { fontSize: 13, borderRadius: 10 } }} />
      <Sidebar
        current={page}
        onNavigate={setPage}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        urgentAlerts={urgentAlerts}
        stats={stats}
        dark={dark}
        toggleDark={toggleDark}
      />
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? "ml-56" : "ml-16"}`}>
        <div className="max-w-5xl mx-auto px-6 py-6 fade-in">
          {pages[page]}
        </div>
      </main>
    </div>
  );
}
