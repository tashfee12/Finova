
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  LogOut,
  ReceiptText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./Dashboard.css";

const COLORS = ["#16a34a", "#f59e0b", "#6366f1", "#ef4444", "#0ea5e9"];

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

function firstValue(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return Number(source[key]) || 0;
    }
  }
  return 0;
}

export default function Dashboard() {
  const { logout } = useAuth();

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [summaryResponse, transactionResponse] = await Promise.all([
        api.get("/api/summary", {
          params: { month: selectedMonth },
        }),
        api.get("/api/transactions", {
          params: { month: selectedMonth },
        }),
      ]);

      const summaryData =
        summaryResponse.data?.summary ??
        summaryResponse.data?.data ??
        summaryResponse.data;

      const categoryExpenses =
        summaryResponse.data?.categoryExpenses ??
        summaryResponse.data?.category_expenses ??
        summaryData?.categoryExpenses ??
        summaryData?.category_expenses ??
        summaryData?.categories ??
        [];

      setSummary({
        ...summaryData,
        categoryExpenses: Array.isArray(categoryExpenses)
          ? categoryExpenses
          : [],
      });

      const transactionData =
        transactionResponse.data?.transactions ??
        transactionResponse.data?.data ??
        transactionResponse.data;

      setTransactions(
        Array.isArray(transactionData) ? transactionData : []
      );
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError(
        err.response?.data?.message ||
          "Could not load your financial data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [selectedMonth]);

  const totalIncome = firstValue(summary, [
    "totalIncome",
    "total_income",
    "income",
    "monthIncome",
    "month_income",
  ]);

  const totalExpenses = firstValue(summary, [
    "totalExpenses",
    "total_expenses",
    "expenses",
    "monthExpenses",
    "month_expenses",
  ]);

  const balance =
    summary?.balance !== undefined && summary?.balance !== null
      ? Number(summary.balance) || 0
      : totalIncome - totalExpenses;

  const categories = summary?.categoryExpenses ?? [];

  const chartData = Array.isArray(categories)
    ? categories
        .map((item) => ({
          name: item.category || item.name || "Other",
          value: Number(
            item.total ?? item.amount ?? item.expenses ?? 0
          ),
        }))
        .filter(
          (item) =>
            Number.isFinite(item.value) && item.value > 0
        )
    : [];

  const comparisonData = [
    {
      name: selectedMonth,
      Income: totalIncome,
      Expenses: totalExpenses,
    },
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>Financial overview</h1>
          <p className="muted">
            Understand your money at a glance.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button className="logout-button" onClick={logout}>
            <LogOut size={17} />
            Log out
          </button>

          <input
            className="dashboard-date-button"
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(event.target.value)
            }
            aria-label="Select report month"
          />
        </div>
      </header>

      <div className="dashboard-toolbar">
        <span>Monthly overview</span>
      </div>

      {error && (
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={loadDashboard}>Try again</button>
        </div>
      )}

      {loading ? (
        <div className="loading-panel">
          Loading your financial data...
        </div>
      ) : (
        <>
          <section className="stat-grid">
            <article className="stat-card">
              <div className="stat-top">
                <span>Total income</span>
                <span className="stat-icon income-icon">
                  <TrendingUp size={20} />
                </span>
              </div>

              <h2>{money(totalIncome)}</h2>
              <p>Income in the selected month</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span>Total expenses</span>
                <span className="stat-icon expense-icon">
                  <TrendingDown size={20} />
                </span>
              </div>

              <h2>{money(totalExpenses)}</h2>
              <p>Expenses in the selected month</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span>Net balance</span>
                <span className="stat-icon balance-icon">
                  <Wallet size={20} />
                </span>
              </div>

              <h2>{money(balance)}</h2>
              <p>Income minus expenses</p>
            </article>
          </section>

          <section className="panel monthly-comparison-panel">
            <div className="panel-heading">
              <div>
                <h2>Income vs. Expenses</h2>
                <p className="muted">
                  Monthly financial comparison — {selectedMonth}
                </p>
              </div>
            </div>

            <div className="comparison-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 20,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => money(value)} />
                  <Legend />

                  <Bar
                    dataKey="Income"
                    fill="#16a34a"
                    radius={[6, 6, 0, 0]}
                  />

                  <Bar
                    dataKey="Expenses"
                    fill="#ef4444"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="dashboard-content-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Expense breakdown</h2>
                  <p className="muted">Spending by category</p>
                </div>
              </div>

              {chartData.length > 0 ? (
                <>
                  <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={3}
                        >
                          {chartData.map((item, index) => (
                            <Cell
                              key={`${item.name}-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>

                        <Tooltip formatter={(value) => money(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="category-list">
                    {chartData.map((item, index) => (
                      <div
                        className="category-row"
                        key={`${item.name}-${index}`}
                      >
                        <span className="category-name">
                          <span
                            className="category-dot"
                            style={{
                              background:
                                COLORS[index % COLORS.length],
                            }}
                          />
                          {item.name}
                        </span>

                        <strong>{money(item.value)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  No category expense data available yet.
                </div>
              )}
            </article>

            <article className="panel transactions-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent transactions</h2>
                  <p className="muted">
                    Transactions for the selected month
                  </p>
                </div>

                <ReceiptText size={22} />
              </div>

              {transactions.length > 0 ? (
                <div className="transaction-list">
                  {transactions.slice(0, 8).map(
                    (transaction, index) => {
                      const isIncome =
                        String(transaction.type).toLowerCase() ===
                        "income";

                      return (
                        <div
                          className="transaction-row"
                          key={
                            transaction.id ??
                            `${transaction.description}-${index}`
                          }
                        >
                          <div className="transaction-symbol">
                            {isIncome ? (
                              <TrendingUp size={18} />
                            ) : (
                              <TrendingDown size={18} />
                            )}
                          </div>

                          <div className="transaction-info">
                            <strong>
                              {transaction.description ||
                                transaction.category ||
                                "Transaction"}
                            </strong>

                            <span>
                              {transaction.category ||
                                transaction.type ||
                                "Other"}

                              {transaction.transaction_date
                                ? ` · ${String(
                                    transaction.transaction_date
                                  ).slice(0, 10)}`
                                : transaction.date
                                  ? ` · ${String(
                                      transaction.date
                                    ).slice(0, 10)}`
                                  : ""}
                            </span>
                          </div>

                          <strong
                            className={
                              isIncome
                                ? "amount-income"
                                : "amount-expense"
                            }
                          >
                            {isIncome ? "+" : "−"}
                            {money(transaction.amount)}
                          </strong>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <ReceiptText size={28} />

                  <p>No transactions found for this month.</p>

                  <span>
                    Choose another month to view its recorded activity.
                  </span>
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
