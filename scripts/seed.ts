import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
  });
  await dataSource.initialize();

  const demoUsers = [
    { email: 'superadmin@willpower.org', password: 'superadmin123', role: 'superadmin', firstName: 'Super', lastName: 'Admin' },
    { email: 'admin@willpower.org', password: 'admin123', role: 'admin', firstName: 'Branch', lastName: 'Admin' },
    { email: 'instructor@willpower.org', password: 'instructor123', role: 'instructor', firstName: 'Ajahn', lastName: 'Suriya' },
  ];

  for (const u of demoUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await dataSource.query(
      `INSERT INTO users (role, first_name, last_name, email, password_hash, status, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, 'active', now())
       ON CONFLICT (email) WHERE deleted_at IS NULL
       DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
      [u.role, u.firstName, u.lastName, u.email, passwordHash],
    );
    console.log(`Seeded user ${u.email}`);
  }

  const demoBranches = [
    { name: 'United States', code: 'USA', city: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles' },
    { name: 'Canada', code: 'CANADA', city: 'Toronto', country: 'Canada', timezone: 'America/Toronto' },
    { name: 'Australia', code: 'AUSTRLA', city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney' },
  ];

  for (const b of demoBranches) {
    await dataSource.query(
      `INSERT INTO branches (name, code, city, country, timezone, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT (code) DO NOTHING`,
      [b.name, b.code, b.city, b.country, b.timezone],
    );
    console.log(`Seeded branch ${b.name}`);
  }

  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
