
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await register(
        form.name.trim(),
        form.email.trim(),
        form.password
      );

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <div className="register-container">
        <Link to="/register" className="register-brand">
          <span className="register-brand-icon">
            <Wallet size={24} />
          </span>
          <span>
            Finora <strong>AI</strong>
          </span>
        </Link>

        <div className="register-heading">
          <h1>Create your account</h1>
        </div>

        {error && (
          <div className="register-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="register-field">
            <label htmlFor="register-name">Full name</label>
            <div className="register-input-wrap">
              <UserRound size={19} />
              <input
                id="register-name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div className="register-field">
            <label htmlFor="register-email">Email address</label>
            <div className="register-input-wrap">
              <Mail size={19} />
              <input
                id="register-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="register-field">
            <label htmlFor="register-password">Password</label>
            <div className="register-input-wrap">
              <LockKeyhole size={19} />
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="register-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <div className="register-field">
            <label htmlFor="register-confirm-password">
              Confirm password
            </label>
            <div className="register-input-wrap">
              <LockKeyhole size={19} />
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Enter your password again"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="register-submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
            {!loading && <ArrowRight size={19} />}
          </button>
        </form>

        <p className="register-login-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

       
      </div>
    </main>
  );
}
