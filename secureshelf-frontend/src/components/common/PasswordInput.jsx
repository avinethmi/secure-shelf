import React, { useState } from 'react';

export default function PasswordInput({ value, onChange, placeholder = "Password" }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="form-group-row">
      <label htmlFor="password">Password</label>
      <div className="password-input-container">
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
        />
        <button
          type="button"
          className="eye-toggle-btn"
          onClick={() => setShowPassword(!showPassword)}
          aria-label="Toggle password visibility"
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}