
const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// POST: Add a new income or expense
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      description,
      transaction_date,
    } = req.body;

    // Validate required fields
    if (!type || amount === undefined || !category || !transaction_date) {
      return res.status(400).json({
        success: false,
        message: "Type, amount, category, and transaction date are required.",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be income or expense.",
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number.",
      });
    }

    if (
      typeof transaction_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(transaction_date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Transaction date must use YYYY-MM-DD format.",
      });
    }

    const result = await pool.query(
      `INSERT INTO transactions
        (user_id, type, amount, category, description, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, type, amount, category,
                 description, transaction_date, created_at`,
      [
        req.user.userId,
        type,
        numericAmount,
        category.trim(),
        description || null,
        transaction_date,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully.",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Create transaction error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create transaction.",
    });
  }
});

// GET: Retrieve only the logged-in user's transactions

 // GET: Retrieve the logged-in user's transactions,
 // optionally filtered by month (?month=YYYY-MM)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { month } = req.query;
    const userId = req.user.userId;

    let query = `
      SELECT id, user_id, type, amount, category,
             description, transaction_date, created_at
      FROM transactions
      WHERE user_id = $1
    `;

    const params = [userId];

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

      query += `
        AND transaction_date >= $2::date
        AND transaction_date < ($2::date + INTERVAL '1 month')
      `;
    }

    query += `
      ORDER BY transaction_date DESC, created_at DESC
    `;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      transactions: result.rows,
    });
  } catch (error) {
    console.error("Get transactions error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve transactions.",
    });
  }
});

 // PUT: Update a transaction owned by the logged-in user
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, category, description, transaction_date } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID.",
      });
    }

    if (
      !type ||
      !["income", "expense"].includes(type) ||
      amount === undefined ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof transaction_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(transaction_date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid type, positive amount, category, and date (YYYY-MM-DD).",
      });
    }

    const result = await pool.query(
      `UPDATE transactions
       SET type = $1,
           amount = $2,
           category = $3,
           description = $4,
           transaction_date = $5
       WHERE id = $6 AND user_id = $7
       RETURNING id, user_id, type, amount, category,
                 description, transaction_date, created_at`,
      [
        type,
        Number(amount),
        category.trim(),
        description || null,
        transaction_date,
        id,
        req.user.userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.json({
      success: true,
      message: "Transaction updated successfully.",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Update transaction error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update transaction.",
    });
  }
});

 // DELETE: Delete a transaction owned by the logged-in user
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM transactions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.json({
      success: true,
      message: "Transaction deleted successfully.",
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error("Delete transaction error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to delete transaction.",
    });
  }
});


module.exports = router;
