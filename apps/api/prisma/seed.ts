import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { KiwifyMockGenerator } from './seeds/kiwify-mock-generator.js';
import * as dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import { subDays } from 'date-fns';
import { BOT_TYPES } from '../src/constants/bot-types.js';

// Load environment variables
dotenv.config();

// Initialize Prisma Client with adapter (same as src/db/prisma.ts)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

/**
 * Seed the initial ADMIN_MASTER user from .env credentials
 */
async function seedInitialAdmin() {
  console.log('\n📋 Seeding initial admin user...');

  const email = process.env.ADMIN_LOGIN_EMAIL;
  const password = process.env.ADMIN_LOGIN_PASSWORD;

  if (!email || !password) {
    throw new Error('❌ ADMIN_LOGIN_EMAIL and ADMIN_LOGIN_PASSWORD must be set in .env');
  }

  // Check if admin already exists
  const existing = await prisma.admin_users.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('✓ Initial admin user already exists');
    return existing.id;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create admin user
  const admin = await prisma.admin_users.create({
    data: {
      name: 'Admin Master',
      email,
      password_hash: passwordHash,
      role: 'ADMIN_MASTER',
      is_active: true,
    },
  });

  // Grant all permissions
  const permissions = [
    'overview', 'users', 'bots', 'usage', 'templates',
    'campaigns', 'support', 'finance', 'permissions'
  ];

  await prisma.admin_permissions.createMany({
    data: permissions.map(permission => ({
      admin_user_id: admin.id,
      permission_key: permission,
    })),
  });

  console.log('✓ Initial admin user created successfully');
  console.log(`  Email: ${email}`);
  console.log(`  Role: ADMIN_MASTER`);
  console.log(`  Permissions: ALL (${permissions.length})`);

  return admin.id;
}

/**
 * Seed mock Kiwify data for development and testing
 */
async function seedKiwifyMockData() {
  console.log('\n📊 Generating Kiwify mock data...');

  // Get or create a test user to link payments to
  let testUser = await prisma.user.findFirst({
    where: { role: 'USER' }
  });

  if (!testUser) {
    console.log('Creating test user for mock payments...');
    const passwordHash = await bcrypt.hash('testpass123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'test.payments@divulgafacil.com',
        passwordHash,
        role: 'USER',
        isActive: true,
        emailVerified: true,
      },
    });
  }

  const generator = new KiwifyMockGenerator();
  const { events, payments } = generator.generate();

  console.log(`Generated ${events.length} Kiwify events and ${payments.length} payments`);

  console.log('Cleaning previous Kiwify mock data...');
  await prisma.kiwify_events.deleteMany({});
  await prisma.payments.deleteMany({ where: { provider: 'kiwify' } });

  // Insert Kiwify events in batches
  console.log('Inserting Kiwify events...');
  const eventBatchSize = 100;
  for (let i = 0; i < events.length; i += eventBatchSize) {
    const batch = events.slice(i, i + eventBatchSize);
    await prisma.kiwify_events.createMany({
      data: batch.map(event => ({
        event_id: event.eventId,
        event_type: event.type,
        payload: event.payload,
        received_at: event.receivedAt,
      })),
      skipDuplicates: true,
    });
    console.log(`  Progress: ${Math.min(i + eventBatchSize, events.length)}/${events.length} events`);
  }

  // Insert payments in batches (all linked to the test user)
  console.log('Inserting payments...');
  const paymentBatchSize = 100;
  for (let i = 0; i < payments.length; i += paymentBatchSize) {
    const batch = payments.slice(i, i + paymentBatchSize);
    await prisma.payments.createMany({
      data: batch.map(payment => ({
        user_id: testUser!.id, // Use test user for all mock payments
        provider: payment.provider,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        transaction_id: payment.transactionId,
        paid_at: payment.paidAt,
        created_at: payment.createdAt,
      })),
      skipDuplicates: true,
    });
    console.log(`  Progress: ${Math.min(i + paymentBatchSize, payments.length)}/${payments.length} payments`);
  }

  console.log('✓ Kiwify mock data seeded successfully');
  console.log(`  Events: ${events.length}`);
  console.log(`  Payments: ${payments.length}`);
  console.log(`  Date range: Last 90 days`);
  console.log(`  Note: ~10% intentional discrepancies included for testing`);
}

async function seedTelemetryMockData() {
  console.log('\n📈 Generating telemetry mock data for bots...');

  const testUser = await prisma.user.findFirst({
    where: { role: 'USER' },
  });

  if (!testUser) {
    console.log('No user found for telemetry mock data. Skipping.');
    return;
  }

  await prisma.telemetry_events.deleteMany({
    where: {
      event_type: {
        in: ['ART_GENERATED', 'DOWNLOAD_COMPLETED'],
      },
    },
  });

  const marketplaces = ['MERCADO_LIVRE', 'MAGALU', 'SHOPEE', 'AMAZON'] as const;
  const platforms = ['INSTAGRAM', 'TIKTOK', 'PINTEREST', 'YOUTUBE'] as const;
  const mediaTypes = ['video', 'image'] as const;

  const events: Array<{
    event_type: string;
    user_id: string;
    origin: string;
    metadata: Record<string, unknown>;
    created_at: Date;
  }> = [];

  const now = new Date();
  for (let day = 0; day < 30; day += 1) {
    const date = subDays(now, day);

    const artsCount = faker.number.int({ min: 2, max: 6 });
    for (let i = 0; i < artsCount; i += 1) {
      events.push({
        event_type: 'ART_GENERATED',
        user_id: testUser.id,
        origin: 'seed',
        metadata: {
          marketplace: faker.helpers.arrayElement(marketplaces),
          format: faker.helpers.arrayElement(['feed', 'story']),
        },
        created_at: date,
      });
    }

    const downloadCount = faker.number.int({ min: 1, max: 4 });
    for (let i = 0; i < downloadCount; i += 1) {
      events.push({
        event_type: 'DOWNLOAD_COMPLETED',
        user_id: testUser.id,
        origin: 'seed',
        metadata: {
          platform: faker.helpers.arrayElement(platforms),
          mediaType: faker.helpers.arrayElement(mediaTypes),
        },
        created_at: date,
      });
    }
  }

  const batchSize = 200;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    await prisma.telemetry_events.createMany({
      data: batch,
    });
  }

  console.log(`✓ Telemetry mock data seeded (${events.length} events)`);
}

async function seedAdminBotLinks() {
  console.log('\n🤖 Generating mock bot links...');

  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true },
    take: 10,
  });

  if (!users.length) {
    console.log('No users found for bot links. Skipping.');
    return;
  }

  await prisma.telegram_bot_links.deleteMany({});

  const now = new Date();
  const links = users.flatMap((user) => {
    return [BOT_TYPES.ARTS, BOT_TYPES.DOWNLOAD].map((botType) => ({
      user_id: user.id,
      bot_type: botType,
      telegram_user_id: faker.string.numeric(9),
      chat_id: faker.string.numeric(10),
      linked_at: subDays(now, faker.number.int({ min: 0, max: 29 })),
    }));
  });

  await prisma.telegram_bot_links.createMany({
    data: links,
    skipDuplicates: true,
  });

  console.log(`✓ Bot links seeded (${links.length} links)`);
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Seed initial admin user
    await seedInitialAdmin();

    // Seed Kiwify mock data
    await seedKiwifyMockData();

    // Seed telemetry mock data
    await seedTelemetryMockData();

    // Seed bot links for admin charts
    await seedAdminBotLinks();

    console.log('\n✅ Database seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
