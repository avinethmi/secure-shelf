import React from 'react';

export default function Login({ email, setEmail, password, setPassword, handleLogin, showPassword, setShowPassword }) {
  
  // Input Sanitization & Trimming before submitting
  const onSubmit = (e) => {
    e.preventDefault();
    const sanitizedEmail = email.trim();
    const sanitizedPassword = password.trim();
    handleLogin(e, { email: sanitizedEmail, password: sanitizedPassword });
  };

  return (
    <div className="login-card">
      <h2>SecureShelf Portal Login</h2>
      <form onSubmit={onSubmit} className="login-form">

        {/* Email Row */}
        <div className="form-group-row">
          <label htmlFor="email">Email Address</label>
          <input 
            id="email"
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            autoComplete="email"
          />
        </div>

        {/* Password Row */}
        <div className="form-group-row">
          <label htmlFor="password">Password</label>
          <div className="password-input-container">
            <input 
              id="password"
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              autoComplete="current-password"
            />
            <button 
              type="button" 
              className="eye-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? (
                /* Slash Eye Icon */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                /* Regular Eye Icon */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Full-width Authenticate Button */}
        <button type="submit" className="login-btn">
          Authenticate
        </button>

        {/* Ethical Data Privacy & Security Notice */}
        <p className="privacy-notice">
          🔒 <strong>Ethical Data Notice:</strong> Authentication logs and training activity are recorded in compliance with institutional employee privacy and security guidelines.
        </p>
      </form>
    </div>
  );
}