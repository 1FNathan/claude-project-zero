import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './connection.js';
import { users } from './schema.js';

const seedUsers = [
  { username: 'ba_user', password: 'password123', role: 'ba' as const },
  { username: 'reviewer_user', password: 'password123', role: 'reviewer' as const },
];

for (const u of seedUsers) {
  const passwordHash = await bcrypt.hash(u.password, 10);
  await db
    .insert(users)
    .values({ id: randomUUID(), username: u.username, passwordHash, role: u.role, createdAt: Date.now() })
    .onConflictDoNothing();
  console.log(`Seeded: ${u.username} (${u.role})`);
}

console.log('Seed complete. Credentials: username / password123');
process.exit(0);
