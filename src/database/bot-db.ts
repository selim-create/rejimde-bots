import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { StoredBot, PersonaType } from '../types';
import { logger } from '../utils/logger';

const DB_PATH = process.env.DB_PATH || './data/bots.db';

class BotDatabase {
  private db: Database. Database;

  constructor() {
    // Ensure data directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.initialize();
  }

  private initialize(): void {
    // Create bots table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        persona TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        last_activity TEXT,
        total_score INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create activity_logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        success INTEGER DEFAULT 1,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots(id)
      )
    `);

    logger.debug('Database initialized');
  }

  /**
   * Bot kaydet
   */
  saveBot(bot: {
    user_id: number;
    username: string;
    email: string;
    password:  string;
    persona: PersonaType;
    batch_id:  string;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO bots (user_id, username, email, password, persona, batch_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      bot.user_id,
      bot.username,
      bot.email,
      bot.password,
      bot.persona,
      bot.batch_id
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Bot bilgilerini getir (username ile)
   */
  getBotByUsername(username: string): StoredBot | null {
    const stmt = this.db.prepare('SELECT * FROM bots WHERE username = ?');
    return stmt.get(username) as StoredBot | null;
  }

  /**
   * Bot bilgilerini getir (user_id ile)
   */
  getBotByUserId(userId: number): StoredBot | null {
    const stmt = this. db.prepare('SELECT * FROM bots WHERE user_id = ?');
    return stmt.get(userId) as StoredBot | null;
  }

  /**
   * Tüm aktif botları getir
   */
  getActiveBots(): StoredBot[] {
    const stmt = this. db.prepare('SELECT * FROM bots WHERE is_active = 1');
    return stmt.all() as StoredBot[];
  }

  /**
   * Batch'e göre botları getir
   */
  getBotsByBatch(batchId: string): StoredBot[] {
    const stmt = this.db.prepare('SELECT * FROM bots WHERE batch_id = ? ');
    return stmt.all(batchId) as StoredBot[];
  }

  /**
   * Persona'ya göre botları getir
   */
  getBotsByPersona(persona: PersonaType): StoredBot[] {
    const stmt = this.db.prepare('SELECT * FROM bots WHERE persona = ?');
    return stmt.all(persona) as StoredBot[];
  }

  /**
   * Bot durumunu güncelle
   */
  updateBotStatus(botId: number, isActive: boolean): void {
    const stmt = this.db.prepare('UPDATE bots SET is_active = ? WHERE id = ?');
    stmt.run(isActive ?  1 : 0, botId);
  }

  /**
   * Son giriş zamanını güncelle
   */
  updateLastLogin(botId: number): void {
    const stmt = this.db.prepare('UPDATE bots SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(botId);
  }

  /**
   * Son aktivite zamanını güncelle
   */
  updateLastActivity(botId: number): void {
    const stmt = this.db.prepare('UPDATE bots SET last_activity = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(botId);
  }

  /**
   * Skoru güncelle
   */
  updateScore(botId: number, score: number): void {
    const stmt = this.db.prepare('UPDATE bots SET total_score = ?  WHERE id = ?');
    stmt.run(score, botId);
  }

  /**
   * Aktivite logu kaydet
   */
  logActivity(botId: number, activityType: string, success: boolean, details?: string): void {
    const stmt = this.db. prepare(`
      INSERT INTO activity_logs (bot_id, activity_type, success, details)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(botId, activityType, success ?  1 : 0, details || null);
  }

  /**
   * İstatistikler
   */
  getStats(): {
    total: number;
    active: number;
    byPersona: Record<string, number>;
    byBatch: Record<string, number>;
  } {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM bots').get() as { count: number };
    const active = this.db.prepare('SELECT COUNT(*) as count FROM bots WHERE is_active = 1').get() as { count: number };

    const personaStats = this.db.prepare(`
      SELECT persona, COUNT(*) as count FROM bots GROUP BY persona
    `).all() as { persona: string; count: number }[];

    const batchStats = this.db.prepare(`
      SELECT batch_id, COUNT(*) as count FROM bots GROUP BY batch_id
    `).all() as { batch_id: string; count: number }[];

    const byPersona:  Record<string, number> = {};
    personaStats.forEach(p => { byPersona[p.persona] = p.count; });

    const byBatch: Record<string, number> = {};
    batchStats.forEach(b => { byBatch[b.batch_id] = b.count; });

    return {
      total:  total.count,
      active: active.count,
      byPersona,
      byBatch,
    };
  }

  /**
   * Batch sil
   */
  deleteBatch(batchId: string): number {
    const bots = this.getBotsByBatch(batchId);
    const botIds = bots.map(b => b.id);

    if (botIds.length > 0) {
      const placeholders = botIds.map(() => '?').join(',');
      this.db.prepare(`DELETE FROM activity_logs WHERE bot_id IN (${placeholders})`).run(...botIds);
    }

    const stmt = this.db.prepare('DELETE FROM bots WHERE batch_id = ?');
    const result = stmt.run(batchId);
    return result.changes;
  }

  /**
   * Veritabanını kapat
   */
  close(): void {
    this.db. close();
  }
}

// Singleton instance
export const botDb = new BotDatabase();