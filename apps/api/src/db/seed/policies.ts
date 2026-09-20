import type { Classification, PolicyType, Role } from '@secureshelf/shared';

// Fictional starting policies for the Marvels demo. Wording follows the ISSP skeleton from
// lecture 1 (purpose, authorised use, prohibited use, systems management, violations, review).
// Teammate B replaces or extends the text; the lifecycle states below are what the demo needs
// on screen: something live and acknowledged, something awaiting approval, something approved
// but unpublished, and a draft revision in progress.

export type SeedPolicy = {
  title: string;
  type: PolicyType;
  classification: Classification;
  content: string;
  // Lifecycle state to leave version 1 in, plus who acknowledges when published.
  state: 'draft' | 'review' | 'approved' | 'published';
  roles?: Role[];
  acknowledgedBy?: string[]; // seed emails
  // Optional second version left as a draft (proves versioning on the register).
  revision?: { content: string; changeNote: string };
};

const ACCEPTABLE_USE = `# Acceptable Use Policy

## 1. Purpose
This policy sets out how Marvels staff may use the shop's computers, tills, network, email and business information. It protects customers, staff and the business, and supports our duties under the Personal Data Protection Act No. 9 of 2022.

## 2. Authorised access and use
- Use Marvels systems for Marvels work only. Occasional personal use of the office computer is allowed during breaks if it does not interfere with work or breach this policy.
- Sign in with your own account only. Never share your password or leave a till signed in unattended.
- Access only the information you need for your role (minimum necessary).

## 3. Prohibited use
- Do not connect personal phones, laptops or USB storage to the till network.
- Do not install software or browser extensions on any Marvels computer.
- Do not copy customer, supplier or staff information to personal devices, email or chat apps.
- Do not attempt to bypass security controls, test for weaknesses or view CCTV without written authorisation.

## 4. Systems management
The Security Administrator maintains user accounts, updates and backups. The Owner approves every policy before it is published. Staff report faults and suspicious activity through the Incidents page.

## 5. Violations
Breaches are handled under the staff disciplinary process. Serious breaches, including deliberate misuse of customer data, may lead to dismissal and referral to the authorities.

## 6. Review
Reviewed every 12 months, or sooner after a security incident or a change in the law.`;

const ACCEPTABLE_USE_V2 = `${ACCEPTABLE_USE}

## 7. Clean desk and screen lock
Lock your screen (Windows key + L) whenever you step away from a computer. Keep printed customer or supplier records in the locked cabinet when not in use.`;

const PASSWORD_ACCOUNT = `# Password and Account Policy

## 1. Purpose
Weak or shared passwords are the easiest way into a small business. This policy sets the rules for every SecureShelf, till and email account at Marvels.

## 2. Rules for everyone
- Passwords are at least 12 characters and are not reused from any other site.
- Passwords are never written on notes, shared with colleagues or sent by message.
- Five wrong attempts lock the account. Only the Owner or Security Administrator can unlock it after confirming who you are.
- The Owner and Security Administrator must use an authenticator app as a second factor.

## 3. Account lifecycle
- New starters get an account on their first day and must change the temporary password immediately.
- When someone changes role, their old access is removed on the same day.
- When someone leaves, the Security Administrator offboards the account before the end of their last shift. Offboarded accounts are never reactivated.

## 4. Violations
Sharing a password is treated as a policy breach under the disciplinary process, even if no harm resulted.

## 5. Review
Reviewed every 12 months.`;

const CCTV_MONITORING = `# CCTV and Monitoring Policy

## 1. Purpose
Marvels uses CCTV to protect staff, customers and stock. Monitoring must be proportionate, transparent and lawful. Systematic monitoring of areas open to the public is a high-risk processing activity under the Personal Data Protection Act, so this policy and its impact assessment are reviewed annually.

## 2. What is monitored
- Cameras cover the shop floor, tills, stock room and entrances. Cameras never cover toilets, changing areas or the staff rest area.
- Cameras are positioned so that PIN entry on card terminals is not recorded.
- Footage is kept for 30 days unless it is needed for an incident, then deleted.

## 3. Who may view or export footage
- Only staff named on a current authorisation for that camera may view live or recorded footage.
- Every viewing or export is recorded in SecureShelf as a manual governance record stating the camera, reason and time.
- Footage is shared outside Marvels only with the police or an insurer, with the Owner's written approval.

## 4. What Marvels does not do
Marvels does not read private messages, log keystrokes, capture screens or track the location of staff.

## 5. Staff notice
All staff receive a monitoring notice on first sign-in and must acknowledge it. Signage at each entrance tells customers that CCTV is in use.

## 6. Review
Reviewed every 12 months and after any complaint about monitoring.`;

const CUSTOMER_DATA = `# Customer Data Handling Policy

## 1. Purpose
Customer names, phone numbers, addresses, invoices and loyalty details are personal data. Marvels must collect only what it needs, use it only for the reason it was collected, keep it accurate and secure, and delete it when it is no longer needed.

## 2. At the till
- Collect a customer's contact details only when the customer asks for delivery, a warranty or an invoice.
- Never write down or store full card numbers, expiry dates or security codes. The card terminal handles payment; Marvels does not keep cardholder data.
- Do not read customer details aloud where other customers can hear them.

## 3. Storage and sharing
- Customer records live in the billing system only. Do not copy them into spreadsheets, phones or chat apps.
- Share customer details with a courier or supplier only for the specific order, and only the details that order needs.

## 4. Customer requests
If a customer asks to see, correct or delete their details, tell the Manager the same day. Requests are answered within 21 days.

## 5. Violations
Misuse of customer data is a serious breach and may be reported to the Data Protection Authority.

## 6. Review
Reviewed every 12 months or after any change to the billing system.`;

export const seedPolicies: SeedPolicy[] = [
  {
    title: 'Acceptable Use Policy',
    type: 'issue_specific',
    classification: 'internal',
    content: ACCEPTABLE_USE,
    state: 'published',
    roles: ['owner', 'security_admin', 'manager', 'cashier', 'stock_staff'],
    acknowledgedBy: ['owner@marvels.example', 'secadmin@marvels.example', 'manager@marvels.example', 'cashier1@marvels.example', 'stock1@marvels.example'],
    revision: { content: ACCEPTABLE_USE_V2, changeNote: 'Added clean desk and screen lock section after the stock room incident' },
  },
  {
    title: 'Password and Account Policy',
    type: 'issue_specific',
    classification: 'internal',
    content: PASSWORD_ACCOUNT,
    state: 'published',
    roles: ['owner', 'security_admin', 'manager', 'cashier', 'stock_staff'],
    acknowledgedBy: ['owner@marvels.example', 'secadmin@marvels.example', 'manager@marvels.example', 'cashier1@marvels.example', 'stock1@marvels.example', 'stock2@marvels.example'],
  },
  {
    title: 'CCTV and Monitoring Policy',
    type: 'system_specific',
    classification: 'confidential',
    content: CCTV_MONITORING,
    state: 'review',
  },
  {
    title: 'Customer Data Handling Policy',
    type: 'issue_specific',
    classification: 'internal',
    content: CUSTOMER_DATA,
    state: 'approved',
  },
];
