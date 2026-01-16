import { prisma } from './src/db/prisma.js';

async function verifyBotTypeEnum() {
  try {
    console.log('🔍 Verifying BotType enum...\n');

    // Query enum values from PostgreSQL
    const enumValues = await prisma.$queryRaw<Array<{ enum_name: string; enum_value: string }>>`
      SELECT
        t.typname AS enum_name,
        e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'BotType'
      ORDER BY e.enumsortorder
    `;

    console.log('✅ BotType enum exists in database');
    console.log(`✅ Found ${enumValues.length} enum values:\n`);

    enumValues.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.enum_value}`);
    });

    // Verify expected values
    const expectedValues = ['PROMOCOES', 'DOWNLOAD', 'PINTEREST', 'SUGGESTION'];
    const actualValues = enumValues.map(v => v.enum_value);

    const allPresent = expectedValues.every(expected => actualValues.includes(expected));

    if (allPresent && enumValues.length === 4) {
      console.log('\n✅ All expected values present!');
      console.log('✅ T001 validation passed!');
    } else {
      console.log('\n❌ Validation failed!');
      console.log(`Expected: ${expectedValues.join(', ')}`);
      console.log(`Actual: ${actualValues.join(', ')}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error verifying enum:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBotTypeEnum();
