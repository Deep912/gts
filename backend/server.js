require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { authenticateJWT } = require("./middleware/authMiddleware");

const app = express();

app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: "*", // Allow all devices (for testing)
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ====================================
// 🔹 USER AUTHENTICATION (Login)
// ====================================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const userResult = await pool.query(
      "SELECT id, username, password, role FROM users WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Token expires in 1 hour
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// ✅ Worker Stats API
app.get("/worker-stats", authenticateJWT, async (req, res) => {
  try {
    const stats = await pool.query(
      `SELECT 
        COUNT(CASE WHEN action = 'dispatch' THEN 1 END) AS dispatched,
        COUNT(CASE WHEN action = 'receive_empty' OR action = 'receive_filled' THEN 1 END) AS received,
        COUNT(CASE WHEN action = 'refill' THEN 1 END) AS refilled
       FROM transactions WHERE user_id = $1`,
      [req.user.id]
    );

    res.json(stats.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// ✅ Recent Transactions API
app.get("/worker-transactions", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT serial_number, action, timestamp FROM transactions WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Database error", details: error.message });
  }
});
app.get("/worker/transactions", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const transactionsQuery = `
      SELECT t.action, t.cylinder_id, c.name AS company_name, t.timestamp
      FROM transactions t
      LEFT JOIN companies c ON t.company_id = c.id
      WHERE t.user_id = $1
      ORDER BY t.timestamp DESC
      LIMIT 5
    `;
    const result = await pool.query(transactionsQuery, [userId]);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.post("/dispatch-cylinder", authenticateJWT, async (req, res) => {
  const { serialNumbers, companyId, selectedProduct, quantity } = req.body;

  console.log("Received Dispatch Data:", req.body); // Debugging

  if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
    return res
      .status(400)
      .json({ error: "Invalid request. Provide an array of serial numbers." });
  }

  if (!companyId || !selectedProduct || !quantity) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    // Check if the company exists
    const checkCompany = await pool.query(
      "SELECT id FROM companies WHERE id = $1",
      [companyId]
    );
    if (checkCompany.rows.length === 0) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // Debugging: Check if serial numbers exist in the database
    const checkCylinders = await pool.query(
      "SELECT serial_number FROM cylinders WHERE serial_number = ANY($1::text[])",
      [serialNumbers]
    );

    if (checkCylinders.rows.length !== serialNumbers.length) {
      return res.status(400).json({
        error: "Some cylinders are not found in the database",
        found: checkCylinders.rows.map((row) => row.serial_number),
        missing: serialNumbers.filter(
          (sn) => !checkCylinders.rows.some((row) => row.serial_number === sn)
        ),
      });
    }

    // Dispatch the cylinders
    await pool.query(
      `UPDATE cylinders 
       SET status = 'dispatched', company_id = $1 
       WHERE serial_number = ANY($2::text[])`,
      [companyId, serialNumbers]
    );

    // Log Transaction
    await pool.query(
      `INSERT INTO transactions (user_id, cylinder_id, action, company_id) 
       SELECT $1, id, 'dispatch', $2 FROM cylinders WHERE serial_number = ANY($3::text[])`,
      [req.user.id, companyId, serialNumbers]
    );

    res.json({ message: "Cylinders dispatched successfully!" });
  } catch (error) {
    console.error("Dispatch Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.get("/products", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT gas_type || ' ' || size AS product FROM cylinders WHERE status = 'available'"
    );
    res.json(result.rows.map((row) => row.product));
  } catch (error) {
    console.error("Product Fetch Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});
app.get("/companies", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM companies ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error("Company Fetch Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// ====================================
// 🔹 SYSTEM UTILITIES
// ====================================
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connection successful!",
      server_time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database Connection Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.get("/available-cylinders", authenticateJWT, async (req, res) => {
  const { product } = req.query;

  if (!product) {
    return res.status(400).json({ error: "Product type is required" });
  }

  try {
    const result = await pool.query(
      "SELECT serial_number, gas_type, size FROM cylinders WHERE status = 'available' AND gas_type || ' ' || size = $1",
      [product]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Available Cylinders Fetch Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.get("/dispatched-cylinders", authenticateJWT, async (req, res) => {
  const { companyId } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: "Company ID is required" });
  }

  try {
    const result = await pool.query(
      "SELECT serial_number, gas_type, size FROM cylinders WHERE company_id = $1 AND status = 'dispatched'",
      [companyId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching dispatched cylinders:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Receive Cylinders API
app.post("/receive-cylinder", authenticateJWT, async (req, res) => {
  const { emptySerialNumbers, filledSerialNumbers, companyId } = req.body;

  if (
    !Array.isArray(emptySerialNumbers) ||
    !Array.isArray(filledSerialNumbers) ||
    (emptySerialNumbers.length === 0 && filledSerialNumbers.length === 0)
  ) {
    return res.status(400).json({ error: "Provide at least one cylinder ID." });
  }

  try {
    // 🔹 Update Empty Cylinders
    if (emptySerialNumbers.length > 0) {
      await pool.query(
        `UPDATE cylinders SET status = 'empty', company_id = NULL WHERE serial_number = ANY($1::text[])`,
        [emptySerialNumbers]
      );

      await pool.query(
        `INSERT INTO transactions (user_id, cylinder_id, action, company_id) 
         SELECT $1, id, 'receive_empty', $2 
         FROM cylinders WHERE serial_number = ANY($3::text[])`,
        [req.user.id, companyId, emptySerialNumbers]
      );
    }

    // 🔹 Update Filled Cylinders (Change 'filled' to 'available')
    if (filledSerialNumbers.length > 0) {
      await pool.query(
        `UPDATE cylinders SET status = 'available', company_id = NULL WHERE serial_number = ANY($1::text[])`,
        [filledSerialNumbers]
      );

      await pool.query(
        `INSERT INTO transactions (user_id, cylinder_id, action, company_id) 
         SELECT $1, id, 'receive_filled', $2 
         FROM cylinders WHERE serial_number = ANY($3::text[])`,
        [req.user.id, companyId, filledSerialNumbers]
      );
    }

    res.json({ message: "Cylinders received successfully!" });
  } catch (error) {
    console.error("Receive Cylinder Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.post("/refill-cylinder", authenticateJWT, async (req, res) => {
  const { cylinderIds } = req.body;

  if (!Array.isArray(cylinderIds) || cylinderIds.length === 0) {
    return res.status(400).json({ error: "Provide an array of cylinder IDs." });
  }

  try {
    // 🔹 Ensure all cylinders are EMPTY before refilling
    const checkStatus = await pool.query(
      "SELECT serial_number FROM cylinders WHERE serial_number = ANY($1::text[]) AND status != 'empty'",
      [cylinderIds]
    );

    if (checkStatus.rows.length > 0) {
      return res.status(400).json({
        error: `Cylinders ${checkStatus.rows
          .map((c) => c.serial_number)
          .join(", ")} are not empty and cannot be refilled.`,
      });
    }

    // 🔹 Update status to 'refilling'
    await pool.query(
      "UPDATE cylinders SET status = 'refilling' WHERE serial_number = ANY($1::text[])",
      [cylinderIds]
    );

    // 🔹 Log the transaction
    await pool.query(
      `INSERT INTO transactions (user_id, cylinder_id, action) 
       SELECT $1, id, 'refill' FROM cylinders WHERE serial_number = ANY($2::text[])`,
      [req.user.id, cylinderIds]
    );

    res.json({ message: "Cylinders sent for refilling!" });
  } catch (error) {
    console.error("Refill Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});
app.get("/refilling-cylinders", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT serial_number, gas_type, size FROM cylinders WHERE status = 'refilling'"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching refilling cylinders:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.post("/complete-refill", authenticateJWT, async (req, res) => {
  const { cylinderIds } = req.body;

  if (!Array.isArray(cylinderIds) || cylinderIds.length === 0) {
    return res.status(400).json({ error: "Provide an array of cylinder IDs." });
  }

  try {
    // Ensure all cylinders are in refilling status before updating
    const checkStatus = await pool.query(
      "SELECT serial_number FROM cylinders WHERE serial_number = ANY($1::text[]) AND status != 'refilling'",
      [cylinderIds]
    );

    if (checkStatus.rows.length > 0) {
      return res.status(400).json({
        error: `Cylinders ${checkStatus.rows
          .map((c) => c.serial_number)
          .join(", ")} are not in refilling status.`,
      });
    }

    // Update status to 'available'
    await pool.query(
      "UPDATE cylinders SET status = 'available' WHERE serial_number = ANY($1::text[])",
      [cylinderIds]
    );

    res.json({ message: "Cylinders marked as filled successfully!" });
  } catch (error) {
    console.error("Complete Refill Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.post("/complete-refill", authenticateJWT, async (req, res) => {
  const { cylinderIds } = req.body;

  if (!Array.isArray(cylinderIds) || cylinderIds.length === 0) {
    return res.status(400).json({ error: "Provide an array of cylinder IDs." });
  }

  try {
    // 🔹 Ensure all cylinders are currently in refilling status
    const checkStatus = await pool.query(
      "SELECT serial_number FROM cylinders WHERE serial_number = ANY($1::text[]) AND status != 'refilling'",
      [cylinderIds]
    );

    if (checkStatus.rows.length > 0) {
      return res.status(400).json({
        error: `Cylinders ${checkStatus.rows
          .map((c) => c.serial_number)
          .join(", ")} are not in refilling status.`,
      });
    }

    // 🔹 Update status to 'available' after refill
    await pool.query(
      "UPDATE cylinders SET status = 'available' WHERE serial_number = ANY($1::text[])",
      [cylinderIds]
    );

    res.json({ message: "Cylinders marked as filled successfully!" });
  } catch (error) {
    console.error("Complete Refill Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.get("/empty-cylinders", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT serial_number, gas_type, size FROM cylinders WHERE status = 'empty'"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Empty Cylinders Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.get("/empty-cylinders-grouped", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT gas_type, size, json_agg(json_build_object(
        'serial_number', serial_number
      )) AS cylinders
      FROM cylinders 
      WHERE status = 'empty'
      GROUP BY gas_type, size
      ORDER BY gas_type, size`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Empty Cylinders Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

//admin
//part

app.get("/admin/transactions", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const query = `
      SELECT t.action, c.name AS company_name, cyl.serial_number
      FROM transactions t
      LEFT JOIN companies c ON t.company_id = c.id
      LEFT JOIN cylinders cyl ON t.cylinder_id = cyl.id
      ORDER BY t.id DESC
      LIMIT 10;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Admin Transactions Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.get("/admin/stats", authenticateJWT, async (req, res) => {
  try {
    console.log("🔹 Fetching admin stats...");

    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM cylinders) AS total_cylinders,
        (SELECT COUNT(*) FROM cylinders WHERE status = 'available') AS inventory_cylinders,
        (SELECT COUNT(*) FROM cylinders WHERE status = 'dispatched') AS total_dispatched,
        (SELECT COUNT(*) FROM cylinders WHERE status = 'refilled') AS total_refilled,
        (SELECT COUNT(*) FROM cylinders WHERE status = 'refilling') AS refilling_cylinders
    `);

    console.log("✅ Stats fetched:", stats.rows[0]);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.get("/admin/trends", authenticateJWT, async (req, res) => {
  try {
    const trends = await pool.query(`
      SELECT 
        DATE(timestamp) AS date,
        COUNT(CASE WHEN action = 'refill' THEN 1 END) AS refilled,
        COUNT(CASE WHEN action = 'dispatch' THEN 1 END) AS dispatched
      FROM transactions
      WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY date
      ORDER BY date ASC
    `);

    res.json(trends.rows);
  } catch (error) {
    console.error("❌ Error fetching trends:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.get("/admin/top-companies", authenticateJWT, async (req, res) => {
  try {
    const companies = await pool.query(`
      SELECT c.name AS company_name, COUNT(t.id) AS total_transactions
      FROM transactions t
      JOIN companies c ON t.company_id = c.id
      GROUP BY c.name
      ORDER BY total_transactions DESC
      LIMIT 5;
    `);

    res.json(companies.rows);
  } catch (error) {
    console.error("❌ Error fetching top companies:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.get("/admin/cylinders", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cylinders ORDER BY id DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/admin/deleted-cylinders", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const query = `
      SELECT d.serial_number, d.gas_type, d.size, d.deleted_by, u.username AS deleted_by_user, d.deleted_at
      FROM deleted_cylinders d
      JOIN users u ON d.deleted_by = u.id
      ORDER BY d.deleted_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching deleted cylinders:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.post("/admin/delete-cylinder", authenticateJWT, async (req, res) => {
  const { serial_number } = req.body;

  if (!serial_number) {
    return res
      .status(400)
      .json({ error: "Cylinder serial number is required." });
  }

  try {
    // 🔹 1️⃣ Check if cylinder exists
    const cylinderCheck = await pool.query(
      "SELECT * FROM cylinders WHERE serial_number = $1",
      [serial_number]
    );

    if (cylinderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Cylinder not found." });
    }

    const cylinder = cylinderCheck.rows[0];

    // 🔹 2️⃣ Move cylinder to deleted_cylinders table (INCLUDING `status`)
    await pool.query(
      `INSERT INTO deleted_cylinders (serial_number, gas_type, size, status, deleted_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        cylinder.serial_number,
        cylinder.gas_type,
        cylinder.size,
        cylinder.status,
        req.user.id,
      ]
    );

    // 🔹 3️⃣ Delete from cylinders table
    await pool.query("DELETE FROM cylinders WHERE serial_number = $1", [
      serial_number,
    ]);

    res.json({ message: "Cylinder deleted successfully and logged." });
  } catch (error) {
    console.error("Delete Cylinder Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.post("/admin/update-cylinder-status", authenticateJWT, async (req, res) => {
  const { serial_number, status } = req.body;
  await pool.query(
    "UPDATE cylinders SET status = $1 WHERE serial_number = $2",
    [status, serial_number]
  );
  res.json({ message: "Status updated successfully!" });
});

const allowedSizes = [10, 20, 30, 50, 100];

app.post("/admin/add-cylinder", authenticateJWT, async (req, res) => {
  const { serial_number, gas_type, size, status } = req.body;

  if (!allowedSizes.includes(size)) {
    return res.status(400).json({ error: "Invalid cylinder size" });
  }

  try {
    await pool.query(
      "INSERT INTO cylinders (serial_number, gas_type, size, status) VALUES ($1, $2, $3, $4)",
      [serial_number, gas_type, size, status]
    );
    res.json({ message: "Cylinder added successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});
app.get("/admin/generate-cylinder-id", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // 🔹 Get the highest cylinder ID from BOTH `cylinders` and `deleted_cylinders`
    const query = `
      SELECT serial_number FROM (
        SELECT serial_number FROM cylinders 
        WHERE serial_number ~ '^CYL[0-9]+$'
        UNION ALL
        SELECT serial_number FROM deleted_cylinders
        WHERE serial_number ~ '^CYL[0-9]+$'
      ) AS combined
      ORDER BY CAST(SUBSTRING(serial_number FROM 4) AS INTEGER) DESC 
      LIMIT 1;
    `;

    const result = await pool.query(query);

    let newId = "CYL1001"; // Default starting ID if no cylinders exist

    if (result.rows.length > 0) {
      const lastId = result.rows[0].serial_number;
      const lastNumber = parseInt(lastId.replace("CYL", ""), 10);
      newId = `CYL${lastNumber + 1}`;
    }

    res.json({ new_id: newId });
  } catch (error) {
    console.error("Error generating cylinder ID:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.post("/admin/restore-cylinder", authenticateJWT, async (req, res) => {
  const { serial_number } = req.body;

  if (!serial_number) {
    return res
      .status(400)
      .json({ error: "Cylinder serial number is required." });
  }

  try {
    // 🔹 1️⃣ Check if the cylinder exists in `deleted_cylinders`
    const cylinderCheck = await pool.query(
      "SELECT * FROM deleted_cylinders WHERE serial_number = $1",
      [serial_number]
    );

    if (cylinderCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Cylinder not found in deleted records." });
    }

    const cylinder = cylinderCheck.rows[0];

    // 🔹 2️⃣ Move the cylinder back to `cylinders`
    await pool.query(
      `INSERT INTO cylinders (serial_number, gas_type, size, status)
       VALUES ($1, $2, $3, $4)`,
      [
        cylinder.serial_number,
        cylinder.gas_type,
        cylinder.size,
        cylinder.status,
      ]
    );

    // 🔹 3️⃣ Remove the cylinder from `deleted_cylinders`
    await pool.query("DELETE FROM deleted_cylinders WHERE serial_number = $1", [
      serial_number,
    ]);

    res.json({ message: "Cylinder restored successfully." });
  } catch (error) {
    console.error("Restore Cylinder Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

app.post("/admin/update-cylinder-status", authenticateJWT, async (req, res) => {
  const { serial_number, status } = req.body;

  if (!serial_number || !status) {
    return res
      .status(400)
      .json({ error: "Cylinder serial number and status are required." });
  }

  try {
    const result = await pool.query(
      "UPDATE cylinders SET status = $1 WHERE serial_number = $2 RETURNING *",
      [status, serial_number]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Cylinder not found." });
    }

    res.json({ message: "Cylinder status updated successfully." });
  } catch (error) {
    console.error("Update Cylinder Status Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Fetch Active Companies (Non-deleted)
app.get("/admin/companies", authenticateJWT, async (req, res) => {
  try {
    console.log("Fetching active companies...");
    const result = await pool.query(
      "SELECT * FROM companies WHERE deleted_at IS NULL"
    );
    console.log("✅ Companies fetched:", result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Admin Companies Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Fetch Deleted Companies
// 🔹 Soft Delete Company & Move to `archived_companies`
app.post("/admin/delete-company", authenticateJWT, async (req, res) => {
  const { id } = req.body;
  const deletedBy = req.user.id; // Get the admin who deleted it

  try {
    // Retrieve the company details before deletion
    const companyResult = await pool.query(
      "SELECT * FROM companies WHERE id=$1",
      [id]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    const { name, address, contact } = companyResult.rows[0];

    // Insert into `archived_companies`
    await pool.query(
      `INSERT INTO archived_companies (company_id, name, address, contact, deleted_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, name, address, contact, deletedBy]
    );

    // Remove from `companies` table
    await pool.query("DELETE FROM companies WHERE id=$1", [id]);

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Delete Company Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Add New Company
app.post("/admin/add-company", authenticateJWT, async (req, res) => {
  const { name, address, contact } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO companies (name, address, contact) VALUES ($1, $2, $3) RETURNING *",
      [name, address, contact]
    );
    res.status(201).json({ success: true, company: result.rows[0] });
  } catch (error) {
    console.error("❌ Add Company Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Update Company Details
app.put("/admin/update-company/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { name, address, contact } = req.body;

  try {
    const result = await pool.query(
      "UPDATE companies SET name=$1, address=$2, contact=$3 WHERE id=$4 RETURNING *",
      [name, address, contact, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({
      success: true,
      message: "Company updated successfully",
      company: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Company Update Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Soft Delete Company (Move to Deleted)
app.post("/admin/delete-company", authenticateJWT, async (req, res) => {
  const { id } = req.body;
  const deletedBy = req.user.username; // Capture admin username for logs

  try {
    // Move company to deleted state
    await pool.query("UPDATE companies SET deleted_at=NOW() WHERE id=$1", [id]);

    // Log the deletion
    await pool.query(
      "INSERT INTO deleted_companies_log (company_id, deleted_by, deleted_at) VALUES ($1, $2, NOW())",
      [id, deletedBy]
    );

    res.json({ success: true, message: "Company deleted successfully" });
  } catch (error) {
    console.error("❌ Delete Company Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});
// 🔹 Fetch Archived Companies (Previously Deleted Companies)
app.get("/admin/deleted-companies", authenticateJWT, async (req, res) => {
  try {
    console.log("Fetching deleted companies...");

    const result = await pool.query(
      "SELECT * FROM archived_companies ORDER BY deleted_at DESC"
    );

    console.log("✅ Deleted Companies fetched:", result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Deleted Companies Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Recover Deleted Company
app.post("/admin/recover-company", authenticateJWT, async (req, res) => {
  const { id } = req.body;

  try {
    const deletedCompany = await pool.query(
      "SELECT * FROM archived_companies WHERE id = $1",
      [id]
    );

    if (deletedCompany.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Company not found in deleted records" });
    }

    const { name, address, contact } = deletedCompany.rows[0];

    // ✅ Let PostgreSQL generate a NEW unique ID
    const newCompany = await pool.query(
      "INSERT INTO companies (name, address, contact) VALUES ($1, $2, $3) RETURNING id",
      [name, address, contact]
    );

    await pool.query("DELETE FROM archived_companies WHERE id = $1", [id]);

    res.json({
      message: "Company restored successfully!",
      new_id: newCompany.rows[0].id,
    });
  } catch (error) {
    console.error("❌ Restore Company Error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

//reports
//reports

app.get(
  "/admin/reports/cylinder-movement",
  authenticateJWT,
  async (req, res) => {
    try {
      let { start, end, search, sortBy, sortOrder } = req.query;

      let query = `
      SELECT 
        t.cylinder_id, 
        t.action, 
        u.username AS performed_by, 
        t.timestamp
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE 1 = 1
    `;

      let values = [];

      // 🔹 Date filter
      if (start && end) {
        query += ` AND t.timestamp BETWEEN $${values.length + 1} AND $${
          values.length + 2
        }`;
        values.push(start, end);
      }

      // 🔹 Search filter (filtering by cylinder ID or action type)
      if (search) {
        query += ` AND (
        CAST(t.cylinder_id AS TEXT) LIKE $${values.length + 1}
        OR LOWER(t.action) LIKE LOWER($${values.length + 1})
      )`;
        values.push(`%${search}%`);
      }

      // 🔹 Sorting logic
      if (sortBy && ["cylinder_id", "timestamp", "action"].includes(sortBy)) {
        query += ` ORDER BY ${sortBy} ${sortOrder === "desc" ? "DESC" : "ASC"}`;
      } else {
        query += ` ORDER BY t.timestamp DESC`; // Default sorting by latest
      }

      const result = await pool.query(query, values);
      res.json(result.rows);
    } catch (error) {
      console.error("❌ Cylinder Movement Report Error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  }
);
app.get(
  "/admin/reports/cylinder-movement-summary",
  authenticateJWT,
  async (req, res) => {
    try {
      // Fetch summary data
      const summaryQuery = `
      SELECT 
        COUNT(*) AS total_transactions, 
        COUNT(DISTINCT cylinder_id) AS unique_cylinders, 
        MAX(timestamp) AS latest_activity
      FROM transactions;
    `;

      const actionBreakdownQuery = `
      SELECT action, COUNT(*) AS count 
      FROM transactions 
      GROUP BY action 
      ORDER BY count DESC;
    `;

      // Execute queries
      const summaryResult = await pool.query(summaryQuery);
      const actionBreakdownResult = await pool.query(actionBreakdownQuery);

      res.json({
        total_transactions: summaryResult.rows[0].total_transactions,
        unique_cylinders: summaryResult.rows[0].unique_cylinders,
        latest_activity: summaryResult.rows[0].latest_activity,
        action_breakdown: actionBreakdownResult.rows,
      });
    } catch (error) {
      console.error("❌ Cylinder Movement Summary Error:", error);
      res.status(500).json({ error: "Database error", details: error.message });
    }
  }
);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
