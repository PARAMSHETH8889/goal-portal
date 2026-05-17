import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Target, CheckCircle, AlertCircle } from "lucide-react";
import Navbar from "../components/Navbar";

const THRUST_AREAS = [
  "Sales & Revenue", "Customer Success", "Operations", "Product & Technology",
  "People & Culture", "Finance", "Marketing", "Quality & Safety"
];
const UOM_TYPES = ["Min (Numeric/%)", "Max (Numeric/%)", "Timeline", "Zero-based"];
const STATUS_COLORS = {
  draft: "bg-yellow-100 text-yellow-700",
  pending_approval: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rework: "bg-red-100 text-red-700",
};

function computeScore(uom, target, actual) {
  if (!actual || !target) return null;
  if (uom === "Min (Numeric/%)") return Math.round((actual / target) * 100);
  if (uom === "Max (Numeric/%)") return Math.round((target / actual) * 100);
  if (uom === "Zero-based") return actual == 0 ? 100 : 0;
  return null;
}

export default function EmployeeDashboard() {
  const { userData } = useAuth();
  const [goals, setGoals] = useState([]);
  const [view, setView] = useState("goals");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [form, setForm] = useState({ thrustArea: "", title: "", description: "", uomType: "Min (Numeric/%)", target: "", weightage: "" });
  const [formError, setFormError] = useState("");
  const [checkinGoalId, setCheckinGoalId] = useState(null);
  const [checkinData, setCheckinData] = useState({ actual: "", status: "On Track", quarter: "Q1" });

  useEffect(() => { fetchGoals(); }, []);

  async function fetchGoals() {
    setLoading(true);
    const q = query(collection(db, "goals"), where("employeeId", "==", userData.uid));
    const snap = await getDocs(q);
    setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function totalWeightage(exclude = null) {
    return goals.filter(g => g.id !== exclude).reduce((sum, g) => sum + Number(g.weightage), 0);
  }

  async function handleAddGoal(e) {
    e.preventDefault();
    setFormError("");
    const w = Number(form.weightage);
    const used = totalWeightage();
    if (!form.thrustArea) return setFormError("Please select a Thrust Area.");
    if (!form.title.trim()) return setFormError("Goal title is required.");
    if (w < 10) return setFormError("Minimum weightage per goal is 10%.");
    if (used + w > 100) return setFormError(`Total weightage cannot exceed 100%. You have ${100 - used}% remaining.`);
    if (goals.length >= 8) return setFormError("Maximum 8 goals allowed per employee.");
    if (!form.target) return setFormError("Please enter a target value.");
    setSaving(true);
    await addDoc(collection(db, "goals"), {
      employeeId: userData.uid, employeeName: userData.name, managerId: userData.managerId,
      thrustArea: form.thrustArea, title: form.title, description: form.description,
      uomType: form.uomType, target: form.target, weightage: w,
      status: "draft", createdAt: new Date().toISOString(), isShared: false,
    });
    setForm({ thrustArea: "", title: "", description: "", uomType: "Min (Numeric/%)", target: "", weightage: "" });
    setSuccessMsg("Goal added successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
    setSaving(false);
    fetchGoals();
    setView("goals");
  }

  async function handleSubmitAll() {
    const total = totalWeightage();
    if (total !== 100) { alert(`Total weightage must equal 100%. Currently: ${total}%`); return; }
    if (goals.filter(g => g.status === "draft").length === 0) { alert("No draft goals to submit."); return; }
    setSaving(true);
    for (const g of goals.filter(g => g.status === "draft")) {
      await updateDoc(doc(db, "goals", g.id), { status: "pending_approval" });
    }
    setSuccessMsg("Goals submitted for approval!");
    setTimeout(() => setSuccessMsg(""), 3000);
    setSaving(false);
    fetchGoals();
  }

  async function handleCheckin(e) {
    e.preventDefault();
    if (!checkinData.actual) return;
    setSaving(true);
    const goal = goals.find(g => g.id === checkinGoalId);
    const score = computeScore(goal.uomType, goal.target, checkinData.actual);
    await updateDoc(doc(db, "goals", checkinGoalId), {
      [`checkin_${checkinData.quarter}`]: { actual: checkinData.actual, status: checkinData.status, score, updatedAt: new Date().toISOString() }
    });
    setCheckinGoalId(null);
    setSuccessMsg("Check-in saved!");
    setTimeout(() => setSuccessMsg(""), 3000);
    setSaving(false);
    fetchGoals();
    setView("goals");
  }

  const draftGoals = goals.filter(g => g.status === "draft");
  const usedWeightage = totalWeightage();
  const canSubmit = draftGoals.length > 0 && usedWeightage === 100;
  const remaining = 100 - usedWeightage;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        title="Employee Portal"
        activeTab={view}
        setTab={setView}
        tabs={[
          { id: "goals", label: "My Goals", activeColor: "bg-indigo-600" },
          { id: "create", label: "+ Add Goal", activeColor: "bg-indigo-600" },
        ]}
      />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        {view === "goals" && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-xs text-gray-500">Total Goals</p>
                <p className="text-2xl font-bold text-indigo-600">{goals.length}<span className="text-sm text-gray-400">/8</span></p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-xs text-gray-500">Weightage Used</p>
                <p className={`text-2xl font-bold ${usedWeightage === 100 ? "text-green-600" : "text-yellow-600"}`}>{usedWeightage}<span className="text-sm text-gray-400">%</span></p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-xs text-gray-500">Approved Goals</p>
                <p className="text-2xl font-bold text-green-600">{goals.filter(g => g.status === "approved").length}</p>
              </div>
            </div>

            {draftGoals.length > 0 && (
              <div className={`mb-4 p-3 rounded-lg border flex items-center justify-between ${canSubmit ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
                <div className="flex items-center gap-2 text-sm">
                  {canSubmit
                    ? <><CheckCircle size={16} className="text-green-600" /><span className="text-green-700">Weightage is 100% — ready to submit!</span></>
                    : <><AlertCircle size={16} className="text-yellow-600" /><span className="text-yellow-700">Weightage must equal 100%. Currently: {usedWeightage}%</span></>}
                </div>
                <button onClick={handleSubmitAll} disabled={!canSubmit || saving}
                  className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                  Submit for Approval
                </button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading goals...</div>
            ) : goals.length === 0 ? (
              <div className="text-center py-12">
                <Target size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No goals yet</p>
                <p className="text-gray-400 text-sm mb-4">Start by adding your first goal</p>
                <button onClick={() => setView("create")} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">
                  + Add First Goal
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {goals.map(goal => (
                  <div key={goal.id} className="bg-white rounded-xl shadow-sm border p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs text-indigo-500 font-medium">{goal.thrustArea}</span>
                        <h3 className="font-semibold text-gray-800 mt-0.5">{goal.title}</h3>
                        {goal.description && <p className="text-sm text-gray-500 mt-1">{goal.description}</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[goal.status] || "bg-gray-100 text-gray-600"}`}>
                        {goal.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 mt-3">
                      <span>🎯 Target: <b>{goal.target}</b></span>
                      <span>⚖️ Weightage: <b>{goal.weightage}%</b></span>
                      <span>📏 UoM: <b>{goal.uomType}</b></span>
                    </div>
                    {["Q1","Q2","Q3","Q4"].map(q => goal[`checkin_${q}`] && (
                      <div key={q} className="mt-3 bg-blue-50 rounded-lg p-3 text-sm">
                        <span className="font-medium text-blue-700">{q} Check-in:</span>
                        <span className="ml-2 text-gray-700">Actual: <b>{goal[`checkin_${q}`].actual}</b></span>
                        <span className="ml-2 text-gray-700">Status: <b>{goal[`checkin_${q}`].status}</b></span>
                        {goal[`checkin_${q}`].score !== null && <span className="ml-2 text-gray-700">Score: <b>{goal[`checkin_${q}`].score}%</b></span>}
                      </div>
                    ))}
                    {goal.status === "approved" && (
                      <button onClick={() => { setCheckinGoalId(goal.id); setView("checkin"); }}
                        className="mt-3 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                        + Log Achievement
                      </button>
                    )}
                    {goal.status === "rework" && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">⚠️ Manager returned this goal for rework. Please edit and resubmit.</p>
                    )}
                    {goal.managerComment && (
                      <div className="mt-2 bg-yellow-50 rounded p-2 text-xs text-yellow-800">
                        💬 <b>{goal.commentBy}:</b> {goal.managerComment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "create" && (
          <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Add New Goal</h2>
            <p className="text-sm text-gray-500 mb-5">{goals.length}/8 goals · {usedWeightage}% used · {remaining}% remaining</p>

            {remaining <= 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 mb-4">
                <AlertCircle size={16} /> Weightage is already at 100%. You cannot add more goals unless you remove an existing one.
              </div>
            ) : null}

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thrust Area *</label>
                <select value={form.thrustArea} onChange={e => setForm({...form, thrustArea: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm">
                  <option value="">Select thrust area...</option>
                  {THRUST_AREAS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  placeholder="e.g. Increase Q2 Sales Revenue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  rows={2} placeholder="Optional details..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measurement *</label>
                  <select value={form.uomType} onChange={e => setForm({...form, uomType: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm">
                    {UOM_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target *</label>
                  <input value={form.target} onChange={e => setForm({...form, target: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    placeholder="e.g. 100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weightage * <span className="text-gray-400">(min 10%, remaining: {remaining}%)</span>
                </label>
                {/* FIX: max is Math.max(10, remaining) to prevent browser min>max error when remaining=0 */}
                <input
                  type="number"
                  min="10"
                  max={Math.max(10, remaining)}
                  value={form.weightage}
                  onChange={e => setForm({...form, weightage: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  placeholder="e.g. 25"
                />
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                {/* FIX: disable button when weightage is full */}
                <button
                  type="submit"
                  disabled={saving || remaining <= 0}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  {saving ? "Saving..." : remaining <= 0 ? "Weightage Full (100%)" : "Add Goal"}
                </button>
                <button type="button" onClick={() => setView("goals")}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {view === "checkin" && checkinGoalId && (() => {
          const goal = goals.find(g => g.id === checkinGoalId);
          return (
            <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl mx-auto">
              <h2 className="text-lg font-bold text-gray-800 mb-5">Log Achievement</h2>
              <div className="bg-indigo-50 rounded-lg p-4 mb-5">
                <p className="font-medium text-indigo-800">{goal.title}</p>
                <p className="text-sm text-gray-600 mt-1">Target: <b>{goal.target}</b> · UoM: <b>{goal.uomType}</b></p>
              </div>
              <form onSubmit={handleCheckin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
                  <select value={checkinData.quarter} onChange={e => setCheckinData({...checkinData, quarter: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm">
                    {["Q1","Q2","Q3","Q4"].map(q => <option key={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Achievement</label>
                  <input value={checkinData.actual} onChange={e => setCheckinData({...checkinData, actual: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    placeholder="Enter actual value achieved" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={checkinData.status} onChange={e => setCheckinData({...checkinData, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm">
                    {["Not Started","On Track","Completed"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {checkinData.actual && goal.uomType !== "Timeline" && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                    📊 Computed Score: <b>{computeScore(goal.uomType, goal.target, checkinData.actual)}%</b>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm">
                    {saving ? "Saving..." : "Save Check-in"}
                  </button>
                  <button type="button" onClick={() => setView("goals")}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          );
        })()}
      </main>
    </div>
  );
}