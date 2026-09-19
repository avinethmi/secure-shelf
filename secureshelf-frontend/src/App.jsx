import React, { useState } from 'react';
import { database, loginUser, unlockAccount, createPolicy, removePolicy } from './mockData/database';
import PasswordInput from './components/common/PasswordInput';
import PolicyAcceptModal from './components/common/PolicyAcceptModal';
import SecurityQuizModal from './components/quiz/securityQuizmodal';
import SecurityAdminDashboard from './views/SecurityAdminDashboard';
import OwnerDashboard from './views/OwnerDashboard';
import CashierDashboard from './views/CashierDashboard';

import './assets/styles/main.css';

export default function App() {
  const [userDb, setUserDb] = useState(database.users);
  const [policies, setPolicies] = useState(database.policies);
  const [incidents, setIncidents] = useState(database.incidents);
  const [cctvLogs, setCctvLogs] = useState(database.cctvLogs);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState('');

  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  // Client-Side Input Sanitization Helper against XSS & SQLi payloads
  const sanitizeInput = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>'";\\]/g, '').trim();
  };

  const handleLogin = (e) => {
    e.preventDefault();

    // Sanitize user inputs prior to processing authentication
    const cleanEmail = sanitizeInput(email);

    const result = loginUser(cleanEmail, password);

    if (result.success) {
      setCurrentUser(result.user);
      setAuthError('');
    } else {
      setAuthError(result.message);
    }
    setUserDb([...database.users]);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPolicyAccepted(false);
    setQuizPassed(false);
    setEmail('');
    setPassword('');
  };

  const handleUnlock = (targetEmail) => {
    unlockAccount(targetEmail);
    setUserDb([...database.users]);
  };

  const handlePublishPolicy = (policyObj) => {
    const created = createPolicy(
      sanitizeInput(policyObj.title),
      sanitizeInput(policyObj.content),
      policyObj.publishedBy,
      policyObj.authorId
    );
    setPolicies([...database.policies]);
  };

  const handleRemovePolicy = (policyId) => {
    const updated = removePolicy(policyId, currentUser.role);
    setPolicies([...updated]);
  };

  return (
    <div className="app-container">
      {!currentUser ? (
        <div className="login-card">
          <h2>SecureShelf Portal Login</h2>
          {authError && <p className="error-text">{authError}</p>}
          <form onSubmit={handleLogin}>
            {/* Email Row */}
            <div className="form-group-row">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Component Row */}
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />

            <button type="submit" className="login-btn">Log In</button>
          </form>

          {/* Ethical Privacy Notice */}
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
            <p style={{
              margin: 0,
              textAlign: 'center',
              fontSize: '12px',
              color: '#475569',
              lineHeight: '1.4'
            }}>
              🔒 <strong>Ethical Data Notice:</strong> Authentication logs, access events, and training activity are recorded strictly in compliance with institutional employee privacy and security guidelines.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Workflow Step 1: Policy Acceptance */}
          {!policyAccepted && (
            <PolicyAcceptModal
              policies={policies}
              onAllAccepted={() => setPolicyAccepted(true)}
            />
          )}

          {/* Workflow Step 2: Security Verification Quiz */}
          {policyAccepted && !quizPassed && (
            <SecurityQuizModal onQuizPassed={() => setQuizPassed(true)} />
          )}

          {/* Workflow Step 3: Main Workspace View */}
          {policyAccepted && quizPassed && (
            <div>
              <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  User: <strong>{currentUser.email}</strong>
                  {/* Role-Based Access Status Badge */}
                  <span style={{
                    marginLeft: '12px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: currentUser.role === 'Security Admin' ? '#dc2626' : currentUser.role === 'Owner' ? '#2563eb' : '#16a34a',
                    color: '#ffffff'
                  }}>
                    Role: {currentUser.role}
                  </span>
                </div>
                <button onClick={handleLogout} className="logout-btn">Log Out</button>
              </header>

              {currentUser.role === 'Security Admin' && (
                <SecurityAdminDashboard
                  incidents={incidents}
                  users={userDb}
                  policies={policies}
                  onUnlock={handleUnlock}
                  onPublishPolicy={handlePublishPolicy}
                  onRemovePolicy={handleRemovePolicy}
                />
              )}

              {currentUser.role === 'Owner' && (
                <OwnerDashboard
                  cctvLogs={cctvLogs}
                  policies={policies}
                  onAddCCTVLog={(log) => setCctvLogs([...cctvLogs, log])}
                  onReportIncident={(inc) => setIncidents([...incidents, inc])}
                  onPublishPolicy={handlePublishPolicy}
                  onRemovePolicy={handleRemovePolicy}
                />
              )}

              {currentUser.role === 'Cashier' && (
                <CashierDashboard
                  onReportIncident={(inc) => setIncidents([...incidents, inc])}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}