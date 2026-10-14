import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import AIChat from "./pages/AIChat";
import Navbar from "./components/Navbar";
import RecurringBills from "./pages/RecurringBills";

function ProtectedRoute({ children }) {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      <main style={{ marginLeft: "240px", padding: "25px" }}>
        {children}
      </main>
    </>
  );
}

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={token ? "/dashboard" : "/login"} replace />
        }
      />

      <Route
        path="/login"
        element={token ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route
        path="/register"
        element={token ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      <Route
        path="/dashboard"
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
      />

      <Route
        path="/transactions"
        element={<ProtectedRoute><Transactions /></ProtectedRoute>}
      />

      <Route
        path="/budgets"
        element={<ProtectedRoute><Budgets /></ProtectedRoute>}
      />

      <Route
        path="/ai"
        element={<ProtectedRoute><AIChat /></ProtectedRoute>}
      />

      <Route
        path="/ai-chat"
        element={<Navigate to="/ai" replace />}
      />

      <Route
        path="*"
        element={<Navigate to={token ? "/dashboard" : "/login"} replace />}
      />
      <Route
  path="/recurring-bills"
  element={
    <ProtectedRoute>
      <RecurringBills />
    </ProtectedRoute>
  }
/>
    </Routes>
  );
}