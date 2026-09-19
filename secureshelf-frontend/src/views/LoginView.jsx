import React from 'react';
import PasswordInput from './PasswordInput';

export default function LoginView({ email, setEmail, password, setPassword, handleLogin }) {
  const onSubmit = (e) => {
    e.preventDefault();
    handleLogin(e);
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

        {/* Password Component */}
        <PasswordInput 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Submit Button */}
        <button type="submit" className="login-btn">
          Log In
        </button>

        {/* Forced Visible Ethical Privacy Notice */}
        <p 
          className="privacy-notice" 
          style={{ 
            display: 'block', 
            visibility: 'visible', 
            opacity: 1, 
            marginTop: '20px', 
            textAlign: 'center', 
            fontSize: '12px', 
            color: '#475569',
            lineHeight: '1.4',
            width: '100%' 
          }}
        >
          🔒 <strong>Ethical Data Notice:</strong> Authentication logs and training activity are recorded in compliance with institutional employee privacy and security guidelines.
        </p>

      </form>
    </div>
  );
}