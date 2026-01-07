console.log('=== BOT REPORT ===\n');
import dotenv from 'dotenv';
dotenv.config();

import { botDb } from '../database/bot-db';
import { PERSONA_CONFIGS } from '../config/personas.config';
import { LocalBot } from '../types';

function generateReport(): void {
  const stats = botDb.getStats();
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    🤖 REJIMDE BOT RAPORU                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  📊 Toplam Bot:        ${String(stats.total).padStart(5)}                                 ║`);
  console.log(`║  ✅ Aktif Bot:        ${String(stats. active).padStart(5)}                                 ║`);
  console.log(`║  ⏸️  Pasif Bot:        ${String(stats. total - stats.active).padStart(5)}                                 ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  // Persona dağılımı
  console.log('║                    📋 PERSONA DAĞILIMI                        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  Object.entries(PERSONA_CONFIGS).forEach(([persona, config]) => {
    const count = stats. byPersona[persona] || 0;
    const percentage = stats.total > 0 ?  ((count / stats.total) * 100).toFixed(1) : '0.0';
    const bar = '█'.repeat(Math.min(20, Math.floor(count / (stats.total / 20) || 0)));
    const aiLabel = config.aiEnabled ? '🤖' : '  ';
    console.log(`║  ${aiLabel} ${config.name. padEnd(16)} ${String(count).padStart(4)} (${percentage. padStart(5)}%) ${bar. padEnd(20)} ║`);
  });
  
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  // Cinsiyet dağılımı
  const genderStats = botDb. getGenderStats();
  console.log('║                    👥 CİNSİYET DAĞILIMI                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  const malePercent = stats.total > 0 ?  ((genderStats. male / stats.total) * 100).toFixed(1) : '0.0';
  const femalePercent = stats.total > 0 ? ((genderStats.female / stats.total) * 100).toFixed(1) : '0.0';
  console.log(`║  👨 Erkek:            ${String(genderStats.male).padStart(5)} (${malePercent. padStart(5)}%)                        ║`);
  console.log(`║  👩 Kadın:             ${String(genderStats.female).padStart(5)} (${femalePercent.padStart(5)}%)                        ║`);
  
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  // Hedef dağılımı
  const goalStats = botDb.getGoalStats();
  console.log('║                    🎯 HEDEF DAĞILIMI                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  const goalLabels:  Record<string, string> = {
    'weight_loss': '⚖️  Kilo Verme',
    'muscle_gain': '💪 Kas Yapma',
    'healthy_living': '🌿 Sağlıklı Yaşam'
  };
  Object.entries(goalStats).forEach(([goal, count]) => {
    const percentage = stats. total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0.0';
    const label = goalLabels[goal] || goal;
    console. log(`║  ${label.padEnd(20)} ${String(count).padStart(5)} (${percentage.padStart(5)}%)                   ║`);
  });
  
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  // Aktivite seviyesi dağılımı
  const activityStats = botDb.getActivityLevelStats();
  console.log('║                 🏃 AKTİVİTE SEVİYESİ DAĞILIMI                 ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  const activityLabels: Record<string, string> = {
    'sedentary': '🪑 Hareketsiz',
    'light': '🚶 Hafif',
    'moderate': '🚴 Orta',
    'active': '🏃 Aktif',
    'very_active': '🏋️ Çok Aktif'
  };
  Object.entries(activityStats).forEach(([level, count]) => {
    const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0.0';
    const label = activityLabels[level] || level;
    console.log(`║  ${label.padEnd(18)} ${String(count).padStart(5)} (${percentage.padStart(5)}%)                     ║`);
  });
  
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  // Fiziksel istatistikler
  const physicalStats = botDb.getPhysicalStats();
  console.log('║                 📏 FİZİKSEL İSTATİSTİKLER                     ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  📏 Ortalama Boy:         ${String(physicalStats.avgHeight. toFixed(1)).padStart(6)} cm                     ║`);
  console.log(`║  ⚖️  Ortalama Kilo:       ${String(physicalStats.avgWeight.toFixed(1)).padStart(6)} kg                     ║`);
  console.log(`║  🎯 Ortalama Hedef Kilo: ${String(physicalStats.avgTargetWeight.toFixed(1)).padStart(6)} kg                     ║`);
  console.log(`║  📊 Ortalama BMI:        ${String(physicalStats. avgBMI. toFixed(1)).padStart(6)}                         ║`);
  
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  // Batch bilgisi
  console.log('║                    📦 BATCH BİLGİSİ                           ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  Object.entries(stats. byBatch).forEach(([batch, count]) => {
    const shortBatch = batch. replace('batch_', '').substring(0, 13);
    console.log(`║  ${shortBatch. padEnd(15)} ${String(count).padStart(5)} bot                             ║`);
  });
  
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  // AI destekli bot sayısı
  const aiEnabledCount = Object.entries(PERSONA_CONFIGS)
    .filter(([_, config]) => config.aiEnabled)
    .reduce((sum, [persona, _]) => sum + (stats.byPersona[persona] || 0), 0);
  
  console.log('║                    🤖 AI ÖZELLİKLERİ                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  🤖 AI Destekli Bot:    ${String(aiEnabledCount).padStart(5)} (yorum yazabilir)             ║`);
  console.log(`║  📝 Normal Bot:         ${String(stats. total - aiEnabledCount).padStart(5)} (sadece okuma/beğeni)         ║`);
  
  console. log('╚══════════════════════════════════════════════════════════════╝');
  
  // Son 10 bot
  console.log('\n📋 Son Oluşturulan 10 Bot:');
  console.log('─'.repeat(80));
  const recentBots:  LocalBot[] = botDb.getRecentBots(10);
  recentBots.forEach((bot:  LocalBot, index:  number) => {
    const genderIcon = bot.gender === 'male' ?  '👨' : '👩';
    console.log(`  ${(index + 1).toString().padStart(2)}. ${genderIcon} ${bot.username. padEnd(25)} | ${(bot.persona || '').padEnd(15)} | ${bot.goal || ''}`);
  });
  console.log('─'. repeat(80));
  
  // Top 10 şehir
  const locationStats = botDb. getLocationStats();
  if (Object.keys(locationStats).length > 0) {
    console.log('\n📍 En Çok Bot Olan 10 Şehir:');
    console.log('─'. repeat(40));
    Object.entries(locationStats).forEach(([city, count], index:  number) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${city. padEnd(20)} ${count} bot`);
    });
    console.log('─'.repeat(40));
  }
}

generateReport();