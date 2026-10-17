
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  ReceiptText,
  Wallet,
  Bot,
  LogOut,
  CalendarClock,
  UserRound,
} from "lucide-react";
import "./Navbar.css";

export default function Navbar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const links = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", path: "/transactions", icon: ReceiptText },
    { name: "Budgets", path: "/budgets", icon: Wallet },
    {
      name: "Recurring Bills",
      path: "/recurring-bills",
      icon: CalendarClock,
    },
    { name: "AI Assistant", path: "/ai", icon: Bot },
  ];

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.full_name ||
    user?.email?.split("@")[0] ||
    "My Account";

  const initial =
    displayName !== "My Account"
      ? displayName.charAt(0).toUpperCase()
      : null;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <h2 className="sidebar-logo">Finance AI</h2>

      <nav className="sidebar-nav">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <Icon size={20} />
              <span>{link.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logged-in user's profile and logout */}
      <div className="sidebar-footer">
        <div className="sidebar-profile">
          <div className="profile-avatar">
            {initial ? (
              <span>{initial}</span>
            ) : (
              <UserRound size={22} />
            )}
          </div>

          <div className="profile-details">
            <span className="profile-name" title={displayName}>
              {displayName}
            </span>
            <span className="profile-caption">Signed in</span>
          </div>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
