import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ChartNoAxesCombined,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formData.email.trim() || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await login(formData.email.trim(), formData.password);

      if (rememberMe) {
        localStorage.setItem("rememberEmail", formData.email.trim());
      } else {
        localStorage.removeItem("rememberEmail");
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-visual">
        <div className="visual-glow visual-glow-one" />
        <div className="visual-glow visual-glow-two" />

        <Link to="/login" className="brand">
          <span className="brand-icon">
            <Wallet size={23} />
          </span>
          <span>Finova <span className="brand-highlight"> AI</span></span>
        </Link>

        <div className="visual-content">
          <span className="eyebrow">
            <Sparkles size={15} />
            YOUR PERSONAL FINANCE PARTNER
          </span>

          <h1>
            Your money,
            <br />
            <span>in smarter hands.</span>
          </h1>

          <p className="visual-description">
            Understand your spending, build better habits, and make
            confident financial decisions with your AI-powered assistant.
          </p>

          <div className="finance-preview">
            <div className="preview-top">
              <div>
                <h3>Your money at a glance</h3>
              </div>

              <span className="preview-icon">
                <ChartNoAxesCombined size={21} />
              </span>
            </div>

            <div className="chart-bars" aria-label="Decorative financial chart">
              {[35, 55, 43, 72, 50, 85, 65, 95, 70, 82, 60, 100].map(
                (height, index) => (
                  <div className="chart-bar-column" key={index}>
                    <span style={{ height: `${height}%` }} />
                  </div>
                )
              )}
            </div>

            <div className="preview-bottom">
              <span><span className="legend-dot" /> Income</span>
              <span><span className="legend-dot expense-dot" /> Expenses</span>
            </div>
          </div>

          <div className="trust-line">
            <ShieldCheck size={18} />
            <span>Your financial journey, organized in one place</span>
          </div>
        </div>

        
      </section>

      <section className="login-panel">
        <div className="login-form-wrapper">
          <div className="mobile-brand">
            <span className="brand-icon">
              <Wallet size={22} />
            </span>
            <span>Finova <span className="brand-highlight"> AI</span></span>
          </div>

          <div className="form-heading">
            <h2>Sign in to your account</h2>
            <p>Enter your details.</p>
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="email">Email address</label>

              <div className="input-wrapper">
                <Mail size={19} className="input-icon" />

                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <div className="password-label-row">
                <label htmlFor="password">Password</label>
              </div>

              <div className="input-wrapper">
                <LockKeyhole size={19} className="input-icon" />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Remember my email</span>
              </label>

            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              {!loading && <ArrowRight size={19} />}
            </button>
          </form>

          <div className="signup-prompt">
            Don't have an account? <Link to="/register">Create account</Link>
          </div>

          <div className="login-security">
           
          </div>
        </div>

        <p className="panel-footer">
          © {new Date().getFullYear()} Finance AI. Manage money with clarity.
        </p>
      </section>
    </div>
  );
}