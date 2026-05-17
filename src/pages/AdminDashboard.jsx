import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { LogOut, Download, Users, Target, ClipboardList, Shield } from "lucide-react";

export default function AdminDashboard() {
  const { userData, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("overview");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [usersSnap, goalsSnap, auditSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "goals")),
      getDocs(collection(db, "audit_logs")),
    ]);
    setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setGoals(goalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setAuditLogs(auditSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.at?.localeCompare(a.at)));
    setLoading(false);
  }

  function exportCSV() {
    const rows = [
      ["Employee", "Goal Title", "Thrust Area", "UoM", "Target", "Weightage", "Status",
       "Q1 Actual", "Q1 Score", "Q2 Actual", "Q2 Score", "Q3 Actual", "Q3 Score", "Q4 Actual", "Q4 Score"]
    ];
    for (const goal of goals) {
      const emp = users.find(u => u.uid === goal.employeeId);
      rows.push([
        emp?.name || "Unknown",
        goal.title,
        goal.thrustArea,
        goal.uomType,
        goal.target,
        goal.weightage + "%",
        goal.status,
        goal.checkin_Q1?.actual || "",
        goal.checkin_Q1?.score != null ? goal.checkin_Q1.score + "%" : "",
        goal.checkin_Q2?.actual || "",
        goal.checkin_Q2?.score != null ? goal.checkin_Q2.score + "%" : "",
        goal.checkin_Q3?.actual || "",
        goal.checkin_Q3?.score != null ? goal.checkin_Q3.score + "%" : "",
        goal.checkin_Q4?.actual || "",
        goal.checkin_Q4?.score != null ? goal.checkin_Q4.score + "%" : "",
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `goaltrack_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const employees = users.filter(u => u.role === "employee");
  const managers = users.filter(u => u.role === "manager");
  const approvedGoals = goals.filter(g => g.status === "approved");
  const pendingGoals = goals.filter(g => g.status === "pending_approval");

  // Completion rate per employee
  function getEmployeeCompletion(uid) {
    const empGoals = goals.filter(g => g.employeeId === uid);
    if (empGoals.length === 0) return { submitted: false, approved: 0, total: 0 };
    const approved = empGoals.filter(g => g.status === "approved").length;
    return { submitted: empGoals.some(g => g.status !== "draft"), approved, total: empGoals.length };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-red-700">GoalTrack</h1>
            <p className="text-xs text-gray-500">Admin / HR Portal — {userData.name}</p>
          </div>
          <div className="flex gap-2">
            {["overview", "users", "goals", "audit"].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${view === v ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                {v}
              </button>
            ))}
            <button onClick={logout} className="p-2 text-gray-500 hover:text-red-500 transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* OVERVIEW */}
            {view === "overview" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-800">Organization Overview</h2>
                  <button onClick={exportCSV}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">
                    <Download size={16} /> Export CSV Report
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={16} className="text-blue-500" />
                      <p className="text-xs text-gray-500">Employees</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{employees.length}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={16} className="text-green-500" />
                      <p className="text-xs text-gray-500">Approved Goals</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{approvedGoals.length}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardList size={16} className="text-yellow-500" />
                      <p className="text-xs text-gray-500">Pending Approval</p>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{pendingGoals.length}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield size={16} className="text-red-500" />
                      <p className="text-xs text-gray-500">Total Goals</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{goals.length}</p>
                  </div>
                </div>

                {/* Completion Dashboard */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="px-5 py-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-800">Employee Completion Dashboard</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Real-time goal submission & approval status</p>
                  </div>
                  <div className="divide-y">
                    {employees.map(emp => {
                      const comp = getEmployeeCompletion(emp.uid);
                      const manager = managers.find(m => m.uid === emp.managerId);
                      return (
                        <div key={emp.uid} className="px-5 py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.email} · Manager: {manager?.name || "None"}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Goals</p>
                              <p className="text-sm font-semibold">{comp.approved}/{comp.total} approved</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              comp.total === 0 ? "bg-gray-100 text-gray-500" :
                              comp.approved === comp.total && comp.total > 0 ? "bg-green-100 text-green-700" :
                              comp.submitted ? "bg-blue-100 text-blue-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {comp.total === 0 ? "No goals" :
                               comp.approved === comp.total ? "✅ Complete" :
                               comp.submitted ? "🔄 In Review" : "⏳ Draft"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* USERS */}
            {view === "users" && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">All Users</h2>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Goals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                          <td className="px-4 py-3 text-gray-600">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              u.role === "admin" ? "bg-red-100 text-red-700" :
                              u.role === "manager" ? "bg-green-100 text-green-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>{u.role}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {goals.filter(g => g.employeeId === u.uid).length}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ALL GOALS */}
            {view === "goals" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">All Goals</h2>
                  <button onClick={exportCSV}
                    className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700">
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Goal</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Thrust Area</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Target</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Weight</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {goals.map(goal => {
                        const emp = users.find(u => u.uid === goal.employeeId);
                        return (
                          <tr key={goal.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{emp?.name || "Unknown"}</td>
                            <td className="px-4 py-3 text-gray-700">{goal.title}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{goal.thrustArea}</td>
                            <td className="px-4 py-3 text-gray-600">{goal.target}</td>
                            <td className="px-4 py-3 text-gray-600">{goal.weightage}%</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                goal.status === "approved" ? "bg-green-100 text-green-700" :
                                goal.status === "pending_approval" ? "bg-blue-100 text-blue-700" :
                                goal.status === "rework" ? "bg-red-100 text-red-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>{goal.status.replace("_", " ")}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AUDIT LOG */}
            {view === "audit" && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Audit Trail</h2>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border">
                    <Shield size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No audit logs yet. Logs appear after manager actions.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">By</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Goal ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                log.action === "approved" ? "bg-green-100 text-green-700" :
                                log.action === "returned_for_rework" ? "bg-red-100 text-red-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>{log.action.replace(/_/g, " ")}</span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">{log.by}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.goalId?.slice(0, 12)}...</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{log.at ? new Date(log.at).toLocaleString() : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}