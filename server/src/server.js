
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const authRoutes = require("./routes/auth");
const transactionRoutes = require("./routes/transactions");
const budgetRoutes = require("./routes/budgets");
const summaryRoutes = require("./routes/summary");
const aiRoutes = require("./routes/ai");
const recurringBillsRoutes = require("./routes/recurringBills");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Personal Finance AI Assistant API",
  });
});

// Health-check route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    message: "Backend is running successfully",
  });
});

// Database test route
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database_name,
        COUNT(*) AS table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    res.status(200).json({
      success: true,
      message: "PostgreSQL connected successfully!",
      database: result.rows[0].database_name,
      tableCount: Number(result.rows[0].table_count),
    });
  } catch (error) {
    console.error("Database query failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection or query failed",
    });
  }
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Transaction routes
app.use("/api/transactions", transactionRoutes);

// Budget routes
app.use("/api/budgets", budgetRoutes);

// Summary routes
app.use("/api/summary", summaryRoutes);

app.use("/api/ai", aiRoutes);

// Recurring Bills routes
app.use("/api/recurring-bills", recurringBillsRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
