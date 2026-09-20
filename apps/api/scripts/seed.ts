// Seeds fictional demo data through the same code paths the app uses, so every seeded
// change also produces a valid audit chain. Idempotent: skips users that already exist.
// Usage: npm run db:seed
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import { users } from '../src/db/schema/index.js';
import { hashPassword, encryptField } from '../src/lib/crypto.js';
import { withTx } from '../src/lib/tx.js';
import { audit } from '../src/lib/audit.js';
import { seedUsers, DEMO_PASSWORD } from '../src/db/seed/users.js';

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

await pool.end();
