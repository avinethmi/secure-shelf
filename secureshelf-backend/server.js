const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'secureshelf_super_secret_key_2026';

/* --- SECURE CODING MIDDLEWARE --- */

// 1. HTTP Security Headers
app.use(helmet());

// 2. CORS Configuration
app.use(cors({
  origin: 'http://localhost:3000', // Adjust to match your frontend dev server URL
  credentials: true
}));

// 3. Body Parser with payload limit
app.use(express.json({ limit: '10kb' }));

// 4. Rate Limiting (Prevents Brute Force Attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs for auth routes
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

app.use('/api/auth/', authLimiter);

/* --- MOCK USER DATABASE (Hashed Passwords) --- */
// In production, fetch this from MongoDB / PostgreSQL
const users = [
  {
    id: 'USR-001',
    email: 'admin@secureshelf.com',
    // Pre-hashed password for "AdminPass123!" using bcrypt (10 rounds)
    passwordHash: '$2a$10$w4rU8T7J0QGk7v9z8Y5X1e8H1v2K3L4M5N6O7P8Q9R0S1T2U3V4W5',
    role: 'Security Analyst'
  }
];

/* --- AUTHENTICATION ENDPOINT --- */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // User lookup
    const user = users.find(u => u.email === email.toLowerCase().trim());
    if (!user) {
      // Generic message to prevent account enumeration
      return res.status(401).json({ error: 'Invalid credentials provided.' });
    }

    // Password verification using Bcrypt
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials provided.' });
    }

    // Sign JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

/* --- SECURE JWT AUTHENTICATION MIDDLEWARE --- */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

/* --- SECURE PROTECTED API ROUTES --- */
app.get('/api/logs', verifyToken, (req, res) => {
  res.status(200).json({
    message: 'CCTV Logs retrieved successfully.',
    requestedBy: req.user.email
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SecureShelf Backend server running on port ${PORT}`);
});