import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const USERS = [
  { email: "admin@demo.com", password: "demo1234", name: "Admin User", role: "admin", managerId: null },
  { email: "manager@demo.com", password: "demo1234", name: "Manager One", role: "manager", managerId: null },
  { email: "emp1@demo.com", password: "demo1234", name: "Employee One", role: "employee", managerId: null },
  { email: "emp2@demo.com", password: "demo1234", name: "Employee Two", role: "employee", managerId: null },
];

export default function Seed() {
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSeed() {
    setLoading(true);
    setLog([]);
    const logs = [];

    for (const u of USERS) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, u.email, u.password);
        await setDoc(doc(db, "users", cred.user.uid), {
          name: u.name,
          email: u.email,
          role: u.role,
          managerId: u.managerId,
          uid: cred.user.uid,
        });
        logs.push({ text: `✅ Created: ${u.email}`, ok: true });
      } catch (e) {
        logs.push({ text: `⚠️ ${u.email}: ${e.message}`, ok: false });
      }
      setLog([...logs]);
    }

    // Now update employees with manager's UID
    try {
      const { getDocs, collection, query, where, updateDoc } = await import("firebase/firestore");
      const managerSnap = await getDocs(query(collection(db, "users"), where("role", "==", "manager")));
      const managerUid = managerSnap.docs[0]?.id;

      const empSnap = await getDocs(query(collection(db, "users"), where("role", "==", "employee")));
      for (const empDoc of empSnap.docs) {
        await updateDoc(doc(db, "users", empDoc.id), { managerId: managerUid });
      }
      logs.push({ text: `✅ Linked employees to manager`, ok: true });
    } catch (e) {
      logs.push({ text: `⚠️ Linking failed: ${e.message}`, ok: false });
    }

    setLog([...logs]);
    setDone(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-indigo-700 mb-2">Seed Demo Users</h1>
        <p className="text-gray-500 text-sm mb-6">This creates 4 demo users in Firebase. Run once only.</p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-1">
          <p>👤 <b>emp1@demo.com</b> / demo1234 — Employee</p>
          <p>👤 <b>emp2@demo.com</b> / demo1234 — Employee</p>
          <p>👔 <b>manager@demo.com</b> / demo1234 — Manager</p>
          <p>🛡️ <b>admin@demo.com</b> / demo1234 — Admin</p>
        </div>

        {!done ? (
          <button
            onClick={handleSeed}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Creating users..." : "🚀 Seed Users"}
          </button>
        ) : (
          <a href="/login" className="block w-full text-center bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700">
            ✅ Done! Go to Login →
          </a>
        )}

        {log.length > 0 && (
          <div className="mt-4 space-y-1">
            {log.map((l, i) => (
              <p key={i} className={`text-sm ${l.ok ? "text-green-600" : "text-yellow-600"}`}>{l.text}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}