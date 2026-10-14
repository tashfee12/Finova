
const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

// All recurring bill routes require login.
router.use(authMiddleware);

// GET: View the logged-in user's recurring bills.
// is_paid remains true if the bill has ever been paid.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         rb.*,
         EXISTS (
           SELECT 1
           FROM recurring_bill_payments rbp
           WHERE rbp.bill_id = rb.id
         ) AS is_paid,
         CASE
           WHEN rb.next_due_date < CURRENT_DATE THEN 'overdue'
           WHEN rb.next_due_date <= CURRENT_DATE + rb.reminder_days
             THEN 'due_soon'
           ELSE 'upcoming'
         END AS status
       FROM recurring_bills rb
       WHERE rb.user_id = $1
       ORDER BY rb.next_due_date ASC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      bills: result.rows,
    });
  } catch (error) {
    console.error("Get recurring bills error:", error);

    res.status(500).json({
      message: "Failed to load recurring bills.",
    });
  }
});

// POST: Create a recurring bill.
router.post("/", async (req, res) => {
  try {
    const {
      title,
      amount,
      category,
      frequency,
      next_due_date,
      reminder_days = 3,
    } = req.body;

    if (
      !title?.trim() ||
      !category?.trim() ||
      !["weekly", "monthly", "yearly"].includes(frequency) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(next_due_date || "") ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      !Number.isInteger(Number(reminder_days)) ||
      Number(reminder_days) < 0 ||
      Number(reminder_days) > 30
    ) {
      return res.status(400).json({
        message: "Please provide valid bill details.",
      });
    }

    const result = await pool.query(
      `INSERT INTO recurring_bills
         (user_id, title, amount, category, frequency,
          next_due_date, reminder_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.userId,
        title.trim(),
        Number(amount),
        category.trim(),
        frequency,
        next_due_date,
        Number(reminder_days),
      ]
    );

    res.status(201).json({
      success: true,
      bill: {
        ...result.rows[0],
        is_paid: false,
      },
    });
  } catch (error) {
    console.error("Create recurring bill error:", error);

    res.status(500).json({
      message: "Failed to create recurring bill.",
    });
  }
});

// POST: Mark a recurring bill as paid.
// A bill can only be paid once, even after navigating away or refreshing.
router.post("/:id/pay", async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    const billId = req.params.id;
    const userId = req.user.userId;

    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Lock this user's bill to prevent simultaneous duplicate payments.
    const billResult = await client.query(
      `SELECT *
       FROM recurring_bills
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [billId, userId]
    );

    if (billResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Recurring bill not found.",
      });
    }

    const bill = billResult.rows[0];

    // Check the permanent payment history.
    const previousPayment = await client.query(
      `SELECT 1
       FROM recurring_bill_payments
       WHERE bill_id = $1
       LIMIT 1`,
      [bill.id]
    );

    if (previousPayment.rows.length > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        alreadyPaid: true,
        message: "This bill has already been paid and cannot be paid again.",
      });
    }

    if (!bill.is_active) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Activate this bill before recording payment.",
      });
    }

    // Record the expense.
    const paymentResult = await client.query(
      `INSERT INTO transactions
         (user_id, type, amount, category, description, transaction_date)
       VALUES ($1, 'expense', $2, $3, $4, CURRENT_DATE)
       RETURNING *`,
      [
        userId,
        bill.amount,
        bill.category,
        `Recurring bill payment: ${bill.title}`,
      ]
    );

    // Save permanent payment history for this bill.
    await client.query(
      `INSERT INTO recurring_bill_payments
         (bill_id, transaction_id, due_date)
       VALUES ($1, $2, $3)`,
      [
        bill.id,
        paymentResult.rows[0].id,
        bill.next_due_date,
      ]
    );

    // Keep the existing due-date update.
    const updatedBillResult = await client.query(
      `UPDATE recurring_bills
       SET next_due_date = CASE
         WHEN frequency = 'weekly'
           THEN next_due_date + 7
         WHEN frequency = 'monthly'
           THEN (next_due_date + INTERVAL '1 month')::date
         WHEN frequency = 'yearly'
           THEN (next_due_date + INTERVAL '1 year')::date
         ELSE next_due_date
       END
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [bill.id, userId]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.json({
      success: true,
      message: "Payment recorded successfully.",
      transaction: paymentResult.rows[0],
      bill: {
        ...updatedBillResult.rows[0],
        is_paid: true,
      },
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Payment rollback error:", rollbackError);
      }
    }

    console.error("Recurring bill payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not record the bill payment.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// PATCH: Update a bill or activate/deactivate it.
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      amount,
      category,
      frequency,
      next_due_date,
      reminder_days,
      is_active,
    } = req.body;

    if (
      frequency !== undefined &&
      !["weekly", "monthly", "yearly"].includes(frequency)
    ) {
      return res.status(400).json({
        message: "Invalid bill frequency.",
      });
    }

    if (
      amount !== undefined &&
      (!Number.isFinite(Number(amount)) || Number(amount) <= 0)
    ) {
      return res.status(400).json({
        message: "Amount must be greater than zero.",
      });
    }

    if (
      reminder_days !== undefined &&
      (!Number.isInteger(Number(reminder_days)) ||
        Number(reminder_days) < 0 ||
        Number(reminder_days) > 30)
    ) {
      return res.status(400).json({
        message: "Reminder days must be between 0 and 30.",
      });
    }

    if (
      next_due_date !== undefined &&
      !/^\d{4}-\d{2}-\d{2}$/.test(next_due_date)
    ) {
      return res.status(400).json({
        message: "Invalid next due date.",
      });
    }

    const result = await pool.query(
      `UPDATE recurring_bills
       SET title = COALESCE($1, title),
           amount = COALESCE($2, amount),
           category = COALESCE($3, category),
           frequency = COALESCE($4, frequency),
           next_due_date = COALESCE($5, next_due_date),
           reminder_days = COALESCE($6, reminder_days),
           is_active = COALESCE($7, is_active)
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [
        title?.trim() || null,
        amount === undefined ? null : Number(amount),
        category?.trim() || null,
        frequency ?? null,
        next_due_date ?? null,
        reminder_days === undefined ? null : Number(reminder_days),
        is_active ?? null,
        id,
        req.user.userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Bill not found.",
      });
    }

    res.json({
      success: true,
      bill: result.rows[0],
    });
  } catch (error) {
    console.error("Update recurring bill error:", error);

    res.status(500).json({
      message: "Failed to update recurring bill.",
    });
  }
});

// DELETE: Delete a bill belonging to the logged-in user.
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM recurring_bills
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Bill not found.",
      });
    }

    res.json({
      success: true,
      message: "Bill deleted successfully.",
    });
  } catch (error) {
    console.error("Delete recurring bill error:", error);

    res.status(500).json({
      message: "Failed to delete recurring bill.",
    });
  }
});

module.exports = router;
