
const pool = require("./db");

async function testDatabase() {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database_name,
        NOW() AS current_time,
        (SELECT COUNT(*)
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_type = 'BASE TABLE') AS table_count
    `);

    console.log("Database connected successfully!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
