console.log('=== TOGGLE BOTS SCRIPT ===');
import dotenv from 'dotenv';
dotenv.config();

import { botDb } from '../database/bot-db';
import { RejimdeAPIClient } from '../utils/api-client';
import { logger } from '../utils/logger';

interface WordPressResponse {
  status?:  string;
  message?: string;
  affected_count?: number;
}

async function toggleBots() {
  const args = process.argv. slice(2);
  
  // Kullanım bilgisi
  if (args.includes('--help') || args.length === 0) {
    console.log(`
📋 Bot Toggle Kullanımı: 

  npm run toggle-bots -- --all --active       # Tüm botları aktif et
  npm run toggle-bots -- --all --inactive     # Tüm botları pasif et
  npm run toggle-bots -- --batch=BATCH_ID --active
  npm run toggle-bots -- --batch=BATCH_ID --inactive
  npm run toggle-bots -- --sync               # WordPress ile senkronize et
  npm run toggle-bots -- --stats              # İstatistikleri göster
    `);
    return;
  }

  // Stats
  if (args.includes('--stats')) {
    const stats = botDb.getStats();
    console.log('\n📊 Bot İstatistikleri: ');
    console.log('========================');
    console.log(`  Toplam:  ${stats.total}`);
    console.log(`  Aktif:   ${stats.active}`);
    console.log(`  Pasif:  ${stats.total - stats.active}`);
    console.log('\n📋 Persona Dağılımı:');
    Object.entries(stats. byPersona).forEach(([persona, count]) => {
      console.log(`  ${persona}: ${count}`);
    });
    console.log('\n📦 Batch Dağılımı:');
    Object.entries(stats.byBatch).forEach(([batch, count]) => {
      console.log(`  ${batch}: ${count}`);
    });
    return;
  }

  const isActive = args.includes('--active');
  const isInactive = args.includes('--inactive');
  
  if (! isActive && !isInactive) {
    logger.error('--active veya --inactive belirtmelisiniz');
    return;
  }

  const active = isActive;

  // Tüm botlar
  if (args.includes('--all')) {
    const affected = botDb.toggleAllBots(active);
    logger.info(`✅ ${affected} bot ${active ? 'aktif' : 'pasif'} edildi`);
    
    // WordPress'e de sync et
    if (args.includes('--sync')) {
      await syncToWordPress(active);
    }
    return;
  }

  // Belirli batch
  const batchArg = args.find(a => a.startsWith('--batch='));
  if (batchArg) {
    const batchId = batchArg.split('=')[1];
    const affected = botDb.toggleBatchBots(batchId, active);
    logger.info(`✅ Batch "${batchId}": ${affected} bot ${active ? 'aktif' : 'pasif'} edildi`);
    
    if (args.includes('--sync')) {
      await syncToWordPress(active, batchId);
    }
    return;
  }

  logger.error('--all veya --batch=BATCH_ID belirtmelisiniz');
}

async function syncToWordPress(active: boolean, batchId?: string): Promise<void> {
  logger.info('🔄 WordPress ile senkronize ediliyor...');
  
  const adminUsername = process.env. WP_ADMIN_USERNAME;
  const adminPassword = process.env.WP_ADMIN_PASSWORD;
  
  if (!adminUsername || !adminPassword) {
    logger. warn('⚠️ WP_ADMIN_USERNAME ve WP_ADMIN_PASSWORD env değişkenleri gerekli');
    return;
  }

  const client = new RejimdeAPIClient();
  const loginResult = await client.login(adminUsername, adminPassword);
  
  if (loginResult.status !== 'success' || !loginResult. data?. token) {
    logger.error('Admin login başarısız');
    return;
  }

  try {
    if (batchId) {
      const response = await fetch(`${process.env. REJIMDE_API_URL}/rejimde/v1/admin/bots/toggle-batch/${batchId}`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginResult. data.token}`,
        },
        body: JSON. stringify({ active }),
      });
      
      const result = await response.json() as WordPressResponse;
      logger.info(`WordPress sync:  ${result.message || 'Tamamlandı'}`);
    } else {
      const result = await client.toggleAllBots(active);
      logger.info(`WordPress sync: ${result.message || 'Tamamlandı'}`);
    }
  } catch (error:  any) {
    logger.error(`WordPress sync hatası: ${error. message}`);
  }
}

toggleBots().catch(console.error);