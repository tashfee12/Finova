
const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE a budget
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { category, monthly_limit, month } = req.body;

    if (
      !category ||
      typeof category !== "string" ||
      !category.trim() ||
      monthly_limit === undefined ||
      !Number.isFinite(Number(monthly_limit)) ||
      Number(monthly_limit) <= 0 ||
      !month
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid category, positive monthly_limit, and month are required.",
      });
    }

    // Month must be in YYYY-MM format.
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Month must use YYYY-MM format, e.g. 2026-10.",
      });
    }

    const result = await pool.query(
      `INSERT INTO budgets (user_id, category, monthly_limit, month)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        req.user.userId,
        category.trim(),
        Number(monthly_limit),
        `${month}-01`,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Budget created successfully.",
      budget: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A budget for this category and month already exists.",
      });
    }

    console.error("Create budget error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create budget.",
    });
  }
});

// READ all budgets belonging to the logged-in user

/* READ all budgets and calculate monthly spending */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         b.*,
         COALESCE(
           (
             SELECT SUM(t.amount)
             FROM transactions t
             WHERE t.user_id = b.user_id
               AND LOWER(TRIM(t.category)) = LOWER(TRIM(b.category))
               AND LOWER(t.type) = 'expense'
               AND t.transaction_date >= b.month
               AND t.transaction_date < b.month + INTERVAL '1 month'
           ),
           0
         ) AS spent
       FROM budgets b
       WHERE b.user_id = $1
       ORDER BY b.month DESC, b.category ASC`,
      [req.user.userId]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      budgets: result.rows,
    });
  } catch (error) {
    console.error("Get budgets error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve budgets.",
    });
  }
});


// UPDATE a budget
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, monthly_limit, month } = req.body;

    if (!/^\d+$/.test(id) || BigInt(id) <= 0n) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID.",
      });
    }

    if (
      !category ||
      typeof category !== "string" ||
      !category.trim() ||
      monthly_limit === undefined ||
      !Number.isFinite(Number(monthly_limit)) ||
      Number(monthly_limit) <= 0 ||
      !month ||
      typeof month !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid category, positive monthly_limit, and month (YYYY-MM) are required.",
      });
    }

    const result = await pool.query(
      `UPDATE budgets
       SET category = $1,
           monthly_limit = $2,
           month = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [
        category.trim(),
        Number(monthly_limit),
        `${month}-01`,
        id,
        req.user.userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
    }

    return res.json({
      success: true,
      message: "Budget updated successfully.",
      budget: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A budget for this category and month already exists.",
      });
    }

    console.error("Update budget error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update budget.",
    });
  }
});

// DELETE a budget
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || BigInt(id) <= 0n) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM budgets
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Budget not found.",
      });
    }

    return res.json({
      success: true,
      message: "Budget deleted successfully.",
    });
  } catch (error) {
    console.error("Delete budget error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete budget.",
    });
  }
});

module.exports = router;
