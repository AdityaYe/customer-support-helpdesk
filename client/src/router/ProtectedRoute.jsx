import { Navigate, useLocation } from "react-router-dom";
import LoadingState from "../components/LoadingState.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ roles = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Checking your session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    const dashboardByRole = {
      customer: "/customer",
      agent: "/agent",
      manager: "/manager",
      admin: "/admin",
    };

    return <Navigate to={dashboardByRole[user.role] || "/help"} replace />;
  }

  return children;
}
