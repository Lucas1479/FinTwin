import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/userModel.js';

dotenv.config();

const DEFAULT_USER = {
  name: 'Test User',
  email: 'Lullaby147@demo.com',
  password: '123456',
};

const seedUser = async () => {
  await connectDB();

  const existing = await User.findOne({ email: DEFAULT_USER.email });
  if (existing) {
    console.log(`User ${DEFAULT_USER.email} already exists (id=${existing._id}).`);
    process.exit(0);
  }

  const created = await User.create(DEFAULT_USER);
  console.log(`Created ${created.email} with id ${created._id}.`);
  process.exit(0);
};

seedUser().catch((err) => {
  console.error('Failed to seed test user:', err);
  process.exit(1);
});

