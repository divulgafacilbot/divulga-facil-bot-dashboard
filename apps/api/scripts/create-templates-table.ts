import { prisma } from '../src/db/prisma.js';

async function createTemplatesTable() {
  console.log('🚀 Creating templates table...\n');

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        story_image VARCHAR(500) NOT NULL,
        feed_image VARCHAR(500) NOT NULL,
        category VARCHAR(100) NOT NULL,
        owner_user_id UUID,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      );
    `);

    console.log('✅ Table created successfully!');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_templates_owner_user_id ON templates(owner_user_id);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);
    `);

    console.log('✅ Indexes created successfully!');

    await prisma.$disconnect();
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTemplatesTable();
