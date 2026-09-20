# SecureShelf Project Proposal (text extract)

Source: ../Project-Proposal-IE3072.docx, submitted August 2026, extracted 2026-09-21. This is the contract the demo is marked against.

Figure 1 (architecture): User device (responsive React) -> HTTPS -> Web host / TLS endpoint (static files, secure cookies, restricted origins) -> restricted API request -> Express API trust boundary [Authentication -> Permission check -> Validation -> Service logic -> Audit entry] -> transactions and controlled file operations -> PostgreSQL (records, constraints, audit history) and Private evidence storage (files outside the public web root).

Figure 2 (policy lifecycle): Draft (Administrator writes a numbered version) -> Review (Owner checks content and scope; 'changes requested' returns to Draft) -> Approved (author and approver must differ) -> Published (version locked for editing) -> Acknowledged (assigned staff confirm they read it). A new change creates a new version; earlier acknowledgements stay linked to the exact published version.

Sri Lanka Institute of Information Technology
SecureShelf
Security Policy and Awareness System for Marvels
IE3072 Information Security Policy and Management
Assessment Product Proposal
Organization Marvels
Year 3, Semester 2
August,2026
Team members
| Full name | Student ID |
| K.A. Arshad Khan | IT23629776 |
| Perera H.A.T.A | IT23700338 |
| Dencil P.A.N | IT23545212 |
| Deerada R.P.V | IT23547056 |

## 1. Executive Summary
Marvels is a real retail and wholesale shop that uses digital systems in its daily work. Billing computers, staff and customer information, business records, and CCTV footage all require appropriate protection. A small business may own these technologies without having one place to publish rules, train staff, record acknowledgements, and review security gaps.
SecureShelf is a responsive web application proposed for Marvels. It will give the owner and staff a practical way to manage security policies, complete short training based on each role, record compliance work, and document CCTV governance. It will not replace the billing system or the CCTV application. It will record the policies, responsibilities, approvals, and evidence that govern how those systems should be used.
The first release is deliberately limited to features that can be implemented and demonstrated reliably during the module. SecureShelf is a management aid. It is not presented as legal certification or as a complete security solution.
### 1.1 Problem and risk basis
The proposal uses a preliminary assessment of the shop environment. Device counts, account arrangements, retention periods, and payment scope will be confirmed with the owner before final configuration. Unconfirmed items will be recorded as assumptions rather than reported as facts.
| Area | Preliminary risk | SecureShelf response |
| Accounts | Shared or poorly managed accounts weaken accountability | Record named users, roles, status, and access decisions inside SecureShelf |
| Policies | Staff may not have one approved source of security rules | Publish controlled policy versions and record acknowledgement |
| Awareness | Staff may receive little security guidance suited to their work | Assign short lessons and quizzes by job role |
| Customer and staff data | Personal information may lack classification and handling rules | Record assets, classification, ownership, and relevant controls |
| CCTV | Purpose, access, notice, and retention may not be documented | Maintain a camera register, authorisation record, notice, and declared access log |

Consensus will be sought from both the owner and staff. The owner needs useful controls that do not interrupt trading. Staff need clear rules that support fair accountability and avoid excessive monitoring. Findings from interviews will be approved by the owner before they are used in the final demonstration.
### 1.2 Objectives and deliverables
The objectives are to create one trusted policy source, improve staff awareness, make assigned responsibilities visible, and provide evidence of completed security work.
The project will deliver a responsive web prototype, a PostgreSQL database, a secure API, screens suited to each role, sample policies and training, a compliance gap report, technical documentation, and an Acceptable Use Policy for Part 2.
### 1.3 Scope
The first release includes accounts and access based on roles, policy versioning and acknowledgement, short training and quizzes, an asset and control register, CCTV governance records, basic incident reporting, and an application audit trail.
It excludes billing transactions, direct control of CCTV equipment, video streaming, automatic collection of activity from the CCTV vendor, real email phishing campaigns, payroll, customer relationship management, and a native mobile application.
## 2. Functional Requirements
### 2.1 Accounts and Access
| ID | Requirement |
| FR-01 | Authenticate users by email and password using Argon2id password hashes |
| FR-02 | Lock an account after five failed attempts and return the same login error for an unknown email and a wrong password |
| FR-03 | Require a second factor for the Owner and Security Administrator |
| FR-04 | Give each user one role and deny access unless the role has the required permission |
| FR-05 | Create, suspend, and offboard accounts while revoking active sessions |

### 2.2 Policy Management
| ID | Requirement |
| FR-06 | Create overall, issue focused, and system focused policy drafts with a classification |
| FR-07 | Keep numbered policy versions and prevent editing of a published version |
| FR-08 | Move a version through draft, review, approval, and publication while preventing an author from approving their own work |
| FR-09 | Assign published versions to roles and record user, version, and acknowledgement time |

### 2.3 Training and Awareness
| ID | Requirement |
| FR-10 | Deliver short lessons and quizzes based on each role with a pass mark and attempt limit |
| FR-11 | Show assigned, overdue, passed, and incomplete training for each role |

### 2.4 Compliance and Reporting
| ID | Requirement |
| FR-12 | Maintain an asset register with owner, classification, and relevant data types |
| FR-13 | Record selected control assessments with status, owner, target date, notes, and evidence |
| FR-14 | Produce a PDF summary of open compliance gaps and overdue actions |

### 2.5 CCTV and Privacy
| ID | Requirement |
| FR-15 | Maintain camera purpose, location, retention, signage, and named viewing authorisations |
| FR-16 | Allow an authorised user to declare a CCTV viewing or export record with a reason while clearly identifying this as a manual governance record |
| FR-17 | Show a monitoring notice to staff and record acknowledgement of the notice |

### 2.6 Incidents, Audit, and Dashboard
| ID | Requirement |
| FR-18 | Allow any user to report an incident and allow authorised roles to update its status |
| FR-19 | Record significant SecureShelf actions in an append only application audit log |
| FR-20 | Present a dashboard suited to each role that remains usable on a 375 pixel wide screen |

## 3. Non Functional Requirements
### 3.1 Security
| ID | Measurable target |
| NFR-01 | Use Argon2id with at least 19 MiB memory cost for passwords |
| NFR-02 | Expire access tokens within 15 minutes and refresh tokens within 7 days |
| NFR-03 | Validate every request body and use parameterised database queries |
| NFR-04 | Limit login attempts to 10 per source address per minute |
| NFR-05 | Encrypt selected sensitive fields such as NIC, phone number, and contact details with AES-256-GCM |
| NFR-06 | Keep credentials outside source control and have no known high or critical production dependency vulnerability at submission |

### 3.2 Privacy and Ethical Use
| ID | Measurable target |
| NFR-07 | Do not perform keystroke logging, screen capture, location tracking, or message inspection |

### 3.3 Usability and Accessibility
| ID | Measurable target |
| NFR-08 | Complete policy acknowledgement in no more than three user actions after opening the assigned policy |
| NFR-09 | Support keyboard use, visible focus, text labels, and readable contrast on core screens |

### 3.4 Reliability, Recovery, and Performance
| ID | Measurable target |
| NFR-10 | Commit each important change and its audit entry in one database transaction |
| NFR-11 | Document backup and restore steps and demonstrate one successful restore before handover |
| NFR-12 | Load the main dashboard within 2 seconds in the agreed demonstration environment |

When deployed beyond the local demonstration environment, SecureShelf will use TLS, secure cookies, a restricted CORS allowlist, and evidence storage outside the public web directory.
## 4. Application Architecture
SecureShelf uses a three layer design because the expected number of users is small and one deployable API is easier to secure, test, and maintain than several services.
Figure 1. Application architecture and trust boundaries
| Layer | Choice | Main responsibility |
| Interface | React and Vite | Screens suited to each role and a narrow mobile layout |
| API | Node.js and Express | Authentication, authorisation, validation, and workflows |
| Input Validation | Zod | Reject malformed or unexpected input |
| Data | PostgreSQL | Relationships, constraints, transactions, and reporting data |
| Files | Private filesystem | Store evidence under generated names outside the web root |
| Security | Helmet, CORS allowlist, rate limiting, Argon2id, TOTP, and AES-GCM | Reduce common web and account risks |

The client is not trusted to enforce permissions. The API checks the user and required permission for each protected request. Structural input validation is performed before service logic. Checks for each selected record confirm that the caller may act on the selected record.
## 5. Key Modules and Interface Design
| Module | Core screens | Main security rule |
| Accounts | Login, second factor, user list, account form | Deny by default and revoke sessions when an account is offboarded |
| Policies | Policy list, editor, review queue, reader, acknowledgement status | The author cannot approve the same version |
| Training | Assigned learning, lesson reader, quiz, team progress | Staff see their own record while authorised roles see team summaries |
| Compliance | Assets, control assessment, evidence, gap report | Evidence is type and size checked and stored outside the web root |
| CCTV governance | Camera register, authorisations, access declaration, staff notice | Records govern expected use but do not technically control the separate CCTV application |
| Incidents | Report form, incident queue, status history | Any user may report while only authorised roles may manage cases |
| Audit | Filtered event list and integrity result | Existing rows cannot be edited through the application |

Figure 2. Policy lifecycle and acknowledgement flow
If changes are requested, the version returns to Draft. A published policy is never overwritten. A later change creates a new numbered version, which keeps earlier acknowledgements connected to the exact wording that was accepted.
The dashboard will use plain language and show only relevant actions. A cashier will see assigned policies, training, and incident reporting. The owner will see approval work, overdue actions, and summary indicators. The interface will not display technical control identifiers without a short explanation.
### 5.1 Roles and separation of duties
| Capability | Owner | Security Admin | Manager | Cashier | Stock Staff |
| Approve policy | Yes |  |  |  |  |
| Write policy |  | Yes |  |  |  |
| Assign training | Yes | Yes | Yes |  |  |
| Assess controls | Yes | Yes |  |  |  |
| Manage CCTV records | Yes | Yes |  |  |  |
| Acknowledge and train | Yes | Yes | Yes | Yes | Yes |
| Report incident | Yes | Yes | Yes | Yes | Yes |
| Read audit records | Yes | Yes |  |  |  |

### 5.2 Training needs
Training will be based on the tasks and information handled by each role. Cashiers will receive customer data, payment safety, password, and incident reporting topics. Stock staff will receive device, supplier information, and physical security topics. The owner and Security Administrator will receive policy approval, privacy, CCTV governance, and incident management topics.
The system will compare required topics with passed courses to show gaps. The first release will use short lessons and quizzes. Automated phishing simulation and external education tracking are outside the first release.
### 5.3 Audit limitations
Each audit entry will include the previous entry hash. This detects ordinary changes that break the stored chain, while database triggers reject update and delete operations by the application. The design does not claim protection from a database superuser who can disable controls, remove final rows, or rebuild the whole chain. A production improvement would copy signed chain checkpoints to a separately protected location.
## 6. Compliance and Ethical Use
SecureShelf supports compliance work but does not certify Marvels against any law or standard. Applicability depends on the confirmed business process.
| Source | Use in SecureShelf |
| Sri Lanka PDPA No. 9 of 2022 as amended by Act No. 22 of 2025 | Privacy principles, processing records, notices, data rights readiness, and CCTV governance |
| PCI DSS v4.0.1 | Selected merchant controls only if Marvels stores, processes, transmits, or can affect cardholder data |
| NIST CSF 2.0 | Selected outcomes for assets, governance, awareness, protection, and incident response |
| ISO/IEC 27001:2022 | Selected guidance for assets, classification, acceptable use, awareness, and responsibilities |

CCTV footage and staff records will be treated as Restricted information. The system records camera purpose, retention, signage, and named authorisations. A viewing record entered in SecureShelf is a governance declaration. It is not an automatic record from the CCTV equipment unless a future authorised integration is added.
Monitoring will be proportionate. SecureShelf will not collect private messages, screens, keystrokes, continuous location, or unrelated employee behaviour. Staff acknowledgement of a monitoring notice proves that the notice was shown. It does not replace the need for an appropriate lawful basis or give unlimited permission to monitor.
## 7. Delivery Plan and Evaluation
| Stage | Deliverable | Acceptance evidence |
| 1 | Accounts, roles, and secure API foundation | Owner and cashier logins show different permitted actions |
| 2 | Policy workflow and acknowledgement | A draft is approved by another role and acknowledged by assigned staff |
| 3 | Training and quiz | A cashier completes a course and the progress summary updates |
| 4 | Assets, controls, and report | An open gap appears in a generated PDF summary |
| 5 | CCTV records, incidents, audit, and responsive dashboard | A governance record and incident are created and appear in the audit trail |
| 6 | Testing, backup restore, documentation, and AUP | Core tests pass and a clean database is restored from backup |

The demonstration will use prepared fictional staff and customer data. No real password, NIC, phone number, CCTV footage, or incident detail from Marvels will be included. Success will be measured against the functional requirements, usability on a narrow mobile screen, role restrictions, report output, and the documented restore test.
## 8. Conclusion
SecureShelf proposes a practical way for Marvels to organise essential security work in one place. It brings together policies, staff awareness, asset and CCTV records, incident reporting, and basic compliance evidence while keeping access appropriate to each role. This should make routine security responsibilities easier to understand, assign, and review across the retail and wholesale operations of the shop.
The project will deliver and evaluate a focused prototype rather than claim to solve every security or compliance issue. Its value will depend on accurate records, responsible use, regular review, and continued management support from Marvels.
The completed prototype will give Marvels a foundation for testing whether a central security management system is suitable for its daily work. Findings from staff feedback, functional testing, and the documented evaluation can then guide any later improvements or carefully planned production use.
## 9. References
[1] Parliament of Sri Lanka. Personal Data Protection Act No. 9 of 2022.
[2] Parliament of Sri Lanka. Personal Data Protection Amendment Act No. 22 of 2025.
[3] Gazette Extraordinary No. 2498/16. Order under section 1(3) of the Personal Data Protection Act. 22 July 2026.
[4] PCI Security Standards Council. Payment Card Industry Data Security Standard v4.0.1. 2024.
[5] National Institute of Standards and Technology. Cybersecurity Framework 2.0. 2024.
[6] National Institute of Standards and Technology. Building a Cybersecurity and Privacy Learning Program, SP 800-50 Revision 1. 2024.
[7] International Organization for Standardization. ISO/IEC 27001:2022.
