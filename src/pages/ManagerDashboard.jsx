import { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, RotateCcw, MessageSquare, Users } from "lucide-react";
import Navbar from "../components/Navbar";

const STATUS_COLORS = {
  draft: "bg-yellow-100 text-yellow-700",
  pending_approval: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rework: "bg-red-100 text-red-700",
};

export default function ManagerDashboard() {
  const { userData } = useAuth();
  const [teamGoals, setTeamGoals] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("pending");
  const [successMsg, setSuccessMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [commentGoalId, setCommentGoalId] = useState(null);
  const [comment, setComment] = useState("");

  useEffect(() => { fetchTeamData(); }, []);

  async function fetchTeamData() {
    setLoading(true);
    const membersSnap = await getDocs(query(collection(db, "users"), where("managerId", "==", userData.uid)));
    const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setTeamMembers(members);
    const grouped = {};
    for (const member of members) {
      const goalsSnap = await getDocs(query(collection(db, "goals"), where("employeeId", "==", member.uid)));
      grouped[member.uid] = { member, goals: goalsSnap.docs.map(d => ({ id: d.id, ...d.data() })) };
    }
    setTeamGoals(grouped);
    setLoading(false);
  }

  function showSuccess(msg) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); }

  async function handleApprove(goalId) {
    setSaving(true);
    await updateDoc(doc(db, "goals", goalId), { status: "approved", approvedAt: new Date().toISOString(), approvedBy: userData.uid });
    await addDoc(collection(db, "audit_logs"), { goalId, action: "approved", by: userData.name, byUid: userData.uid, at: new Date().toISOString() });
    showSuccess("Goal approved and locked!"); setSaving(false); fetchTeamData();
  }

  async function handleRework(goalId) {
    setSaving(true);
    await updateDoc(doc(db, "goals", goalId), { status: "rework" });
    await addDoc(collection(db, "audit_logs"), { goalId, action: "returned_for_rework", by: userData.name, byUid: userData.uid, at: new Date().toISOString() });
    showSuccess("Goal returned for rework."); setSaving(false); fetchTeamData();
  }

  async function handleSaveEdit(goalId) {
    setSaving(true);
    await updateDoc(doc(db, "goals", goalId), { target: editValues.target, weightage: Number(editValues.weightage) });
    await addDoc(collection(db, "audit_logs"), { goalId, action: "edited_by_manager", by: userData.name, changes: editValues, at: new Date().toISOString() });
    setEditingGoal(null); showSuccess("Goal updated!"); setSaving(false); fetchTeamData();
  }

  async function handleAddComment(goalId) {
    if (!comment.trim()) return;
    setSaving(true);
    await updateDoc(doc(db, "goals", goalId), { managerComment: comment, commentBy: userData.name, commentAt: new Date().toISOString() });
    setCommentGoalId(null); setComment(""); showSuccess("Comment added!"); setSaving(false); fetchTeamData();
  }

  const allGoals = Object.values(teamGoals).flatMap(t => t.goals);
  const pendingGoals = allGoals.filter(g => g.status === "pending_approval");
  const approvedGoals = allGoals.filter(g => g.status === "approved");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        title="Manager Portal"
        activeTab={view}
        setTab={setView}
        tabs={[
          { id: "pending", label: "Pending Approvals", activeColor: "bg-green-600", badge: pendingGoals.length },
          { id: "team", label: "Team Goals", activeColor: "bg-green-600" },
          { id: "checkins", label: "Check-ins", activeColor: "bg-green-600" },
        ]}
      />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}
        {loading ? <div className="text-center py-12 text-gray-400">Loading team data...</div> : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "Team Members", value: teamMembers.length, color: "text-green-600" },
                { label: "Pending Approval", value: pendingGoals.length, color: "text-blue-600" },
                { label: "Approved Goals", value: approvedGoals.length, color: "text-green-600" },
                { label: "Total Goals", value: allGoals.length, color: "text-gray-600" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {view === "pending" && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Pending Approvals</h2>
                {pendingGoals.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border">
                    <CheckCircle size={48} className="mx-auto text-green-300 mb-3" />
                    <p className="text-gray-500">All caught up! No pending approvals.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.values(teamGoals).map(({ member, goals }) => {
                      const pending = goals.filter(g => g.status === "pending_approval");
                      if (pending.length === 0) return null;
                      return (
                        <div key={member.uid} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                          <div className="bg-green-50 px-5 py-3 border-b flex items-center gap-2">
                            <Users size={16} className="text-green-600" />
                            <span className="font-semibold text-green-800">{member.name}</span>
                            <span className="text-xs text-gray-500">{member.email}</span>
                            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{pending.length} pending</span>
                          </div>
                          <div className="divide-y">
                            {pending.map(goal => (
                              <div key={goal.id} className="p-5">
                                <div className="mb-3">
                                  <span className="text-xs text-indigo-500 font-medium">{goal.thrustArea}</span>
                                  <h3 className="font-semibold text-gray-800 mt-0.5">{goal.title}</h3>
                                  {goal.description && <p className="text-sm text-gray-500 mt-1">{goal.description}</p>}
                                </div>
                                {editingGoal === goal.id ? (
                                  <div className="bg-yellow-50 rounded-lg p-4 mb-3 space-y-3">
                                    <p className="text-sm font-medium text-yellow-800">✏️ Editing Goal</p>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-xs text-gray-600 mb-1 block">Target</label>
                                        <input value={editValues.target} onChange={e => setEditValues({...editValues, target: e.target.value})}
                                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-600 mb-1 block">Weightage (%)</label>
                                        <input type="number" value={editValues.weightage} onChange={e => setEditValues({...editValues, weightage: e.target.value})}
                                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => handleSaveEdit(goal.id)} disabled={saving}
                                        className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-yellow-600 disabled:opacity-50">Save Changes</button>
                                      <button onClick={() => setEditingGoal(null)}
                                        className="border px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-3 text-sm text-gray-600 mb-3">
                                    <span>🎯 Target: <b>{goal.target}</b></span>
                                    <span>⚖️ Weightage: <b>{goal.weightage}%</b></span>
                                    <span>📏 UoM: <b>{goal.uomType}</b></span>
                                  </div>
                                )}
                                {commentGoalId === goal.id && (
                                  <div className="bg-blue-50 rounded-lg p-4 mb-3">
                                    <textarea value={comment} onChange={e => setComment(e.target.value)}
                                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                      rows={2} placeholder="Add your feedback comment..." />
                                    <div className="flex gap-2 mt-2">
                                      <button onClick={() => handleAddComment(goal.id)} disabled={saving}
                                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700">Save Comment</button>
                                      <button onClick={() => setCommentGoalId(null)}
                                        className="border px-3 py-1.5 rounded-lg text-xs text-gray-600">Cancel</button>
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-2 flex-wrap">
                                  <button onClick={() => handleApprove(goal.id)} disabled={saving}
                                    className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                                    <CheckCircle size={14} /> Approve
                                  </button>
                                  <button onClick={() => handleRework(goal.id)} disabled={saving}
                                    className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-600 disabled:opacity-50">
                                    <RotateCcw size={14} /> Return for Rework
                                  </button>
                                  <button onClick={() => { setEditingGoal(goal.id); setEditValues({ target: goal.target, weightage: goal.weightage }); }}
                                    className="flex items-center gap-1.5 bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-yellow-600">
                                    ✏️ Edit
                                  </button>
                                  <button onClick={() => setCommentGoalId(goal.id)}
                                    className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50">
                                    <MessageSquare size={14} /> Comment
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {view === "team" && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">All Team Goals</h2>
                <div className="space-y-4">
                  {Object.values(teamGoals).map(({ member, goals }) => (
                    <div key={member.uid} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <div className="bg-gray-50 px-5 py-3 border-b flex items-center gap-2">
                        <Users size={16} className="text-gray-500" />
                        <span className="font-semibold text-gray-800">{member.name}</span>
                        <span className="ml-auto text-xs text-gray-500">{goals.length} goals</span>
                      </div>
                      {goals.length === 0 ? <p className="p-4 text-sm text-gray-400">No goals submitted yet.</p> : (
                        <div className="divide-y">
                          {goals.map(goal => (
                            <div key={goal.id} className="p-4 flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{goal.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{goal.thrustArea} · Target: {goal.target} · {goal.weightage}%</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[goal.status] || "bg-gray-100 text-gray-600"}`}>
                                {goal.status.replace("_", " ")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === "checkins" && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Quarterly Check-ins</h2>
                {Object.values(teamGoals).every(({ goals }) =>
                  !goals.some(g => g.status === "approved" && (g.checkin_Q1 || g.checkin_Q2 || g.checkin_Q3 || g.checkin_Q4))
                ) ? (
                  <div className="text-center py-12 bg-white rounded-xl border">
                    <p className="text-gray-500">No check-ins logged yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.values(teamGoals).map(({ member, goals }) => {
                      const checked = goals.filter(g => g.status === "approved" && (g.checkin_Q1 || g.checkin_Q2 || g.checkin_Q3 || g.checkin_Q4));
                      if (checked.length === 0) return null;
                      return (
                        <div key={member.uid} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                          <div className="bg-blue-50 px-5 py-3 border-b">
                            <span className="font-semibold text-blue-800">{member.name}</span>
                          </div>
                          <div className="divide-y">
                            {checked.map(goal => (
                              <div key={goal.id} className="p-4">
                                <p className="font-medium text-gray-800 text-sm mb-2">{goal.title}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {["Q1","Q2","Q3","Q4"].map(q => goal[`checkin_${q}`] && (
                                    <div key={q} className="bg-blue-50 rounded-lg p-3 text-xs">
                                      <p className="font-semibold text-blue-700 mb-1">{q}</p>
                                      <p>Planned: <b>{goal.target}</b></p>
                                      <p>Actual: <b>{goal[`checkin_${q}`].actual}</b></p>
                                      <p>Status: <b>{goal[`checkin_${q}`].status}</b></p>
                                      {goal[`checkin_${q}`].score != null && <p>Score: <b>{goal[`checkin_${q}`].score}%</b></p>}
                                    </div>
                                  ))}
                                </div>
                                {goal.managerComment && (
                                  <div className="mt-2 bg-yellow-50 rounded p-2 text-xs text-yellow-800">
                                    💬 <b>{goal.commentBy}:</b> {goal.managerComment}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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