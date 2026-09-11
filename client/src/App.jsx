import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layouts/AppLayout.jsx";

import AgentDashboardPage from "./pages/AgentDashboardPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import CategoryPage from "./pages/CategoryPage.jsx";
import ContactSupportPage from "./pages/ContactSupportPage.jsx";
import CustomerDashboardPage from "./pages/CustomerDashboardPage.jsx";
import FaqPage from "./pages/FaqPage.jsx";
import HelpCenterHome from "./pages/HelpCenterHome.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ManagerDashboardPage from "./pages/ManagerDashboardPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SavedRepliesPage from "./pages/SavedRepliesPage.jsx";
import TicketDetailsPage from "./pages/TicketDetailsPage.jsx";

import ProtectedRoute from "./router/ProtectedRoute.jsx";

function RoleRoute({ roles, children }) {
  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/help" replace />} />

        <Route path="/help" element={<HelpCenterHome />} />
        <Route path="/categories/:id" element={<CategoryPage />} />
        <Route path="/requests/:id" element={<FaqPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/contact-support/:id"
          element={
            <RoleRoute roles={["customer"]}>
              <ContactSupportPage />
            </RoleRoute>
          }
        />

        <Route
          path="/tickets/:id"
          element={
            <RoleRoute roles={["customer", "agent", "manager", "admin"]}>
              <TicketDetailsPage />
            </RoleRoute>
          }
        />

        <Route
          path="/saved-replies"
          element={
            <RoleRoute roles={["agent", "manager", "admin"]}>
              <SavedRepliesPage />
            </RoleRoute>
          }
        />

        <Route
          path="/customer"
          element={
            <RoleRoute roles={["customer"]}>
              <CustomerDashboardPage />
            </RoleRoute>
          }
        />

        <Route
          path="/agent"
          element={
            <RoleRoute roles={["agent"]}>
              <AgentDashboardPage />
            </RoleRoute>
          }
        />

        <Route
          path="/manager"
          element={
            <RoleRoute roles={["manager"]}>
              <ManagerDashboardPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <RoleRoute roles={["admin"]}>
              <AdminDashboardPage />
            </RoleRoute>
          }
        />

        <Route path="/dashboard" element={<DashboardRedirect />} />

        <Route path="*" element={<Navigate to="/help" replace />} />
      </Route>
    </Routes>
  );
}

function DashboardRedirect() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  switch (user?.role) {
    case "customer":
      return <Navigate to="/customer" replace />;
    case "agent":
      return <Navigate to="/agent" replace />;
    case "manager":
      return <Navigate to="/manager" replace />;
    case "admin":
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/help" replace />;
  }
}
