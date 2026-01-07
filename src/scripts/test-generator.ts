import dotenv from 'dotenv';
dotenv. config();

import { generateBotUser } from '../generators/user-generator';
import { PERSONA_CONFIGS, getTotalBotCount } from '../config/personas.config';
import { logger } from '../utils/logger';
import { PersonaType } from '../types';

async function testGenerator() {
  logger.info('🧪 User Generator Testi Başlıyor...');
  console.log('');

  // Test 1: Tek kullanıcı oluştur
  logger.info('Test 1: Örnek kullanıcı oluşturuluyor.. .');
  const testUser = generateBotUser({
    persona:  'active',
    batchId: 'test_batch',
    index: 0,
  });

  console.log('');
  console.log('📋 Oluşturulan Kullanıcı: ');
  console.log('------------------------');
  console.log(`👤 İsim: ${testUser.name}`);
  console.log(`📧 Email: ${testUser.email}`);
  console.log(`🔑 Username: ${testUser.username}`);
  console.log(`🔒 Password: ${testUser.password}`);
  console.log(`👫 Cinsiyet: ${testUser.gender}`);
  console.log(`🎂 Doğum:  ${testUser.birth_date}`);
  console.log(`📏 Boy: ${testUser. height} cm`);
  console.log(`⚖️ Kilo: ${testUser. current_weight} kg`);
  console.log(`🎯 Hedef Kilo: ${testUser.target_weight} kg`);
  console.log(`🏃 Hedef: ${testUser. goal}`);
  console.log(`💪 Aktivite: ${testUser.activity_level}`);
  console.log(`📍 Şehir: ${testUser.location}`);
  console.log(`📝 Bio: ${testUser.description}`);
  console.log(`🖼️ Avatar: ${testUser.avatar_url}`);
  console.log(`🤖 Persona: ${testUser.simulation_persona}`);
  console.log('');

  // Test 2: Persona dağılımı
  logger.info('Test 2: Persona Dağılımı');
  console.log('');
  console.log('📊 Persona Dağılımı (1000 kullanıcı):');
  console.log('------------------------------------');

  let total = 0;
  for (const [persona, config] of Object.entries(PERSONA_CONFIGS)) {
    const percent = ((config.count / 1000) * 100).toFixed(1);
    const aiTag = config.ai_enabled ?  ' 🤖 AI' : '';
    console.log(`  ${persona}:  ${config.count} kullanıcı (${percent}%)${aiTag}`);
    total += config.count;
  }
  console.log('------------------------------------');
  console.log(`  TOPLAM: ${total} kullanıcı`);
  console.log('');

  // Test 3: Toplam hesaplama
  logger.info('Test 3: Toplam Bot Sayısı');
  const calculatedTotal = getTotalBotCount();
  console.log(`Hesaplanan toplam: ${calculatedTotal}`);

  if (calculatedTotal === 1000) {
    logger.success('✅ Toplam doğru: 1000 kullanıcı');
  } else {
    logger.warn(`⚠️ Toplam 1000 değil:  ${calculatedTotal}`);
  }
  console.log('');

  // Test 4: 5 örnek kullanıcı daha
  logger.info('Test 4: 5 Farklı Örnek Kullanıcı');
  console.log('');

  const personas:  PersonaType[] = ['super_active', 'normal', 'dormant', 'diet_focused', 'exercise_focused'];

  for (const persona of personas) {
    const user = generateBotUser({ persona, batchId: 'test', index: 0 });
    console.log(`[${persona}] ${user.name} (${user.username}) - ${user.goal} - ${user.location}`);
  }

  console.log('');
  logger.success('🎉 Generator testi tamamlandı!');
}

testGenerator().catch(console.error);