
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  X,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  CircleAlert,
} from "lucide-react";
import api from "../services/api";
import "./Budgets.css";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const newBudgetForm = () => ({
  category: "",
  monthly_limit: "",
  month: currentMonth(),
});

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

function getMonth(value) {
  if (!value) return "";
  return String(value).slice(0, 7);
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [form, setForm] = useState(newBudgetForm);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadBudgets() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/budgets");

      const data =
        response.data?.budgets ??
        response.data?.data ??
        [];

      setBudgets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load budgets error:", err);
      setError(
        err.response?.data?.message || "Could not load budgets."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBudgets();
  }, []);

  const monthlyBudgets = useMemo(
    () =>
      budgets.filter(
        (budget) => getMonth(budget.month) === selectedMonth
      ),
    [budgets, selectedMonth]
  );

  const totals = useMemo(() => {
    return monthlyBudgets.reduce(
      (result, budget) => {
        const limit =
          Number(budget.monthly_limit ?? budget.monthlyLimit) || 0;

        const spent =
          Number(budget.spent ?? budget.total_spent) || 0;

        result.limit += limit;
        result.spent += spent;

        if (limit > 0 && spent > limit) {
          result.overBudgetCount += 1;
        }

        return result;
      },
      {
        limit: 0,
        spent: 0,
        overBudgetCount: 0,
      }
    );
  }, [monthlyBudgets]);

  const totalRemaining = totals.limit - totals.spent;

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(newBudgetForm());
    setEditingId(null);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const category = form.category.trim();
    const monthlyLimit = Number(form.monthly_limit);

    if (!category) {
      setError("Please enter a budget category.");
      return;
    }

    if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
      setError("Monthly limit must be greater than zero.");
      return;
    }

    if (!form.month) {
      setError("Please select a budget month.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        category,
        monthly_limit: monthlyLimit,
        month: form.month,
      };

      if (editingId !== null) {
        await api.put(`/api/budgets/${editingId}`, payload);
        setMessage("Budget updated successfully.");
      } else {
        await api.post("/api/budgets", payload);
        setMessage("Budget created successfully.");
      }

      setSelectedMonth(form.month);
      setForm(newBudgetForm());
      setEditingId(null);

      await loadBudgets();
    } catch (err) {
      console.error("Save budget error:", err);
      setError(
        err.response?.data?.message || "Could not save the budget."
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(budget) {
    setEditingId(budget.id);

    setForm({
      category: budget.category || "",
      monthly_limit: String(
        budget.monthly_limit ?? budget.monthlyLimit ?? ""
      ),
      month: getMonth(budget.month) || currentMonth(),
    });

    setSelectedMonth(getMonth(budget.month) || currentMonth());
    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteBudget(budget) {
    const confirmed = window.confirm(
      `Delete the budget for ${budget.category}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/api/budgets/${budget.id}`);

      if (editingId === budget.id) {
        setForm(newBudgetForm());
        setEditingId(null);
      }

      setMessage("Budget deleted successfully.");
      await loadBudgets();
    } catch (err) {
      console.error("Delete budget error:", err);
      setError(
        err.response?.data?.message || "Could not delete the budget."
      );
    }
  }

  return (
    <main className="budgets-page">
      {/* Page header */}
      <header className="budgets-header">
        <div>
          <Link to="/dashboard" className="back-link">
            <ArrowLeft size={17} />
            Dashboard
          </Link>

          <h1>Budget management</h1>

          <p className="muted">
            Plan your monthly spending and keep your finances on track.
          </p>
        </div>

        
      </header>

      {/* Feedback messages */}
      {error && (
        <div className="transaction-alert error-message" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="transaction-alert success-message" role="status">
          {message}
        </div>
      )}

      {/* Monthly filter */}
      <section className="budget-month-filter panel">
        <div>
          <h2>Monthly overview</h2>
          <p className="muted">
            Choose a month to review your budgets and spending.
          </p>
        </div>

        <div className="transaction-field">
          <label htmlFor="selectedMonth">Report month</label>
          <input
            id="selectedMonth"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </div>
      </section>

      {/* Monthly summary */}
      <section className="budget-summary-grid">
        <article className="budget-summary-card">
          <div className="budget-summary-icon">
            <Wallet size={21} />
          </div>
          <p>Total budget</p>
          <h2>{money(totals.limit)}</h2>
          <span>{monthlyBudgets.length} budget categories</span>
        </article>

        <article className="budget-summary-card">
          <div className="budget-summary-icon spent-summary-icon">
            <TrendingDown size={21} />
          </div>
          <p>Total spent</p>
          <h2>{money(totals.spent)}</h2>
          <span>
            {totals.limit > 0
              ? `${((totals.spent / totals.limit) * 100).toFixed(1)}% of total budget`
              : "No budget limit set"}
          </span>
        </article>

        <article
          className={`budget-summary-card ${
            totalRemaining < 0 ? "budget-summary-danger" : ""
          }`}
        >
          <div className="budget-summary-icon remaining-summary-icon">
            {totalRemaining < 0 ? (
              <CircleAlert size={21} />
            ) : (
              <TrendingUp size={21} />
            )}
          </div>
          <p>{totalRemaining < 0 ? "Over budget" : "Remaining budget"}</p>
          <h2>{money(Math.abs(totalRemaining))}</h2>
          <span>
            {totalRemaining < 0
              ? "Above your combined limits"
              : "Available within your limits"}
          </span>
        </article>
      </section>

      {/* Create or edit budget */}
      <section className="transaction-form-panel">
        <div className="transaction-section-title">
          <div>
            <h2>{editingId !== null ? "Edit budget" : "Create a budget"}</h2>
            <p className="muted">
              Set a spending limit for a category and month.
            </p>
          </div>

          {editingId !== null && (
            <button
              className="cancel-edit-button"
              type="button"
              onClick={resetForm}
            >
              <X size={16} />
              Cancel
            </button>
          )}
        </div>

        <form className="transaction-form" onSubmit={handleSubmit}>
          <div className="transaction-field">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              name="category"
              value={form.category}
              onChange={updateField}
              placeholder="e.g. Food, Transport"
              maxLength={80}
              required
            />
          </div>

          <div className="transaction-field">
            <label htmlFor="monthly_limit">Monthly limit (BDT)</label>
            <input
              id="monthly_limit"
              name="monthly_limit"
              type="number"
              min="0.01"
              step="0.01"
              value={form.monthly_limit}
              onChange={updateField}
              placeholder="e.g. 8000"
              required
            />
          </div>

          <div className="transaction-field">
            <label htmlFor="budgetMonth">Budget month</label>
            <input
              id="budgetMonth"
              name="month"
              type="month"
              value={form.month}
              onChange={updateField}
              required
            />
          </div>

          <div className="transaction-form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={saving}
            >
              <Plus size={17} />
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save changes"
                  : "Create budget"}
            </button>
          </div>
        </form>
      </section>

      {/* Budget cards */}
      <section className="budget-list-section">
        <div className="transaction-section-title">
          <div>
            <h2>Your budgets</h2>
            <p className="muted">
              Spending and remaining limits for {selectedMonth}.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="loading-panel">Loading budgets...</div>
        ) : monthlyBudgets.length === 0 ? (
          <div className="empty-state budget-empty">
            <Wallet size={30} />
            <p>No budgets found for {selectedMonth}.</p>
            <span>
              Create a budget above or select another month.
            </span>
          </div>
        ) : (
          <div className="budget-grid">
            {monthlyBudgets.map((budget) => {
              const limit =
                Number(budget.monthly_limit ?? budget.monthlyLimit) || 0;

              const spent =
                Number(budget.spent ?? budget.total_spent) || 0;

              const remaining = limit - spent;

              const percentage =
                limit > 0 ? (spent / limit) * 100 : 0;

              const overBudget = spent > limit;

              const progressWidth = Math.min(percentage, 100);

              return (
                <article className="budget-card" key={budget.id}>
                  <div className="budget-card-header">
                    <div className="budget-icon">
                      <Wallet size={20} />
                    </div>

                    <div className="budget-card-actions">
                      <button
                        type="button"
                        className="icon-button"
                        title="Edit budget"
                        aria-label={`Edit ${budget.category} budget`}
                        onClick={() => startEditing(budget)}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className="icon-button delete-button"
                        title="Delete budget"
                        aria-label={`Delete ${budget.category} budget`}
                        onClick={() => deleteBudget(budget)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3>{budget.category}</h3>

                  <p className="budget-month">
                    {getMonth(budget.month)}
                  </p>

                  <div className="budget-amount-row">
                    <span>Amount spent</span>
                    <strong>{money(spent)}</strong>
                  </div>

                  <div
                    className="budget-progress-track"
                    role="progressbar"
                    aria-label={`${budget.category} budget used`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(
                      Math.round(percentage),
                      100
                    )}
                  >
                    <div
                      className={`budget-progress-fill ${
                        overBudget ? "over-budget" : ""
                      }`}
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>

                  <div className="budget-amount-row budget-limit-row">
                    <span>Limit: {money(limit)}</span>

                    <strong
                      className={
                        overBudget ? "amount-expense" : "amount-income"
                      }
                    >
                      {overBudget
                        ? `${money(Math.abs(remaining))} over`
                        : `${money(remaining)} left`}
                    </strong>
                  </div>

                  <p
                    className={`budget-usage-label ${
                      overBudget ? "budget-warning" : ""
                    }`}
                  >
                    {overBudget
                      ? `Budget exceeded by ${money(Math.abs(remaining))}.`
                      : `${percentage.toFixed(1)}% of budget used.`}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
