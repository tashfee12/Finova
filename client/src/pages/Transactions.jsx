
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Plus, X, RefreshCw } from "lucide-react";
import api from "../services/api";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyForm = () => ({
  type: "expense",
  amount: "",
  category: "",
  description: "",
  transaction_date: today(),
});

const money = (amount) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadTransactions() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/transactions");
      setTransactions(response.data.transactions || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load transactions. Please log in again if your session expired."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        category: form.category.trim(),
        description: form.description.trim(),
      };

      if (editingId !== null) {
        await api.put(`/api/transactions/${editingId}`, payload);
        setMessage("Transaction updated successfully.");
      } else {
        await api.post("/api/transactions", payload);
        setMessage("Transaction added successfully.");
      }

      resetForm();
      await loadTransactions();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not save the transaction."
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(transaction) {
    setEditingId(transaction.id);
    setForm({
      type: transaction.type,
      amount: String(transaction.amount),
      category: transaction.category || "",
      description: transaction.description || "",
      transaction_date: String(transaction.transaction_date).slice(0, 10),
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteTransaction(transaction) {
    const confirmed = window.confirm(
      `Delete this ${transaction.type} transaction of ${money(transaction.amount)}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/api/transactions/${transaction.id}`);

      if (editingId === transaction.id) {
        resetForm();
      }

      setMessage("Transaction deleted successfully.");
      await loadTransactions();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not delete the transaction."
      );
    }
  }

  const filteredTransactions = transactions.filter((transaction) =>
    filter === "all" ? true : transaction.type === filter
  );

  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <main className="transactions-page">
      <header className="transactions-header">
        <div>
          <Link to="/dashboard" className="back-link">
            <ArrowLeft size={17} /> Dashboard
          </Link>
          <h1>Transactions</h1>
          <p className="muted">
            Record and manage your income and expenses.
          </p>
        </div>

        
      </header>

      <section className="transaction-summary">
        <article className="transaction-summary-card">
          <span>Total recorded income</span>
          <strong className="amount-income">{money(totalIncome)}</strong>
        </article>
        <article className="transaction-summary-card">
          <span>Total recorded expenses</span>
          <strong className="amount-expense">{money(totalExpenses)}</strong>
        </article>
        <article className="transaction-summary-card">
          <span>Number of transactions</span>
          <strong>{transactions.length}</strong>
        </article>
      </section>

      {error && <div className="transaction-alert error-message">{error}</div>}
      {message && <div className="transaction-alert success-message">{message}</div>}

      <section className="transaction-form-panel">
        <div className="transaction-section-title">
          <h2>{editingId !== null ? "Edit transaction" : "Add a transaction"}</h2>
          {editingId !== null && (
            <button className="cancel-edit-button" type="button" onClick={resetForm}>
              <X size={16} /> Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="transaction-field">
            <label htmlFor="type">Transaction type</label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={updateField}
              required
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="transaction-field">
            <label htmlFor="amount">Amount (BDT ৳)</label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={updateField}
              placeholder="e.g. 500"
              required
            />
          </div>

          <div className="transaction-field">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              name="category"
              value={form.category}
              onChange={updateField}
              placeholder="e.g. Food, Salary, Transport"
              maxLength={80}
              required
            />
          </div>

        
<div className="transaction-field">
  <label htmlFor="transaction_date">Date</label>
  <input
    id="transaction_date"
    name="transaction_date"
    type="date"
    value={form.transaction_date || ""}
    onChange={updateField}
    required
  />
</div>


          <div className="transaction-field transaction-description">
            <label htmlFor="description">Description (optional)</label>
            <input
              id="description"
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder="e.g. Lunch with friends"
              maxLength={500}
            />
          </div>

          <div className="transaction-form-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              <Plus size={17} />
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save changes"
                  : "Add transaction"}
            </button>
          </div>
        </form>
      </section>

      <section className="transaction-history-panel">
        <div className="transaction-section-title">
          <div>
            <h2>Transaction history</h2>
            <p className="muted">Your saved financial records</p>
          </div>

          <select
            aria-label="Filter transactions"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All types</option>
            <option value="income">Income only</option>
            <option value="expense">Expenses only</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-panel">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions found.</p>
            <span>Add a transaction using the form above.</span>
          </div>
        ) : (
          <div className="transaction-table-wrap">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Details</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{String(transaction.transaction_date).slice(0, 10)}</td>
                    <td>
                      <strong>{transaction.category}</strong>
                      <span className="table-description">
                        {transaction.description || "No description"}
                      </span>
                    </td>
                    <td>
                      <span className={`type-pill ${transaction.type}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td
                      className={
                        transaction.type === "income"
                          ? "amount-income"
                          : "amount-expense"
                      }
                    >
                      {transaction.type === "income" ? "+" : "−"}
                      {money(transaction.amount)}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="icon-button"
                          title="Edit transaction"
                          aria-label="Edit transaction"
                          onClick={() => startEditing(transaction)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button delete-button"
                          title="Delete transaction"
                          aria-label="Delete transaction"
                          onClick={() => deleteTransaction(transaction)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
