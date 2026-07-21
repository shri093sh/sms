import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { BranchProvider } from "./context/BranchContext.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./components/AppLayout.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Students from "./pages/Students.jsx";
import Fees from "./pages/Fees.jsx";
import Attendance from "./pages/Attendance.jsx";
import Settings from "./pages/Settings.jsx";
import Staff from "./pages/Staff.jsx";
import Timetable from "./pages/Timetable.jsx";
import Payroll from "./pages/Payroll.jsx";
import Exams from "./pages/Exams.jsx";
import Assignments from "./pages/Assignments.jsx";
import Reports from "./pages/Reports.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
        <BranchProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/fees" element={<Fees />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/timetable" element={<Timetable />} />
                <Route path="/exams" element={<Exams />} />
                <Route path="/assignments" element={<Assignments />} />
              </Route>

              <Route element={<ProtectedRoute roles={["admin"]} />}>
                <Route element={<AppLayout />}>
                  <Route path="/payroll" element={<Payroll />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute roles={["admin", "accountant"]} />}>
                <Route element={<AppLayout />}>
                  <Route path="/reports" element={<Reports />} />
                </Route>
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BranchProvider>
        </AuthProvider>
      </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
