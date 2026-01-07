import Database from 'better-sqlite3';
import path from 'path';
import { LocalBot, BotState, ActivityLog, PersonaType } from '../types';

const DB_PATH = path. join(process.cwd(), 'data', 'bots.sqlite');

class BotDatabase {
  private db: Database. Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initTables();
  }

  private initTables() {
    // Bots tablosu
    this. db.exec(`
      CREATE TABLE IF NOT EXISTS bots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        persona TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        jwt_token TEXT,
        token_expiry TEXT,
        last_login TEXT,
        current_streak INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_bots_persona ON bots(persona);
      CREATE INDEX IF NOT EXISTS idx_bots_batch ON bots(batch_id);
      CREATE INDEX IF NOT EXISTS idx_bots_active ON bots(is_active);
    `);

    // Bot State tablosu (JSON stored arrays)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bot_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id INTEGER UNIQUE NOT NULL,
        started_diets TEXT DEFAULT '[]',
        completed_diets TEXT DEFAULT '[]',
        started_exercises TEXT DEFAULT '[]',
        completed_exercises TEXT DEFAULT '[]',
        followed_users TEXT DEFAULT '[]',
        read_blogs TEXT DEFAULT '[]',
        commented_posts TEXT DEFAULT '[]',
        liked_comments TEXT DEFAULT '[]',
        circle_id INTEGER,
        active_diet_id INTEGER,
        active_exercise_id INTEGER,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots(id)
      );
    `);

    // Activity Logs tablosu
    this.db. exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        success INTEGER DEFAULT 1,
        response TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_activities_bot ON activity_logs(bot_id);
      CREATE INDEX IF NOT EXISTS idx_activities_type ON activity_logs(activity_type);
      CREATE INDEX IF NOT EXISTS idx_activities_date ON activity_logs(created_at);
    `);
  }

  // ============ BOT CRUD ============

  saveBot(data: {
    user_id: number;
    username: string;
    email: string;
    password: string;
    persona:  PersonaType;
    batch_id:  string;
  }): number {
    const stmt = this.db. prepare(`
      INSERT INTO bots (user_id, username, email, password, persona, batch_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.user_id,
      data.username,
      data.email,
      data.password,
      data.persona,
      data. batch_id
    );
    
    // State kaydı oluştur
    const botId = result.lastInsertRowid as number;
    this.db.prepare(`INSERT INTO bot_states (bot_id) VALUES (?)`).run(botId);
    
    return botId;
  }

  getBotById(id: number): LocalBot | undefined {
    return this.db.prepare('SELECT * FROM bots WHERE id = ?').get(id) as LocalBot | undefined;
  }

  getBotByUserId(userId:  number): LocalBot | undefined {
    return this.db.prepare('SELECT * FROM bots WHERE user_id = ?').get(userId) as LocalBot | undefined;
  }

  getBotByUsername(username: string): LocalBot | undefined {
    return this.db. prepare('SELECT * FROM bots WHERE username = ?').get(username) as LocalBot | undefined;
  }

  getActiveBots(limit?:  number): LocalBot[] {
    let query = 'SELECT * FROM bots WHERE is_active = 1';
    if (limit) query += ` LIMIT ${limit}`;
    return this.db.prepare(query).all() as LocalBot[];
  }

  getBotsByPersona(persona: PersonaType): LocalBot[] {
    return this.db.prepare('SELECT * FROM bots WHERE persona = ?  AND is_active = 1').all(persona) as LocalBot[];
  }

  getBotsByBatch(batchId: string): LocalBot[] {
    return this.db.prepare('SELECT * FROM bots WHERE batch_id = ?').all(batchId) as LocalBot[];
  }

  // ============ TOKEN MANAGEMENT ============

  updateToken(botId:  number, token: string, expiry: Date): void {
    this.db.prepare(`
      UPDATE bots 
      SET jwt_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? 
    `).run(token, expiry. toISOString(), botId);
  }

  updateLogin(botId: number, streak: number): void {
    this.db.prepare(`
      UPDATE bots 
      SET last_login = CURRENT_TIMESTAMP, current_streak = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(streak, botId);
  }

  updateScore(botId: number, score: number): void {
    this.db.prepare(`
      UPDATE bots 
      SET total_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? 
    `).run(score, botId);
  }

  // ============ BOT STATE ============

  getState(botId:  number): BotState {
    const row = this.db. prepare('SELECT * FROM bot_states WHERE bot_id = ?').get(botId) as any;
    
    if (!row) {
      // Default state
      return {
        bot_id: botId,
        started_diets: [],
        completed_diets: [],
        started_exercises: [],
        completed_exercises: [],
        followed_users:  [],
        read_blogs: [],
        commented_posts: [],
        liked_comments: [],
        circle_id: null,
        active_diet_id: null,
        active_exercise_id: null
      };
    }

    return {
      bot_id: botId,
      started_diets: JSON.parse(row. started_diets || '[]'),
      completed_diets:  JSON.parse(row.completed_diets || '[]'),
      started_exercises:  JSON.parse(row.started_exercises || '[]'),
      completed_exercises: JSON.parse(row. completed_exercises || '[]'),
      followed_users: JSON. parse(row.followed_users || '[]'),
      read_blogs: JSON.parse(row.read_blogs || '[]'),
      commented_posts: JSON.parse(row.commented_posts || '[]'),
      liked_comments:  JSON.parse(row.liked_comments || '[]'),
      circle_id: row.circle_id,
      active_diet_id: row. active_diet_id,
      active_exercise_id: row.active_exercise_id
    };
  }

  updateState(botId:  number, state:  Partial<BotState>): void {
    const updates:  string[] = [];
    const values: any[] = [];

    if (state.started_diets !== undefined) {
      updates.push('started_diets = ?');
      values.push(JSON. stringify(state.started_diets));
    }
    if (state.completed_diets !== undefined) {
      updates. push('completed_diets = ?');
      values.push(JSON.stringify(state.completed_diets));
    }
    if (state. started_exercises !== undefined) {
      updates.push('started_exercises = ?');
      values.push(JSON.stringify(state.started_exercises));
    }
    if (state.completed_exercises !== undefined) {
      updates. push('completed_exercises = ?');
      values.push(JSON.stringify(state. completed_exercises));
    }
    if (state.followed_users !== undefined) {
      updates.push('followed_users = ?');
      values.push(JSON. stringify(state.followed_users));
    }
    if (state.read_blogs !== undefined) {
      updates.push('read_blogs = ? ');
      values.push(JSON.stringify(state.read_blogs));
    }
    if (state.commented_posts !== undefined) {
      updates.push('commented_posts = ?');
      values.push(JSON.stringify(state.commented_posts));
    }
    if (state. liked_comments !== undefined) {
      updates.push('liked_comments = ?');
      values.push(JSON.stringify(state.liked_comments));
    }
    if (state.circle_id !== undefined) {
      updates. push('circle_id = ?');
      values.push(state.circle_id);
    }
    if (state.active_diet_id !== undefined) {
      updates.push('active_diet_id = ?');
      values.push(state. active_diet_id);
    }
    if (state. active_exercise_id !== undefined) {
      updates.push('active_exercise_id = ?');
      values.push(state.active_exercise_id);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(botId);

    this.db. prepare(`
      UPDATE bot_states SET ${updates.join(', ')} WHERE bot_id = ? 
    `).run(...values);
  }

  // ============ ACTIVITY LOGGING ============

  logActivity(
    botId: number,
    activityType: string,
    entityType?:  string | null,
    entityId?: number | null,
    success:  boolean = true,
    response?: string | null
  ): void {
    this.db.prepare(`
      INSERT INTO activity_logs (bot_id, activity_type, entity_type, entity_id, success, response)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(botId, activityType, entityType, entityId, success ?  1 : 0, response);
  }

  getRecentActivities(botId: number, limit: number = 50): ActivityLog[] {
    return this.db.prepare(`
      SELECT * FROM activity_logs 
      WHERE bot_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(botId, limit) as ActivityLog[];
  }

  getTodayActivities(botId: number, activityType?:  string): ActivityLog[] {
    let query = `
      SELECT * FROM activity_logs 
      WHERE bot_id = ?  AND date(created_at) = date('now')
    `;
    const params:  any[] = [botId];
    
    if (activityType) {
      query += ' AND activity_type = ?';
      params.push(activityType);
    }
    
    return this.db.prepare(query).all(...params) as ActivityLog[];
  }

  // ============ STATISTICS ============

  getStats(): { total:  number; active: number; byPersona: Record<string, number>; byBatch:  Record<string, number> } {
    const total = (this.db.prepare('SELECT COUNT(*) as count FROM bots').get() as any).count;
    const active = (this.db.prepare('SELECT COUNT(*) as count FROM bots WHERE is_active = 1').get() as any).count;
    
    const personaRows = this.db. prepare(`
      SELECT persona, COUNT(*) as count FROM bots GROUP BY persona
    `).all() as { persona: string; count: number }[];
    const byPersona: Record<string, number> = {};
    personaRows.forEach(r => byPersona[r. persona] = r.count);

    const batchRows = this.db.prepare(`
      SELECT batch_id, COUNT(*) as count FROM bots GROUP BY batch_id
    `).all() as { batch_id: string; count: number }[];
    const byBatch: Record<string, number> = {};
    batchRows.forEach(r => byBatch[r.batch_id] = r.count);

    return { total, active, byPersona, byBatch };
  }

  // ============ BULK OPERATIONS ============

  toggleAllBots(active: boolean): number {
    const result = this.db. prepare('UPDATE bots SET is_active = ? ').run(active ? 1 : 0);
    return result.changes;
  }

  toggleBatchBots(batchId: string, active: boolean): number {
    const result = this.db. prepare('UPDATE bots SET is_active = ?  WHERE batch_id = ?').run(active ?  1 : 0, batchId);
    return result.changes;
  }

  deleteBatch(batchId: string): number {
    // Önce state'leri sil
    this. db.prepare(`
      DELETE FROM bot_states WHERE bot_id IN (SELECT id FROM bots WHERE batch_id = ?)
    `).run(batchId);
    
    // Sonra aktiviteleri sil
    this.db. prepare(`
      DELETE FROM activity_logs WHERE bot_id IN (SELECT id FROM bots WHERE batch_id = ?)
    `).run(batchId);
    
    // Son olarak botları sil
    const result = this.db.prepare('DELETE FROM bots WHERE batch_id = ?').run(batchId);
    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}

// Singleton export
export const botDb = new BotDatabase();