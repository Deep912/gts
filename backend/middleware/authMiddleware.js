const jwt = require("jsonwebtoken");

// Middleware to authenticate users
const authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token)
    return res.status(403).json({ error: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET
    );
    req.user = decoded; // Attach user data to request
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Middleware to check if user is an Admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  next();
};

// Middleware to check if user is a Worker
const isWorker = (req, res, next) => {
  if (!req.user || req.user.role !== "worker") {
    return res.status(403).json({ error: "Access denied. Workers only." });
  }
  next();
};

module.exports = { authenticateJWT, isAdmin, isWorker };
