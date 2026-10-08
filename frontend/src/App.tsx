import { Toaster } from "sonner";
import { useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";

import "./index.css";

import Navbar from "./layouts/Navbar";
import Sidebar from "./layouts/Sidebar";

import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Designations from "./pages/Designations/DesignationList";
import Employee from "./pages/Employees/EmployeeList";
import Tasks from "./pages/Tasks/TaskList";
import { useEmployeeStore } from "./store/employeeStore";
import { useAuthStore } from "./store/authStore";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isLoggedIn } = useAuthStore();

  const hideLayout = location.pathname === "/login" || !isLoggedIn;

  const { employees } = useEmployeeStore();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <Toaster richColors position="top-right" />
      {!hideLayout && <Navbar onToggleSidebar={toggleSidebar} />}

      <div className={`flex w-full overflow-x-hidden ${hideLayout ? "min-h-screen" : "h-[calc(100dvh-4rem)] overflow-y-hidden"}`}>
        {!hideLayout && <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />}

        <main className={`flex-1 min-w-0 w-full ${hideLayout ? "min-h-screen" : "h-full overflow-y-auto p-2 md:p-4"}`}>
          <Routes>
            <Route
              path="/login"
              element={isLoggedIn ? <Navigate to="/" replace /> : <Login />}
            />

            {/* Protected Routes - Always redirect to /login when not logged in */}
            <Route
              path="/"
              element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/designation"
              element={isLoggedIn ? <Designations /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/employees"
              element={isLoggedIn ? <Employee /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/tasks"
              element={
                isLoggedIn ? (
                  <Tasks employees={employees as any} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Any unknown route redirects to / or /login */}
            <Route
              path="*"
              element={<Navigate to={isLoggedIn ? "/" : "/login"} replace />}
            />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default App;
