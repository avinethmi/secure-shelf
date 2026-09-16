import React from 'react';

export default function Navbar({ currentUser, onLogout }) {
  return (
    <nav className="navbar">
      <div className="nav-brand">SecureShelf System</div>
      {currentUser && (
        <div className="nav-user-info">
          <span>Logged in as: <strong>{currentUser.email}</strong> ({currentUser.role})</span>
          <button onClick={onLogout} className="logout-btn">Log Out</button>
        </div>
      )}
    </nav>
  );
}