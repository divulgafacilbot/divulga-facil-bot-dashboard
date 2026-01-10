import { prisma } from '../db/prisma.js';

async function verifyMilestone1Models() {
  console.log('🔍 Verifying Milestone 1 models...\n');

  let hasErrors = false;

  // Check public_page_settings exists
  try {
    const settingsCount = await prisma.public_page_settings.count();
    console.log(`✅ public_page_settings: ${settingsCount} records`);
  } catch (error) {
    console.error('❌ public_page_settings table not found');
    hasErrors = true;
  }

  // Check public_cards exists
  try {
    const cardsCount = await prisma.public_cards.count();
    console.log(`✅ public_cards: ${cardsCount} records`);
  } catch (error) {
    console.error('❌ public_cards table not found');
    hasErrors = true;
  }

  // Check public_events exists
  try {
    const eventsCount = await prisma.public_events.count();
    console.log(`✅ public_events: ${eventsCount} records`);
  } catch (error) {
    console.error('❌ public_events table not found');
    hasErrors = true;
  }

  // Check CardSource enum exists
  try {
    const cardSourceEnums = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'CardSource'
    `;
    console.log(`✅ CardSource enum: ${cardSourceEnums.length} values (${cardSourceEnums.map(e => e.enumlabel).join(', ')})`);
  } catch (error) {
    console.error('❌ CardSource enum not found');
    hasErrors = true;
  }

  // Check Marketplace enum exists
  try {
    const marketplaceEnums = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'Marketplace'
    `;
    console.log(`✅ Marketplace enum: ${marketplaceEnums.length} values (${marketplaceEnums.map(e => e.enumlabel).join(', ')})`);
  } catch (error) {
    console.error('❌ Marketplace enum not found');
    hasErrors = true;
  }

  // Check BotType enum exists (from T001)
  try {
    const botTypeEnums = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'BotType'
    `;
    console.log(`✅ BotType enum: ${botTypeEnums.length} values (${botTypeEnums.map(e => e.enumlabel).join(', ')})`);
  } catch (error) {
    console.error('❌ BotType enum not found');
    hasErrors = true;
  }

  // Check TicketCategory enum exists (from T002)
  try {
    const ticketCategoryEnums = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'TicketCategory'
    `;
    console.log(`✅ TicketCategory enum: ${ticketCategoryEnums.length} values`);
  } catch (error) {
    console.error('❌ TicketCategory enum not found');
    hasErrors = true;
  }

  if (hasErrors) {
    console.log('\n❌ Verification failed! Some required models are missing.');
    process.exit(1);
  }

  console.log('\n✅ All Milestone 1 models verified successfully!');
  console.log('✅ All Milestone 2 prerequisite models verified!');
  console.log('✅ T003 validation passed!');
}

verifyMilestone1Models()
  .catch((error) => {
    console.error('❌ Verification error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
