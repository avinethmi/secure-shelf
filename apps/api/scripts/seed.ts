// Seeds fictional demo data through the same code paths the app uses, so every seeded
// change also produces a valid audit chain. Idempotent: skips users that already exist.
// Usage: npm run db:seed
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import { users, policies } from '../src/db/schema/index.js';
import { hashPassword, encryptField } from '../src/lib/crypto.js';
import { withTx } from '../src/lib/tx.js';
import { audit } from '../src/lib/audit.js';
import { seedUsers, DEMO_PASSWORD } from '../src/db/seed/users.js';
import { seedPolicies } from '../src/db/seed/policies.js';
import * as policySvc from '../src/modules/policies/service.js';

console.log('Seeding users ...');
const passwordHash = await hashPassword(DEMO_PASSWORD);
let created = 0;
for (const u of seedUsers) {
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1);
  if (exists) continue;
  await withTx(async (tx) => {
    const [row] = await tx
      .insert(users)
      .values({
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        jobTitle: u.jobTitle,
        passwordHash,
        nicEnc: encryptField(u.nic),
        phoneEnc: encryptField(u.phone),
        contactEnc: encryptField(u.contact),
      })
      .returning({ id: users.id });
    await audit(tx, { actor: null, action: 'seed.user_create', entity: 'user', entityId: row!.id, details: { email: u.email, role: u.role } });
  });
  created++;
}
console.log(`Users: ${created} created, ${seedUsers.length - created} already present.`);
console.log(`Demo password for every account: ${DEMO_PASSWORD}`);

// Policies go through the real lifecycle service (Security Admin drafts, Owner approves,
// Security Admin publishes, staff acknowledge), so the register, the timestamps and the audit
// chain all look exactly as they would after a real week of use. Skipped if any policy exists.
const [anyPolicy] = await db.select({ id: policies.id }).from(policies).limit(1);
if (anyPolicy) {
  console.log('Policies: already present, skipped.');
} else {
  console.log('Seeding policies ...');
  const byEmail = new Map((await db.select({ id: users.id, email: users.email, role: users.role }).from(users)).map((u) => [u.email, { id: u.id, role: u.role }]));
  const sa = byEmail.get('secadmin@marvels.example')!;
  const owner = byEmail.get('owner@marvels.example')!;
  const meta = { ip: null };
  for (const p of seedPolicies) {
    const { policy, version } = await policySvc.createPolicy({ title: p.title, type: p.type, classification: p.classification, content: p.content, changeNote: 'Initial draft' }, sa, meta);
    if (p.state === 'draft') continue;
    await policySvc.submitVersion(version.id, sa, meta);
    if (p.state === 'review') continue;
    await policySvc.approveVersion(version.id, undefined, owner, meta);
    if (p.state === 'approved') continue;
    await policySvc.publishVersion(version.id, p.roles ?? [], sa, meta);
    for (const email of p.acknowledgedBy ?? []) {
      const u = byEmail.get(email);
      if (u) await policySvc.acknowledgeVersion(version.id, u, meta);
    }
    if (p.revision) await policySvc.createVersion(policy.id, { title: p.title, content: p.revision.content, changeNote: p.revision.changeNote }, sa, meta);
  }
  console.log(`Policies: ${seedPolicies.length} created.`);
}

await pool.end();
