
import { useEffect, useState } from "react";
import {
  CalendarClock,
  Plus,
  Trash2,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  CircleDollarSign,
} from "lucide-react";
import api from "../services/api";
import "./RecurringBills.css";

const initialForm = {
  title: "",
  amount: "",
  category: "Utilities",
  frequency: "monthly",
  next_due_date: "",
  reminder_days: "3",
};

function formatMoney(amount) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(dateString) {
  const date = String(dateString).slice(0, 10);
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) return "Invalid date";

  return new Date(year, month - 1, day).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatus(bill) {
  if (!bill.is_active) return "inactive";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(
    String(bill.next_due_date).slice(0, 10) + "T00:00:00"
  );

  const daysLeft = Math.round((dueDate - today) / 86400000);

  if (daysLeft < 0) return "overdue";
  if (daysLeft <= Number(bill.reminder_days)) return "due_soon";

  return "upcoming";
}

export default function RecurringBills() {
  const [bills, setBills] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payingBillId, setPayingBillId] = useState(null);
  const [paidBillIds, setPaidBillIds] = useState(() => new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadBills() {
    try {
      setError("");

      const response = await api.get("/api/recurring-bills");
      const loadedBills = response.data.bills || [];

      setBills(loadedBills);

      // Merge permanent database status into the page state.
      setPaidBillIds((previous) => {
        const updated = new Set(previous);

        loadedBills.forEach((bill) => {
          if (bill.is_paid === true || bill.is_paid === "true") {
            updated.add(String(bill.id));
          }
        });

        return updated;
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load bills. Please log in again if your session has expired."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBills();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.title.trim() || !form.category.trim()) {
      setError("Please enter a bill name and category.");
      return;
    }

    if (!form.next_due_date) {
      setError("Please choose the next due date.");
      return;
    }

    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/api/recurring-bills", {
        ...form,
        title: form.title.trim(),
        category: form.category.trim(),
        amount: Number(form.amount),
        reminder_days: Number(form.reminder_days),
      });

      setForm(initialForm);
      setShowForm(false);
      setNotice("Recurring bill added successfully.");

      await loadBills();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not save the recurring bill."
      );
    } finally {
      setSaving(false);
    }
  }

  async function markAsPaid(bill) {
    const billId = String(bill.id);
    const alreadyPaid =
      paidBillIds.has(billId) ||
      bill.is_paid === true ||
      bill.is_paid === "true";

    if (alreadyPaid || payingBillId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Record a payment of ${formatMoney(bill.amount)} for "${bill.title}"?\n\nThis will add an expense to your transaction history. This bill will remain marked Paid permanently.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setPayingBillId(billId);

    try {
      const response = await api.post(
        `/api/recurring-bills/${bill.id}/pay`
      );

      if (response.data.success !== true) {
        throw new Error(
          response.data.message || "Payment could not be confirmed."
        );
      }

      // Show Paid immediately after the server confirms payment.
      setPaidBillIds((previous) => {
        const updated = new Set(previous);
        updated.add(billId);
        return updated;
      });

      setBills((previous) =>
        previous.map((item) =>
          String(item.id) === billId
            ? { ...item, is_paid: true }
            : item
        )
      );

      setNotice("Payment recorded successfully. This bill is now marked Paid.");

      // Reload from PostgreSQL to synchronize the saved status.
      try {
        const billsResponse = await api.get("/api/recurring-bills");
        const loadedBills = billsResponse.data.bills || [];

        setBills(loadedBills);

        setPaidBillIds((previous) => {
          const updated = new Set(previous);
          updated.add(billId);

          loadedBills.forEach((item) => {
            if (
              item.is_paid === true ||
              item.is_paid === "true"
            ) {
              updated.add(String(item.id));
            }
          });

          return updated;
        });
      } catch (refreshError) {
        console.error("Bill refresh error:", refreshError);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Payment could not be confirmed. Check your transaction history before trying again."
      );
    } finally {
      setPayingBillId(null);
    }
  }

  async function toggleActive(bill) {
    setError("");
    setNotice("");

    try {
      await api.patch(`/api/recurring-bills/${bill.id}`, {
        is_active: !bill.is_active,
      });

      setNotice(
        bill.is_active ? "Bill reminder paused." : "Bill reminder activated."
      );

      await loadBills();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update this bill.");
    }
  }

  async function deleteBill(bill) {
    const confirmed = window.confirm(
      `Delete "${bill.title}" permanently?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await api.delete(`/api/recurring-bills/${bill.id}`);

      setPaidBillIds((previous) => {
        const updated = new Set(previous);
        updated.delete(String(bill.id));
        return updated;
      });

      setNotice("Bill deleted successfully.");
      await loadBills();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete this bill.");
    }
  }

  const activeBills = bills.filter((bill) => bill.is_active);

  const visibleBills = bills.filter((bill) => {
    if (filter === "all") return true;
    if (filter === "inactive") return !bill.is_active;
    return bill.is_active && getStatus(bill) === filter;
  });

  const upcomingCount = activeBills.filter(
    (bill) => getStatus(bill) === "upcoming"
  ).length;

  const dueSoonCount = activeBills.filter(
    (bill) => getStatus(bill) === "due_soon"
  ).length;

  const overdueCount = activeBills.filter(
    (bill) => getStatus(bill) === "overdue"
  ).length;

  return (
    <main className="recurring-page">
      <header className="recurring-header">
        <div>
          <div className="recurring-eyebrow">
            <CalendarClock size={16} />
            BILL MANAGEMENT
          </div>
          <h1>Recurring Bills</h1>
          <p>Keep track of regular payments and upcoming due dates.</p>
        </div>

        <button
          type="button"
          className="recurring-primary-button"
          onClick={() => {
            setError("");
            setNotice("");
            setShowForm((value) => !value);
          }}
        >
          <Plus size={19} />
          Add recurring bill
        </button>
      </header>

      {error && (
        <div className="recurring-message error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="recurring-message success" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}

      <section className="recurring-stats">
        <article className="recurring-stat">
          <span className="recurring-stat-icon neutral">
            <RefreshCw size={20} />
          </span>
          <div>
            <p>Active bills</p>
            <h2>{activeBills.length}</h2>
          </div>
        </article>

        <article className="recurring-stat">
          <span className="recurring-stat-icon blue">
            <Clock3 size={20} />
          </span>
          <div>
            <p>Upcoming</p>
            <h2>{upcomingCount}</h2>
          </div>
        </article>

        <article className="recurring-stat">
          <span className="recurring-stat-icon amber">
            <Bell size={20} />
          </span>
          <div>
            <p>Due soon</p>
            <h2>{dueSoonCount}</h2>
          </div>
        </article>

        <article className="recurring-stat">
          <span className="recurring-stat-icon red">
            <AlertTriangle size={20} />
          </span>
          <div>
            <p>Overdue</p>
            <h2>{overdueCount}</h2>
          </div>
        </article>
      </section>

      {showForm && (
        <section className="recurring-form-card">
          <div className="recurring-section-heading">
            <h2>Add a recurring bill</h2>
            <p>Set up a payment and when you want to be reminded.</p>
          </div>

          <form onSubmit={handleSubmit} className="recurring-form">
            <label>
              Bill name
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Internet Bill"
                maxLength={150}
                required
              />
            </label>

            <label>
              Amount (BDT)
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                placeholder="1500"
                required
              />
            </label>

            <label>
              Category
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g. Utilities"
                maxLength={100}
                required
              />
            </label>

            <label>
              Frequency
              <select
                name="frequency"
                value={form.frequency}
                onChange={handleChange}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>

            <label>
              Next due date
              <input
                name="next_due_date"
                type="date"
                value={form.next_due_date}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Remind me (days before)
              <select
                name="reminder_days"
                value={form.reminder_days}
                onChange={handleChange}
              >
                <option value="0">On the due date</option>
                <option value="1">1 day before</option>
                <option value="3">3 days before</option>
                <option value="7">7 days before</option>
                <option value="14">14 days before</option>
                <option value="30">30 days before</option>
              </select>
            </label>

            <div className="recurring-form-actions">
              <button
                type="button"
                className="recurring-secondary-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="recurring-primary-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save recurring bill"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="recurring-list-card">
        <div className="recurring-list-header">
          <div className="recurring-section-heading">
            <h2>Your bills</h2>
            <p>Manage your regular payments in one place.</p>
          </div>

          <button
            type="button"
            className="recurring-refresh-button"
            onClick={loadBills}
            disabled={loading || payingBillId !== null}
            aria-label="Refresh bills"
            title="Refresh bills"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="recurring-filters">
          {[
            ["all", "All bills"],
            ["upcoming", "Upcoming"],
            ["due_soon", "Due soon"],
            ["overdue", "Overdue"],
            ["inactive", "Paused"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="recurring-empty">
            <RefreshCw className="recurring-loading-icon" size={25} />
            <p>Loading your bills...</p>
          </div>
        ) : visibleBills.length === 0 ? (
          <div className="recurring-empty">
            <CalendarClock size={34} />
            <h3>No bills found</h3>
            <p>Add a recurring bill to start tracking your payments.</p>
          </div>
        ) : (
          <div className="recurring-bill-list">
            {visibleBills.map((bill) => {
              const status = getStatus(bill);
              const isPaying = payingBillId === String(bill.id);
              const isPaid =
                paidBillIds.has(String(bill.id)) ||
                bill.is_paid === true ||
                bill.is_paid === "true";

              return (
                <article className="recurring-bill" key={bill.id}>
                  <div className="recurring-bill-icon">
                    <CalendarClock size={22} />
                  </div>

                  <div className="recurring-bill-info">
                    <h3>{bill.title}</h3>
                    <p>
                      {bill.category} ·{" "}
                      {bill.frequency.charAt(0).toUpperCase() +
                        bill.frequency.slice(1)}
                    </p>
                    <span className="recurring-due-date">
                      Due {formatDate(bill.next_due_date)}
                    </span>
                  </div>

                  <div className="recurring-bill-amount">
                    <strong>{formatMoney(bill.amount)}</strong>
                    <span className={`recurring-status ${status}`}>
                      {status === "due_soon" && <Bell size={13} />}
                      {status === "overdue" && <AlertTriangle size={13} />}
                      {status === "upcoming" && <Clock3 size={13} />}
                      {status === "inactive" && <CheckCircle2 size={13} />}
                      {status === "due_soon"
                        ? "Due soon"
                        : status.charAt(0).toUpperCase() +
                          status.slice(1).replace("_", " ")}
                    </span>
                  </div>

                  <div className="recurring-bill-actions">
                    {bill.is_active && (
                      <button
                        type="button"
                        className={
                          isPaid
                            ? "recurring-paid-button"
                            : "recurring-primary-button"
                        }
                        onClick={() => {
                          if (!isPaid) markAsPaid(bill);
                        }}
                        disabled={isPaid || payingBillId !== null}
                        title={
                          isPaid
                            ? "This bill has already been paid"
                            : "Record this bill as paid"
                        }
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle2 size={16} />
                            Paid
                          </>
                        ) : (
                          <>
                            <CircleDollarSign size={16} />
                            {isPaying ? "Recording..." : "Mark as Paid"}
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      className="recurring-secondary-button"
                      onClick={() => toggleActive(bill)}
                      disabled={payingBillId !== null}
                    >
                      {bill.is_active ? "Pause" : "Activate"}
                    </button>

                    <button
                      type="button"
                      className="recurring-delete-button"
                      onClick={() => deleteBill(bill)}
                      disabled={payingBillId !== null}
                      aria-label={`Delete ${bill.title}`}
                      title="Delete bill"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="recurring-disclaimer">
        Marking a bill as paid records an expense in your transaction history
        and advances its next due date. A bill marked Paid cannot be paid again.
      </p>
    </main>
  );
}
