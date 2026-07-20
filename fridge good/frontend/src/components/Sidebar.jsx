import { useState, useEffect } from "react";
import api from "../api";

const NAV = [
  { id: "dashboard",   icon: "▦",  label: "Dashboard" },
  { id: "scan",        icon: "📷", label: "Scan Fridge" },
  { id: "ingredients", icon: "🥦", label: "Ingredients" },
  { id: "recipes",     icon: "🍳", label: "Recipes" },
  { id: "planner",     icon: "📅", label: "Meal Planner" },
  { id: "shopping",    icon: "🛒", label: "Shopping" },
  { id: "settings",    icon: "⚙️", label: "Settings" },
];

const PROVIDER_ICONS = { ubc: "🎓" };

export default function Sidebar({ current, onNavigate, open, onToggle, urgentAlerts, stats, dark, toggleDark }) {
  const [providerInfo, setProviderInfo] = useState(null);

  const loadProvider = async () => {
    try {
      const { data } = await api.get("/api/provider");
      setProviderInfo(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadProvider();
    const id = setInterval(loadProvider, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className={`fixed top-0 left-0 h-full bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 z-20 ${open ? "w-56" : "w-16"}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <button
          onClick={onToggle}
          className="text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition flex-shrink-0"
          title="Toggle sidebar"
        >
          🧊
        </button>
        {open && (
          <div className="overflow-hidden">
            <div className="font-bold text-white text-sm whitespace-nowrap">FridgeChef AI</div>
            <div className="text-xs text-slate-500 whitespace-nowrap">Smart Kitchen Assistant</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 flex flex-col gap-1 px-2">
        {NAV.map(({ id, icon, label }) => {
          const active = current === id;
          const badge = id === "ingredients" && stats?.expiring_soon > 0 ? stats.expiring_soon
                      : id === "shopping" && stats?.shopping_pending > 0 ? stats.shopping_pending
                      : null;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm transition-all w-full text-left relative ${
                active ? "bg-green-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
              {open && <span className="whitespace-nowrap font-medium">{label}</span>}
              {badge && (
                <span className={`absolute ${open ? "right-2" : "-top-1 -right-1"} bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center`}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Provider toggle */}
      {providerInfo && (
        <div className={`border-t border-slate-800 ${open ? "px-3 py-3" : "px-1.5 py-3"}`}>
          {open && (
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2 px-1">AI Provider</p>
          )}
          <div className="flex flex-col gap-1">
            {Object.entries(providerInfo.providers).map(([name, info]) => {
              const isHealthy = info.healthy;
              return (
                <div
                  key={name}
                  title={`${info.label} — ${isHealthy ? "online" : "offline"}`}
                  className={`flex items-center gap-2 rounded-lg text-left w-full relative bg-green-900/50 text-green-300
                    ${open ? "px-2 py-1.5" : "justify-center px-1 py-1.5"}`}
                >
                  <span className="text-sm flex-shrink-0">{PROVIDER_ICONS[name]}</span>
                  {open && (
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate leading-tight">{info.label.split(" ")[0]}</div>
                      <div className="text-[10px] text-slate-500 truncate">{info.model}</div>
                    </div>
                  )}
                  {open && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isHealthy ? "bg-green-400" : "bg-slate-600"}`} />}
                  {!open && <span className="absolute right-0.5 top-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`border-t border-slate-800 ${open ? "px-4 py-3" : "px-2 py-3 flex justify-center"}`}>
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          className={`flex items-center gap-2.5 rounded-lg hover:bg-slate-800 transition w-full
            ${open ? "px-2 py-1.5" : "justify-center p-1.5"}`}
        >
          <span className="text-base">{dark ? "☀️" : "🌙"}</span>
          {open && <span className="text-xs text-slate-400">{dark ? "Light mode" : "Dark mode"}</span>}
        </button>

        {/* Stats */}
        {open && stats && (
          <div className="mt-2 space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Items in fridge</span>
              <span className="text-slate-300 font-semibold">{stats.total_ingredients}</span>
            </div>
            <div className="flex justify-between">
              <span>Recipes generated</span>
              <span className="text-slate-300 font-semibold">{stats.total_recipes}</span>
            </div>
            {urgentAlerts > 0 && (
              <div className="mt-1 bg-red-900/40 text-red-400 rounded-md px-2 py-1 text-center">
                ⚠️ {urgentAlerts} item{urgentAlerts > 1 ? "s" : ""} expiring!
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
