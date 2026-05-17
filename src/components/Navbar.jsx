import { useAuth } from "../context/AuthContext";
import { LogOut } from "lucide-react";

export default function Navbar({ title, tabs, activeTab, setTab }) {
  const { userData, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold ${
            userData?.role === "admin" ? "text-red-700" :
            userData?.role === "manager" ? "text-green-700" : "text-indigo-700"
          }`}>GoalTrack</h1>
          <p className="text-xs text-gray-500">{title} — {userData?.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition relative ${
                activeTab === tab.id ? `${tab.activeColor || "bg-indigo-600"} text-white` : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
          <button onClick={logout}
            className="flex items-center gap-1.5 ml-1 px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-lg text-sm font-medium transition">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}