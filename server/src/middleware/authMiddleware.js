
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Please log in.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token is missing.",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing.");

    return res.status(500).json({
      success: false,
      message: "Server authentication is not configured.",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }

    req.user = { userId: decoded.userId };
    next();
  });
}

module.exports = authenticateToken;
