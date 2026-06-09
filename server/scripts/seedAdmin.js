import { env } from '../src/config/env.js';
import { ensureSeedAdminUser } from '../src/admin/services/adminSeedService.js';
import { connectToDatabase } from '../src/config/db.js';
import { findAdminUserByEmail } from '../src/admin/repositories/adminUsersRepository.js';

async function seedAdmin() {
  await connectToDatabase();
  const shouldResetPassword = process.argv.includes('--reset-password');

  const existingAdmin = await findAdminUserByEmail(env.adminSeedEmail);

  if (existingAdmin) {
    if (!shouldResetPassword) {
      console.log(`Admin user already exists for ${env.adminSeedEmail}`);
      console.log('Use "npm run seed:admin -- --reset-password" to sync the password from .env.');
      return;
    }

    const updatedAdmin = await ensureSeedAdminUser({ syncPassword: true, clearLock: true });

    console.log(`Reset admin credentials for ${updatedAdmin.email}`);
    return;
  }

  const adminUser = await ensureSeedAdminUser({ syncPassword: true, clearLock: true });

  console.log(`Seeded admin user ${adminUser.email}`);
}

seedAdmin().catch((error) => {
  console.error('Failed to seed admin user:', error);
  process.exit(1);
});
