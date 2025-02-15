require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { authenticateJWT } = require("./middleware/authMiddleware");

const app = express();

app.use(express.json());
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));

// 🔹 User Login (For Admins & Workers)
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Add Cylinder (For Testing Purposes)
app.post("/add-cylinder", authenticateJWT, async (req, res) => {
  const cylinders = req.body; // Expecting an array of objects

  if (!Array.isArray(cylinders) || cylinders.length === 0) {
    return res
      .status(400)
      .json({ error: "Invalid request. Provide an array of cylinders." });
  }

  try {
    const values = cylinders
      .map(
        (c) => `('${c.serialNumber}', '${c.gasType}', '${c.size}', 'available')`
      )
      .join(",");
    const query = `INSERT INTO cylinders (serial_number, gas_type, size, status) VALUES ${values} RETURNING *`;

    const result = await pool.query(query);
    res.json({
      message: "Cylinders added successfully",
      cylinders: result.rows,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Dispatch Cylinder (Workers Only)
app.post("/dispatch-cylinder", authenticateJWT, async (req, res) => {
  const { serialNumbers, companyId } = req.body;

  if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
    return res
      .status(400)
      .json({ error: "Invalid request. Provide an array of serial numbers." });
  }

  try {
    const checkCompany = await pool.query(
      "SELECT id FROM companies WHERE id = $1",
      [companyId]
    );
    if (checkCompany.rows.length === 0) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    const query = `
      UPDATE cylinders 
      SET status = 'dispatched', company_id = $1 
      WHERE serial_number = ANY($2::text[])
    `;
    await pool.query(query, [companyId, serialNumbers]);

    await pool.query(
      `INSERT INTO transactions (user_id, cylinder_id, action, company_id) 
       SELECT $1, id, 'dispatch', $2 FROM cylinders WHERE serial_number = ANY($3::text[])`,
      [req.user.id, companyId, serialNumbers]
    );

    res.json({ message: "Cylinders dispatched successfully" });
  } catch (error) {
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Receive Cylinder (Workers Only)
app.post("/receive-cylinder", authenticateJWT, async (req, res) => {
  const { emptySerialNumbers, filledSerialNumbers, companyId } = req.body;

  if (
    !Array.isArray(emptySerialNumbers) ||
    !Array.isArray(filledSerialNumbers) ||
    (emptySerialNumbers.length === 0 && filledSerialNumbers.length === 0)
  ) {
    return res
      .status(400)
      .json({
        error: "Invalid request. Provide at least one cylinder serial number.",
      });
  }

  try {
    const checkCompany = await pool.query(
      "SELECT id FROM companies WHERE id = $1",
      [companyId]
    );
    if (checkCompany.rows.length === 0) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    // ✅ Update EMPTY cylinders
    if (emptySerialNumbers.length > 0) {
      await pool.query(
        `UPDATE cylinders 
         SET status = 'empty', company_id = NULL 
         WHERE serial_number = ANY($1::text[])`,
        [emptySerialNumbers]
      );

      await pool.query(
        `INSERT INTO transactions (user_id, cylinder_id, action, company_id) 
         SELECT $1, id, 'receive_empty', $2 
         FROM cylinders WHERE serial_number = ANY($3::text[])`,
        [req.user.id, companyId, emptySerialNumbers]
      );
    }

    // ✅ Update FILLED cylinders
    if (filledSerialNumbers.length > 0) {
      await pool.query(
        `UPDATE cylinders 
         SET status = 'filled', company_id = NULL 
         WHERE serial_number = ANY($1::text[])`,
        [filledSerialNumbers]
      );

      await pool.query(
        `INSERT INTO transactions (user_id, cylinder_id, action, company_id) 
         SELECT $1, id, 'receive_filled', $2 
         FROM cylinders WHERE serial_number = ANY($3::text[])`,
        [req.user.id, companyId, filledSerialNumbers]
      );
    }

    res.json({
      message: `Cylinders received successfully from Company ${companyId}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Send Cylinders for Refill (Workers Only)
app.post("/refill-cylinder", authenticateJWT, async (req, res) => {
  const { cylinderIds } = req.body;
  try {
    await pool.query(
      "UPDATE cylinders SET status = 'refilling' WHERE id = ANY($1)",
      [cylinderIds]
    );
    res.json({ message: "Cylinders sent for refilling" });
  } catch (error) {
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Mark Cylinders as Filled (Workers Only)
app.post("/complete-refill", authenticateJWT, async (req, res) => {
  const { cylinderIds } = req.body;
  try {
    await pool.query(
      "UPDATE cylinders SET status = 'filled' WHERE id = ANY($1)",
      [cylinderIds]
    );
    res.json({ message: "Cylinders marked as filled successfully" });
  } catch (error) {
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 List All Companies (Workers Need to Select Company When Dispatching/Receiving)
app.get("/companies", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM companies");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// 🔹 Test Database Connection
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connection successful!",
      server_time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
