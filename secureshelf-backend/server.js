const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// 1. HELMET HTTP HEADER PROTECTIONS
app.use(helmet());

// 2. RATE-LIMITING AGAINST BRUTE FORCE (Login route specific)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: { error: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. BODY PARSER & XSS / SQL INJECTION SANITIZATION
app.use(express.json({ limit: '10kb' })); // Prevents large payload attacks

// Sanitize user input against XSS scripts
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Helper input sanitizer function for string inputs (SQLi / XSS defense)
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/['";\\]/g, '').trim(); // Strips common SQL injection characters
};

// 4. BCRYPT PASSWORD HASHING & JWT TOKEN AUTHENTICATION
const JWT_SECRET = process.env.JWT_SECRET || 'secureshelf_super_secret_key';

// Login Endpoint
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const email = sanitizeInput(req.body.email);
  const password = req.body.password;

  try {
    // Replace this query with your database lookup logic
    const user = await getUserByEmail(email); 

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password with Bcrypt
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT Token including Role-Based Access Status
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Authentication failed server-side.' });
  }
});

// 5. ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = decodedUser;
    next();
  });
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Role '${req.user.role}' is not authorized to access this resource.` 
      });
    }
    next();
  };
};

// Example Protected Route with Role-Based Access Status
app.get('/api/owner/cctv', authenticateToken, authorizeRoles('Owner', 'Security Admin'), (req, res) => {
  res.json({ message: 'Authorized access to CCTV logs.' });
});