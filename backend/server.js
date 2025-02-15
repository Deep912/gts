require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const {
  authenticateJWT,
  isAdmin,
  isWorker,
} = require("./middleware/authMiddleware");

const app = express(); // ✅ Define app before using it

app.use(express.json());
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));

// Example: Only Admins can manage cylinders
app.post("/add-cylinder", authenticateJWT, isAdmin, async (req, res) => {
  const { serialNumber, gasType, size } = req.body;
  try {
    await pool.query(
      "INSERT INTO cylinders (serial_number, gas_type, size, status) VALUES ($1, $2, $3, 'available')",
      [serialNumber, gasType, size]
    );
    res.json({ message: "Cylinder added successfully" });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

// Example: Workers can only dispatch, receive, or refill
app.post("/dispatch-cylinder", authenticateJWT, isWorker, async (req, res) => {
  const { cylinderId, company } = req.body;
  try {
    await pool.query(
      "UPDATE cylinders SET status = 'dispatched' WHERE id = $1",
      [cylinderId]
    );
    await pool.query(
      "INSERT INTO transactions (user_id, cylinder_id, action, company) VALUES ($1, $2, 'dispatch', $3)",
      [req.user.id, cylinderId, company]
    );
    res.json({ message: "Cylinder dispatched successfully" });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connection successful!",
      server_time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({ error: "Database connection error" });
  }
});

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

    // Compare entered password with stored hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
