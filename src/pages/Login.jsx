import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DEMO_USERS = [
  { label: "👤 Employee", email: "emp1@demo.com", password: "demo1234" },
  { label: "👔 Manager", email: "manager@demo.com", password: "demo1234" },
  { label: "🛡️ Admin", email: "admin@demo.com", password: "demo1234" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  }

  async function quickLogin(em, pw) {
    setLoading(true);
    setError("");
    try {
      await login(em, pw);
      navigate("/");
    } catch {
      setError("Demo login failed. Please seed users first.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-700">GoalTrack</h1>
          <p className="text-gray-500 mt-1">AtomQuest Hackathon Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="you@company.com" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="••••••••" required
            />
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6">
          <p className="text-center text-sm text-gray-500 mb-3">— Quick Demo Login —</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_USERS.map(u => (
              <button key={u.email} onClick={() => quickLogin(u.email, u.password)}
                disabled={loading}
                className="bg-gray-100 hover:bg-indigo-50 border border-gray-200 rounded-lg py-2 text-xs font-medium text-gray-700 transition disabled:opacity-50">
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 
