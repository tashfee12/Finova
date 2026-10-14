
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  ReceiptText,
  Wallet,
  Bot,
  LogOut,
  CalendarClock,
} from "lucide-react";
import "./Navbar.css";

export default function Navbar() {
  const { logout } = useAuth();
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

      <button className="logout-button" onClick={handleLogout}>
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </aside>
  );
}
