# IE3072 module notes (lecture digest)

Source: ../01 - Lectures/*.pptx (7 decks), read completely on 2026-09-21. Use this instead of re-reading the slides.


Module: 13 weeks, mid-term 20% (LO1-2), group assignment 30% (LO1-4), final exam 50%. LO1 evaluate policies vs IT governance; LO2 apply industry standards to policy design/management; LO3 assess the policy development process and consensus of IT + non-IT staff; LO4 recommend a policy and management plan.

### L1 Introduction: policy fundamentals
- Policy is the foundation of an infosec program: cheapest control, hardest to implement. Rules: never conflict with law, must stand up in court, properly supported and administered, contribute to org success, involve end users.
- Hierarchy: Policy (course of action) > Standards (what must be done to comply) > Practices, procedures, guidelines (how employees comply). Defence layers: policies are the first layer, then networks, systems, applications.
- Effective policies must be disseminated, read, understood, agreed-to, and constantly maintained. (SecureShelf: assignment, reader, acknowledgement record, versioning.)
- Three policy types (proposal FR-06 mirrors these): **EISP** enterprise/overall (strategic direction, roles, philosophy); **ISSP** issue-specific (email, internet, malware config, no hacking/testing of controls, home use of company kit, personal devices on company network, telecom, photocopiers; needs frequent updates); **SysSP** system-specific (management guidance + technical specs such as ACLs and config rules).
- EISP components: statement of purpose, IT security elements, need, responsibilities and roles, references to standards; protection of information commensurate with sensitivity; business-use only; handling/access rules; damage disclaimers; legal conflicts reported; exceptions only with risk assessment + owner acceptance + infosec and audit approval; non-enforcement is not consent; prosecute violations of law; right to revoke access; industry standards; policy docs classified Internal Use Only; controls must be enforceable before adoption.
- **ISSP components = the AUP skeleton**: Statement of Purpose; Authorized Access and Usage of Equipment; Prohibited Usage; Systems Management; Violations of Policy; Policy Review and Modification; Limitations of Liability. Modular ISSP approach recommended.

### L2 Data classification
- Classification = consistently categorising data by predefined criteria so it can be protected efficiently; drivers: governance, compliance (PCI, HIPAA, GDPR), IP, simplification. Start with 3 levels (PwC advice); if you do not know what you have you cannot protect it; identify the crown jewels.
- Methods: content-based (fingerprints, regex), user-based (owner judgement), context-based (app, location, creator, who/where/when). Combine them.
- Forrester Define (discovery, classification) > Dissect (intelligence, analytics) > Defend (access, inspect, dispose, kill via encryption). Program steps: exec buy-in, policy, scope, discovery, solutions, analyse, optimise. Four-step loop: discovery, classification, policies, education and enforcement.
- Guideline table Public / Private / Restricted with examples, leak consequences and controls (awareness training, encryption, DLP, threat protection, reporting and auditing). Forrester scorecard dimensions: identifiability, sensitivity, scarcity (H/M/L).

### L3 Classification for compliance (heaviest lecture)
- PII definition (name + SSN / licence / passport / card / account+credential / health insurance). US statutes: GLBA (financial), HIPAA (health), FERPA (students), COPPA (children under 13).
- NIST 800-53 / FISMA: categorise info types Low / Moderate / High impact per C, I, A; system takes the high watermark. High: PHI, SSN, card and account numbers, licence/passport. Moderate: personnel files, salary, birth date, contact info, internal policies, budgets. Low: job postings, public info.
- ISO/IEC 27001: asset inventory + classification, assign owners, acceptable-use procedures; classify > label > handle. Four levels **Public, Internal, Confidential, Restricted** (proposal classification enum; examples: datasheet / helpdesk guide / price list / employee agreements).
- GDPR: personal data definition, DPIA inventory of processing, consider data type, basis, subject categories, recipient categories.
- PCI DSS: cardholder data = PAN + name / service code / expiry / CVV / PIN / mag stripe; classify by type, storage permission, protection level; no CHD outside the defined cardholder environment.
- HIPAA: PHI/ePHI identifier list; 3-level scheme (Restricted, Internal, Public; public data still needs integrity protection).
- Challenges: false positives, false negatives, big data, cost. A classification **policy** must cover objectives with KPIs, workflows, data locations, schema, data owners and their duties, compliance scope.
- **Sri Lanka PDPA No. 9 of 2022** (first in South Asia, certified 19 Mar 2022): personal data = anything identifying a subject directly or indirectly. Data subject rights: access, withdraw consent / object, rectification, erasure, review of solely automated decisions. Public authorities process only in Sri Lanka. Principles: legitimacy (specified, explicit, legitimate purpose), proportionality, accuracy, limited retention, integrity and confidentiality (encryption, pseudonymisation, access control), transparency, accountability (Data Protection Management Programme, records, oversight). DPIA required for profiling, **systematic monitoring of publicly accessible areas** (CCTV), and high-risk processing. Penalty factors: nature/gravity/duration, mitigation, DPMP effectiveness, cooperation, categories affected, self-notification, prior breaches, gains/losses.

### L4 Critical infrastructure protection
- CI = systems whose loss debilitates health, safety, commerce, security; CII = essential comms/information services; CIP = proactive protection of people, assets, cyber systems from all hazards. Stakeholders: government, private sector, academia, defence/intel, IT workers, international bodies; roles: coordinator, owners/operators, law enforcement, sector agencies, CERT, vendors.
- Seven steps: define goals and roles; identify and prioritise critical functions; continuously assess and manage risk; establish and exercise emergency plans (short, actionable, tested); public-private partnerships; build security and resiliency into operations (security development lifecycle); update and innovate (monitor trends, patch, current software). Risk loop: identify functions, assess risks, evaluate consequences, select mitigations by effectiveness, defence in depth, measure and improve.

### L5 SETA and HR security
- HR security lifecycle (ISO 27002 style): **prior** to employment (screening, confidentiality agreements, roles, terms); **during** (management responsibility, awareness/education/training, disciplinary process); **termination/change** (termination duties, return of assets, **removal of access rights**; SecureShelf offboarding and session revocation).
- Control families: management (risk mgmt, control review, lifecycle, C&A, system security plan); operational (personnel, physical, I/O, contingency, HW/SW, data integrity, documentation, SETA, incident response); technical (identification and authentication, logical access control, audit trails).
- SETA follows policy and is a control against accidental breaches; purposes: awareness of need to protect, skills to work securely, in-depth knowledge for designers/operators. May be outsourced.
- **NIST SP 800-12 comparison**: Education = why / insight / understanding / seminars and reading / essay / long-term. Training = how / knowledge / skill / lectures, case studies, hands-on / problem solving / intermediate. Awareness = what / information / videos, newsletters, posters / true-false and multiple choice / short-term. Awareness is the least implemented and most beneficial; without continuous activity staff tune out. (SecureShelf lessons = training layer; MCQ quizzes = awareness measure; role-mapped topics = training needs.)

### L6 HIPAA
- Origin case (anti-depressant samples leak). Rules: Privacy (use/disclosure of PHI by covered entities), Security (admin, technical, physical safeguards for ePHI; CIA; anticipated threats; workforce compliance), Enforcement, Omnibus/HITECH incl. Breach Notification. Covered entities: plans, clearinghouses, providers; business associates need written agreements.
- Terms: TPO (no authorisation needed), Notice of Privacy Practices, authorisation contents (PHI, who, to whom, expiry, purpose; revocable in writing). Patient rights: notice, access/copy, amendment, restriction, accounting of disclosures (respond within 60 days), revoke authorisation. **Minimum necessary standard** (least privilege) except treatment, subject access, authorised, legally required. Case studies: nurse looking up a neighbour, elevator conversation, semi-private room.
- Transfer to SecureShelf: minimum necessary = role-shaped views; accounting of disclosures = audit trail and CCTV access declarations; NPP = monitoring notice.

### L7 PCI standards
- PCI SSC founded 2006 by Amex, Discover, JCB, Mastercard, Visa. Family: PCI DSS (keystone), PA-DSS, P2PE, PTS (PIN transaction security, HSM, POI), 3-D Secure, card production, token service provider, software PIN on COTS.
- Cards in scope: credit, debit, HSA, FSA, payroll. Thieves steal from compromised readers, paper files, payment DBs, **hidden cameras recording PIN entry**, network taps. Secure readers, POS, store networks and wifi, storage/transmission, paper records, online carts; best step: do not store cardholder data.
- 12 requirements in 6 groups: secure network; protect cardholder data; vulnerability management; strong access control; monitor and test; maintain an information security policy.
- Compliance by Level (1: over 6M Visa txns, ROC by QSA + quarterly ASV scans + AOC; 2: 1M to 6M, SAQ; 3: 20k to 1M e-commerce, SAQ; 4: under 20k e-commerce or under 1M total, SAQ recommended) and SAQ Type (A card-not-present outsourced; B imprint/dial-up no storage; C internet-connected payment app no storage; C-VT virtual terminal; D everything else). Marvels is a Level 4 face-to-face merchant, most likely SAQ B or C.

### How the module shapes SecureShelf (use in build, seed content, AUP and demo narrative)
- Policy types and classification enums come straight from L1 and L3 (EISP/ISSP/SysSP; Public/Internal/Confidential/Restricted).
- Acknowledgement records exist because L1 says policies must be disseminated, read, understood and agreed-to; versioning keeps the agreed wording.
- AUP document structure = ISSP components (L1). Include PDPA principles, minimum-necessary access, monitoring proportionality, enforcement and disciplinary process (L5), review cycle.
- Asset register + classification + owners = ISO 27001 requirements (L3); control library seeded from ISO 27001, NIST CSF, PCI DSS 6 groups, PDPA principles.
- CCTV governance: PDPA DPIA trigger for systematic monitoring of public areas, purpose limitation, retention limits, signage/notice, named authorisations; PCI point that cameras must not capture PIN entry.
- Training topics by role (proposal §5.2) map to L5 SETA levels: lessons = training (how), quizzes = awareness (what), manager summaries = training-needs identification. Awareness must be recurring (due dates, overdue status).
- Offboarding removes access rights and revokes sessions (L5 termination), incident reporting supports the disciplinary process, audit trail = accounting of who did what (L5 technical controls, L6 accounting of disclosures).
- Demo talking points: least privilege / minimum necessary, proportionate monitoring, PDPA rights readiness, do not store card data, policy lifecycle with separation of duties, SETA as a control against accidental breach.
