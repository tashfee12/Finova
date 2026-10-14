
const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// GET: Finance summary (all-time or a selected month)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { month } = req.query;
    const userId = req.user.userId;

    let dateFilter = "";
    const params = [userId];

    // Optional month filter, e.g. ?month=2026-10
    if (month !== undefined) {
      if (
        typeof month !== "string" ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
      ) {
        return res.status(400).json({
          success: false,
          message: "Month must use YYYY-MM format, e.g. 2026-10.",
        });
      }

      params.push(`${month}-01`);

      dateFilter = `
        AND transaction_date >= $2::date
        AND transaction_date < ($2::date + INTERVAL '1 month')
      `;
    }

    // Calculate total income and expenses
    const totalsResult = await pool.query(
      `SELECT
         COALESCE(
           SUM(amount) FILTER (WHERE type = 'income'), 0
         ) AS total_income,
         COALESCE(
           SUM(amount) FILTER (WHERE type = 'expense'), 0
         ) AS total_expenses
       FROM transactions
       WHERE user_id = $1
       ${dateFilter}`,
      params
    );

    const totalIncome = Number(totalsResult.rows[0].total_income);
    const totalExpenses = Number(totalsResult.rows[0].total_expenses);

    // Calculate expenses for each category
    const categoryResult = await pool.query(
      `SELECT
         category,
         SUM(amount) AS total
       FROM transactions
       WHERE user_id = $1
         AND type = 'expense'
         ${dateFilter}
       GROUP BY category
       ORDER BY SUM(amount) DESC`,
      params
    );

    const categoryExpenses = categoryResult.rows.map((row) => ({
      category: row.category,
      total: Number(row.total),
    }));

    return res.status(200).json({
      success: true,
      period: month || "all-time",
      summary: {
        totalIncome,
        totalExpenses,
        balance: Number((totalIncome - totalExpenses).toFixed(2)),
      },
      categoryExpenses,
    });
  } catch (error) {
    console.error("Finance summary error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to generate finance summary.",
    });
  }
});

module.exports = router;
