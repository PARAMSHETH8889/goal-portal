import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Seed from "./pages/Seed";

function RoleRouter() {
  const { user, userData } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (userData?.role === "employee") return <Navigate to="/employee" />;
  if (userData?.role === "manager") return <Navigate to="/manager" />;
  if (userData?.role === "admin") return <Navigate to="/admin" />;
  return <div>Unknown role</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/seed" element={<Seed />} />
          <Route path="/employee/*" element={<EmployeeDashboard />} />
          <Route path="/manager/*" element={<ManagerDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="*" element={<RoleRouter />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}