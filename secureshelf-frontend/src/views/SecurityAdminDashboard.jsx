import React, { useState } from 'react';
import PolicyManagerTable from '../components/dashboard/PolicyManagerTable';

export default function SecurityAdminDashboard({
  incidents = [],
  users = [],
  policies = [],
  onUnlock,
  onPublishPolicy,
  onRemovePolicy
}) {
  const [usernameToUnlock, setUsernameToUnlock] = useState('');

  const handleManualUnlockSubmit = (e) => {
    e.preventDefault();
    if (usernameToUnlock.trim()) {
      onUnlock(usernameToUnlock.trim());
      setUsernameToUnlock('');
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Security Administrator Workspace</h1>

       <div style={{ marginTop: '32px' }}>
          <h3>Reported Security Incidents (Exclusive View)</h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>REPORTER</th>
                  <th>TYPE</th>
                  <th>DESCRIPTION</th>
                  <th>SEVERITY</th>
                  <th>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                      No security incidents reported.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr key={inc.id}>
                      <td>{inc.id}</td>
                      <td>{inc.reportedBy}</td>
                      <td>{inc.type}</td>
                      <td>{inc.description}</td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: inc.severity === 'Critical' || inc.severity === 'High' ? '#fee2e2' : '#fef3c7', color: inc.severity === 'Critical' || inc.severity === 'High' ? '#b91c1c' : '#b45309' }}>
                          {inc.severity}
                        </span>
                      </td>
                      <td>{inc.timestamp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Account Lockouts & Password Attempts Section */}
      <section className="section-container account-lockouts-container">
        <h2>Account Lockouts & Password Attempts (Database Status)</h2>

        {/* 1. MANUAL USERNAME UNLOCK FORM */}
        <form onSubmit={handleManualUnlockSubmit} className="manual-unlock-form">
          <label htmlFor="unlock-username">Username to Unlock:</label>
          <input
            id="unlock-username"
            type="text"
            placeholder="Enter username..."
            value={usernameToUnlock}
            onChange={(e) => setUsernameToUnlock(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">
            Unlock Account
          </button>
        </form>

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
            <tbody>
              {users.map((u) => (
                <tr key={u.email}>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.failedAttempts}</td>
                  <td>
                    <span className={`status-badge ${u.isLocked ? 'status-locked' : 'status-active'}`}>
                      {u.isLocked ? 'Locked' : 'Active'}
                    </span>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Policy Management & Removal View */}
      <PolicyManagerTable
        policies={policies}
        userRole="Security Admin"
        onPublishPolicy={onPublishPolicy}
        onRemovePolicy={onRemovePolicy}
      />
    </div>
  );
}