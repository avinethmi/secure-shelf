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

  const handleLogin = (e) => {
    e.preventDefault();
    const result = loginUser(email, password);

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
    const created = createPolicy(policyObj.title, policyObj.content, policyObj.publishedBy, policyObj.authorId);
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
              <header className="app-header">
                <div>User: <strong>{currentUser.email}</strong> ({currentUser.role})</div>
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