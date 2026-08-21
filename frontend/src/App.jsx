import React from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Branches from "./pages/Branches";
import Students from "./pages/Students";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import EmployeeAttendance from "./pages/EmployeeAttendance";
import Tests from "./pages/Tests";
import Evaluations from "./pages/Evaluations";
import Hifz from "./pages/Hifz";
import Competitions from "./pages/Competitions";
import LeaveRequests from "./pages/LeaveRequests";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Salaries from "./pages/Salaries";
import Reports from "./pages/Reports";
import SiteSettings from "./pages/SiteSettings";

const withLayout = (Component) => (
  <Layout>
    <Component />
  </Layout>
);

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sand-500">جارِ التحميل...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<ProtectedRoute>{withLayout(Dashboard)}</ProtectedRoute>} />
      <Route
        path="/branches"
        element={<ProtectedRoute roles={["super_admin"]}>{withLayout(Branches)}</ProtectedRoute>}
      />
      <Route path="/students" element={<ProtectedRoute>{withLayout(Students)}</ProtectedRoute>} />
      <Route
        path="/employees"
        element={<ProtectedRoute roles={["super_admin", "branch_manager"]}>{withLayout(Employees)}</ProtectedRoute>}
      />
      <Route path="/attendance" element={<ProtectedRoute>{withLayout(Attendance)}</ProtectedRoute>} />
      <Route path="/employee-attendance" element={<ProtectedRoute>{withLayout(EmployeeAttendance)}</ProtectedRoute>} />
      <Route path="/tests" element={<ProtectedRoute>{withLayout(Tests)}</ProtectedRoute>} />
      <Route path="/evaluations" element={<ProtectedRoute>{withLayout(Evaluations)}</ProtectedRoute>} />
      <Route path="/hifz" element={<ProtectedRoute>{withLayout(Hifz)}</ProtectedRoute>} />
      <Route
        path="/competitions"
        element={<ProtectedRoute roles={["super_admin", "branch_manager"]}>{withLayout(Competitions)}</ProtectedRoute>}
      />
      <Route path="/leaves" element={<ProtectedRoute>{withLayout(LeaveRequests)}</ProtectedRoute>} />
      <Route
        path="/payments"
        element={<ProtectedRoute roles={["super_admin", "branch_manager"]}>{withLayout(Payments)}</ProtectedRoute>}
      />
      <Route
        path="/expenses"
        element={<ProtectedRoute roles={["super_admin", "branch_manager"]}>{withLayout(Expenses)}</ProtectedRoute>}
      />
      <Route path="/salaries" element={<ProtectedRoute>{withLayout(Salaries)}</ProtectedRoute>} />
      <Route
        path="/reports"
        element={<ProtectedRoute roles={["super_admin", "branch_manager"]}>{withLayout(Reports)}</ProtectedRoute>}
      />
      <Route
        path="/settings"
        element={<ProtectedRoute roles={["super_admin"]}>{withLayout(SiteSettings)}</ProtectedRoute>}
      />
      <Route path="*" element={<ProtectedRoute>{withLayout(Dashboard)}</ProtectedRoute>} />
    </Routes>
  );
}

export default App;
