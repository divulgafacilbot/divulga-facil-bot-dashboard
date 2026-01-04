import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/db/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TemplateFile {
  name: string;
  feedPath: string;
  storyPath: string;
  category: string;
}

const categorizeTemplate = (templateName: string): string => {
  const lowerName = templateName.toLowerCase();

  if (lowerName.startsWith('amazon')) return 'Amazon';
  if (lowerName.startsWith('shopee')) return 'Shopee';
  if (lowerName.startsWith('meli')) return 'Mercado Livre';
  if (lowerName.startsWith('magalu')) return 'Magalu';
  if (lowerName.startsWith('black')) return 'Datas especiais';
  if (lowerName.startsWith('promo')) return 'Datas especiais';

  return 'Diversos';
};

const formatTemplateName = (filename: string): string => {
  const name = filename.replace(/-feed\.png|-story\.png/g, '');

  const formatted = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return formatted;
};

async function migrateTemplates() {
  console.log('🚀 Starting template migration...\n');

  const templatesDir = path.join(__dirname, '../../web/public/templates');

  if (!fs.existsSync(templatesDir)) {
    console.error(`❌ Templates directory not found: ${templatesDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(templatesDir);
  const feedFiles = files.filter(f => f.endsWith('-feed.png'));

  const templates: TemplateFile[] = [];

  for (const feedFile of feedFiles) {
    const baseName = feedFile.replace('-feed.png', '');
    const storyFile = `${baseName}-story.png`;

    if (!files.includes(storyFile)) {
      console.warn(`⚠️  Missing story file for ${feedFile}, skipping...`);
      continue;
    }

    const category = categorizeTemplate(baseName);
    const name = formatTemplateName(feedFile);

    templates.push({
      name,
      feedPath: `/templates/${feedFile}`,
      storyPath: `/templates/${storyFile}`,
      category,
    });
  }

  console.log(`📊 Found ${templates.length} template pairs to migrate\n`);

  let imported = 0;
  let skipped = 0;

  for (const template of templates) {
    try {
      const existing = await prisma.templates.findFirst({
        where: {
          name: template.name,
          owner_user_id: null,
        },
      });

      if (existing) {
        console.log(`⏭️  Skipping existing template: ${template.name}`);
        skipped++;
        continue;
      }

      await prisma.templates.create({
        data: {
          name: template.name,
          story_image: template.storyPath,
          feed_image: template.feedPath,
          category: template.category,
          owner_user_id: null,
          is_active: true,
        },
      });

      console.log(`✅ Imported: ${template.name} (${template.category})`);
      imported++;
    } catch (error) {
      console.error(`❌ Error importing ${template.name}:`, error);
    }
  }

  console.log('\n📈 Migration Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📦 Total: ${templates.length}\n`);

  const categoryCounts = await prisma.templates.groupBy({
    by: ['category'],
    where: { owner_user_id: null },
    _count: true,
  });

  console.log('📊 Templates by Category:');
  categoryCounts.forEach(({ category, _count }) => {
    console.log(`   ${category}: ${_count}`);
  });

  await prisma.$disconnect();
  console.log('\n✅ Migration completed successfully!');
}

migrateTemplates().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
