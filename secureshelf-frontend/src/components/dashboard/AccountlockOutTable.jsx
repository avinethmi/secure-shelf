import React, { useState } from 'react';

export default function AccountLockouts({ accounts, onUnlockAccount }) {
  const [usernameToUnlock, setUsernameToUnlock] = useState('');

  const handleManualUnlockSubmit = (e) => {
    e.preventDefault();
    if (usernameToUnlock.trim()) {
      onUnlockAccount(usernameToUnlock.trim());
      setUsernameToUnlock('');
    }
  };

  return (
    <div className="section-container">
      <h2>Account Lockouts & Password Attempts (Database Status)</h2>

      {/* 2. TABLE WITH ROW UNLOCK ACTIONS */}
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Account Email</th>
              <th>Role</th>
              <th>Failed Attempts</th>
              <th>Status</th>
            </tr>
          </thead>
        </table>
      </div>
    </div>
  );
}