console.log('=== BOT DATA MIGRATION ===\n');
import dotenv from 'dotenv';
dotenv.config();

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'bots.sqlite');
const db = new Database(DB_PATH);

// Türkçe şehirler
const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Mersin', 'Kayseri', 'Eskişehir', 'Samsun', 'Denizli', 'Trabzon', 'Malatya'];

// Hedefler
const goals = ['weight_loss', 'weight_loss', 'weight_loss', 'muscle_gain', 'muscle_gain', 'healthy_living'];

// Aktivite seviyeleri
const activityLevels = ['sedentary', 'sedentary', 'light', 'light', 'moderate', 'moderate', 'active', 'very_active'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math. random() * (max - min + 1)) + min;
}

function migrateBotData() {
  // Eksik verileri olan botları bul
  const botsToUpdate = db.prepare(`
    SELECT id, username FROM bots WHERE gender IS NULL OR goal IS NULL
  `).all() as { id: number; username: string }[];

  console.log(`📊 ${botsToUpdate. length} bot güncellenecek...\n`);

  const updateStmt = db.prepare(`
    UPDATE bots SET 
      gender = ?,
      height = ?,
      current_weight = ?,
      target_weight = ?,
      goal = ?,
      activity_level = ?,
      location = ? 
    WHERE id = ?
  `);

  let updated = 0;

  for (const bot of botsToUpdate) {
    const gender = Math.random() > 0.5 ?  'male' :  'female';
    const heightBase = gender === 'male' ? 175 : 163;
    const height = heightBase + randomInt(-15, 15);
    
    const goal = randomElement(goals);
    const bmi = 20 + Math.random() * 15;
    const currentWeight = Math.round(bmi * Math.pow(height / 100, 2));
    
    let targetWeight:  number;
    if (goal === 'weight_loss') {
      targetWeight = Math.round(currentWeight * (0.8 + Math.random() * 0.15));
    } else if (goal === 'muscle_gain') {
      targetWeight = Math.round(currentWeight * (1.05 + Math.random() * 0.1));
    } else {
      targetWeight = currentWeight;
    }

    const activityLevel = randomElement(activityLevels);
    const location = randomElement(cities);

    updateStmt.run(
      gender,
      height,
      currentWeight,
      targetWeight,
      goal,
      activityLevel,
      location,
      bot.id
    );

    updated++;
    
    if (updated % 100 === 0) {
      console. log(`  ✅ ${updated}/${botsToUpdate.length} güncellendi... `);
    }
  }

  console.log(`\n✅ Toplam ${updated} bot güncellendi! `);
  db.close();
}

migrateBotData();