import { useEffect, useState } from "react";
import api from "../api";
import Skeleton from "./ui/Skeleton";

const CAT_EMOJI = {
  produce: "🥦", dairy: "🧀", meat: "🥩", seafood: "🐟",
  grains: "🌾", condiments: "🫙", beverages: "🧃", leftovers: "🍱", other: "📦"
};

function StatCard({ icon, label, value, sub, color = "green", onClick }) {
  const colors = {
    green: "bg-green-50 border-green-100",
    yellow: "bg-amber-50 border-amber-100",
    red: "bg-red-50 border-red-100",
    blue: "bg-blue-50 border-blue-100",
    purple: "bg-purple-50 border-purple-100",
  };
  return (
    <div
      onClick={onClick}
      className={`${colors[color]} border rounded-xl p-4 flex flex-col gap-1 ${onClick ? "cursor-pointer hover:shadow-md transition" : ""}`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="text-2xl font-bold text-slate-800">{value ?? <Skeleton className="w-10 h-7" />}</div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ stats, alerts, onNavigate, onRefresh }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get("/api/scan-history").then(r => setHistory(r.data)).catch(() => {});
  }, []);

  const criticalAlerts = alerts?.filter(a => a.status !== "warning") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => onNavigate("scan")}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm"
        >
          📷 Scan Fridge
        </button>
      </div>

      {/* Alert banner */}
      {criticalAlerts.length > 0 && (
        <div
          onClick={() => onNavigate("ingredients")}
          className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer hover:bg-red-100 transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <div className="font-semibold text-red-700">
                {criticalAlerts.length} item{criticalAlerts.length > 1 ? "s" : ""} expiring or expired
              </div>
              <div className="text-sm text-red-600">
                {criticalAlerts.slice(0, 3).map(a => a.name).join(", ")}
                {criticalAlerts.length > 3 ? ` +${criticalAlerts.length - 3} more` : ""}
              </div>
            </div>
            <span className="ml-auto text-red-400 text-sm">View →</span>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🧊" label="In Fridge" value={stats?.total_ingredients}
          sub="active ingredients" onClick={() => onNavigate("ingredients")} />
        <StatCard icon="📷" label="Total Scans" value={stats?.total_scans}
          sub={`${stats?.recent_scans ?? "–"} this week`} color="blue" />
        <StatCard icon="🍳" label="Recipes" value={stats?.total_recipes}
          sub={`${stats?.favorites ?? 0} favorited`} color="purple" onClick={() => onNavigate("recipes")} />
        <StatCard icon="🛒" label="Shopping" value={stats?.shopping_pending}
          sub="items pending" color="yellow" onClick={() => onNavigate("shopping")} />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category breakdown */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Fridge by Category</h2>
          {stats?.category_breakdown && Object.keys(stats.category_breakdown).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(stats.category_breakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => {
                  const total = stats.total_ingredients || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{CAT_EMOJI[cat] || "📦"} {cat}</span>
                        <span className="text-slate-400 font-medium">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <div className="text-3xl mb-2">🧊</div>
              <p className="text-sm">Scan your fridge to see a breakdown</p>
              <button onClick={() => onNavigate("scan")} className="mt-3 text-green-600 text-sm font-medium hover:underline">
                Scan now →
              </button>
            </div>
          )}
        </div>

        {/* Recent scans */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Recent Scans</h2>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.slice(0, 5).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-base">📷</div>
                    <span className="text-slate-600">{h.item_count} items</span>
                  </div>
                  <span className="text-slate-400 text-xs">
                    {new Date(h.scanned_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <p className="text-sm">No scans yet</p>
            </div>
          )}
          <button
            onClick={() => onNavigate("scan")}
            className="mt-4 w-full text-center text-sm text-green-600 font-medium hover:underline"
          >
            + New scan
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-700 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "📷", label: "Scan Fridge", page: "scan" },
            { icon: "🍳", label: "Get Recipes", page: "recipes" },
            { icon: "📅", label: "Plan Meals", page: "planner" },
            { icon: "⚙️", label: "Preferences", page: "settings" },
          ].map(({ icon, label, page }) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-green-200 hover:bg-green-50 transition cursor-pointer"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-medium text-slate-600">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
