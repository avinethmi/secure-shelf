# 🛡️ SecureShelf Portal

**SecureShelf** is a role-aware Information Security & Governance System designed for retail operations. It provides role-based access control (RBAC), security policy management, CCTV governance tracking, and an incident escalation pipeline to bridge operational staff and security administration.

---

## ✨ Features

- **🔐 Role-Based Access Control (RBAC):**
  - **Cashier Workspace:** Streamlined view to report security incidents and complete mandatory compliance checks.
  - **Owner Workspace:** CCTV log management, incident reporting, and security policy overview.
  - **Security Admin Dashboard:** Centralized security oversight, account unlock controls, incident queue management, and policy distribution.

- **🚨 Security Incident Escalation Pipeline:**
  - Categorized reporting (**Unauthorized Access**, **Suspicious Activity**, **Policy Violation**, **Hardware / Register Issue**).
  - Severity classification (**Low**, **Medium**, **High**, **Critical**).
  - Real-time/persistent incident log table per workspace.

- **📹 CCTV Governance & Log Audit:**
  - Audit logging for camera access requests with reason tracking and timestamping.
  - Deletion/retention capabilities for authorized roles.

- **📜 Policy & Compliance Management:**
  - Publish, distribute, and enforce security policies across all active workspace accounts.
  - Interactive policy acceptance modal and verification quizzes for staff onboarding/sessions.

---

## 🏗️ Project Architecture

```text
secureshelf/
├── secureshelf-frontend/        # React (Vite) Frontend
│   ├── src/
│   │   ├── assets/styles/      # Global & Component CSS
│   │   ├── components/         # Common UI, Modals, Forms
│   │   ├── views/              # Dashboards (Admin, Owner, Cashier)
│   │   ├── mockData/           # Fallback mock data structure
│   │   └── App.jsx             # Authentication & Main Workflow Controller
│   └── package.json
│
└── secureshelf-backend/         # Node.js / Express REST API
    ├── config/                 # Database configuration (db.js)
    ├── routes/                 # Express API Routes (CCTV, Incidents, Policies)
    ├── server.js               # Entry point
    └── package.json
