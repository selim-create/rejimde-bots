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
    // Bots tablosu - varsa kontrol et
    const tableExists = this.db. prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='bots'
    `).get();

    if (!tableExists) {
      // Tablo yoksa oluştur (yeni kolonlarla birlikte)
      this.db.exec(`
        CREATE TABLE bots (
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
          gender TEXT,
          height INTEGER,
          current_weight REAL,
          target_weight REAL,
          goal TEXT,
          activity_level TEXT,
          location TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_bots_persona ON bots(persona);
        CREATE INDEX idx_bots_batch ON bots(batch_id);
        CREATE INDEX idx_bots_active ON bots(is_active);
        CREATE INDEX idx_bots_gender ON bots(gender);
        CREATE INDEX idx_bots_goal ON bots(goal);
      `);
    } else {
      // Tablo varsa, eksik kolonları ekle (migration)
      const columns = this.db.prepare(`PRAGMA table_info(bots)`).all() as { name: string }[];
      const columnNames = columns.map(c => c.name);

      const migrations:  { column: string; definition: string }[] = [
        { column: 'gender', definition: 'TEXT' },
        { column: 'height', definition: 'INTEGER' },
        { column: 'current_weight', definition: 'REAL' },
        { column: 'target_weight', definition: 'REAL' },
        { column: 'goal', definition: 'TEXT' },
        { column: 'activity_level', definition: 'TEXT' },
        { column: 'location', definition: 'TEXT' },
      ];

      for (const migration of migrations) {
        if (!columnNames. includes(migration.column)) {
          try {
            this. db.exec(`ALTER TABLE bots ADD COLUMN ${migration.column} ${migration.definition}`);
            console.log(`✅ Migration: ${migration.column} kolonu eklendi`);
          } catch (e) {
            // Kolon zaten varsa devam et
          }
        }
      }

      // İndeksleri oluştur (IF NOT EXISTS ile)
      try {
        this. db.exec(`CREATE INDEX IF NOT EXISTS idx_bots_gender ON bots(gender)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_bots_goal ON bots(goal)`);
      } catch (e) {
        // İndeks varsa devam et
      }
    }

    // Bot State tablosu
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bot_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id INTEGER UNIQUE NOT NULL,
        started_diets TEXT DEFAULT '[]',
        completed_diets TEXT DEFAULT '[]',
        reviewed_diets TEXT DEFAULT '[]',
        started_exercises TEXT DEFAULT '[]',
        completed_exercises TEXT DEFAULT '[]',
        reviewed_exercises TEXT DEFAULT '[]',
        followed_users TEXT DEFAULT '[]',
        read_blogs TEXT DEFAULT '[]',
        commented_posts TEXT DEFAULT '[]',
        liked_comments TEXT DEFAULT '[]',
        replied_comments TEXT DEFAULT '[]',
        circle_id INTEGER,
        active_diet_id INTEGER,
        active_exercise_id INTEGER,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots(id)
      );
    `);

    // Bot State tablosu migration - replied_comments kolonu ekle
    try {
      const stateColumns = this.db.prepare(`PRAGMA table_info(bot_states)`).all() as { name: string }[];
      const stateColumnNames = stateColumns.map(c => c.name);
      
      if (!stateColumnNames.includes('replied_comments')) {
        this.db.exec(`ALTER TABLE bot_states ADD COLUMN replied_comments TEXT DEFAULT '[]'`);
        // Migration başarılı - ileride logger eklenebilir
      }
      
      // reviewed_diets kolonu ekle
      if (!stateColumnNames.includes('reviewed_diets')) {
        this.db.exec(`ALTER TABLE bot_states ADD COLUMN reviewed_diets TEXT DEFAULT '[]'`);
      }
      
      // reviewed_exercises kolonu ekle
      if (!stateColumnNames.includes('reviewed_exercises')) {
        this.db.exec(`ALTER TABLE bot_states ADD COLUMN reviewed_exercises TEXT DEFAULT '[]'`);
      }
      
      // ai_generator kolonu ekle
      if (!stateColumnNames.includes('ai_generator')) {
        this.db.exec(`ALTER TABLE bot_states ADD COLUMN ai_generator TEXT DEFAULT NULL`);
      }
    } catch (e) {
      // Kolon zaten varsa veya tablo yoksa (yeni kurulum) devam et
    }

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

    // Global Limits tablosu (AI içerik oluşturma günlük limitleri)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS global_limits (
        id INTEGER PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        diets_created INTEGER DEFAULT 0,
        exercises_created INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_global_limits_date ON global_limits(date);
    `);
  }

  // ============ BOT CRUD ============

  saveBot(data: {
    user_id: number;
    username: string;
    email:  string;
    password: string;
    persona: PersonaType;
    batch_id: string;
    gender?:  string;
    height?: number;
    current_weight?: number;
    target_weight?: number;
    goal?: string;
    activity_level?: string;
    location?: string;
  }): number {
    const stmt = this.db. prepare(`
      INSERT INTO bots (
        user_id, username, email, password, persona, batch_id,
        gender, height, current_weight, target_weight, goal, activity_level, location
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt. run(
      data.user_id,
      data.username,
      data. email,
      data.password,
      data.persona,
      data.batch_id,
      data.gender || null,
      data. height || null,
      data.current_weight || null,
      data.target_weight || null,
      data.goal || null,
      data.activity_level || null,
      data.location || null
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
        reviewed_diets: [],
        started_exercises: [],
        completed_exercises: [],
        reviewed_exercises: [],
        followed_users:  [],
        read_blogs: [],
        commented_posts: [],
        liked_comments: [],
        replied_comments: [],
        circle_id: null,
        active_diet_id: null,
        active_exercise_id: null,
        ai_generator: undefined
      };
    }

    return {
      bot_id: botId,
      started_diets: JSON.parse(row. started_diets || '[]'),
      completed_diets:  JSON.parse(row.completed_diets || '[]'),
      reviewed_diets: JSON.parse(row.reviewed_diets || '[]'),
      started_exercises:  JSON.parse(row.started_exercises || '[]'),
      completed_exercises: JSON.parse(row. completed_exercises || '[]'),
      reviewed_exercises: JSON.parse(row.reviewed_exercises || '[]'),
      followed_users: JSON. parse(row.followed_users || '[]'),
      read_blogs: JSON.parse(row.read_blogs || '[]'),
      commented_posts: JSON.parse(row.commented_posts || '[]'),
      liked_comments:  JSON.parse(row.liked_comments || '[]'),
      replied_comments: JSON.parse(row.replied_comments || '[]'),
      circle_id: row.circle_id,
      active_diet_id: row. active_diet_id,
      active_exercise_id: row.active_exercise_id,
      ai_generator: row.ai_generator ? JSON.parse(row.ai_generator) : undefined
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
    if (state.reviewed_diets !== undefined) {
      updates.push('reviewed_diets = ?');
      values.push(JSON.stringify(state.reviewed_diets));
    }
    if (state. started_exercises !== undefined) {
      updates.push('started_exercises = ?');
      values.push(JSON.stringify(state.started_exercises));
    }
    if (state.completed_exercises !== undefined) {
      updates. push('completed_exercises = ?');
      values.push(JSON.stringify(state. completed_exercises));
    }
    if (state.reviewed_exercises !== undefined) {
      updates.push('reviewed_exercises = ?');
      values.push(JSON.stringify(state.reviewed_exercises));
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
    if (state.replied_comments !== undefined) {
      updates.push('replied_comments = ?');
      values.push(JSON.stringify(state.replied_comments));
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
    if (state.ai_generator !== undefined) {
      updates.push('ai_generator = ?');
      values.push(state.ai_generator ? JSON.stringify(state.ai_generator) : null);
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
  // ============ REPORT METHODS ============

  getGenderStats(): { male: number; female: number } {
    const maleResult = this.db. prepare(`
      SELECT COUNT(*) as count FROM bots WHERE gender = 'male'
    `).get() as { count: number } | undefined;
    
    const femaleResult = this.db.prepare(`
      SELECT COUNT(*) as count FROM bots WHERE gender = 'female'
    `).get() as { count: number } | undefined;
    
    return { 
      male: maleResult?. count || 0, 
      female:  femaleResult?.count || 0 
    };
  }

  getGoalStats(): Record<string, number> {
    const rows = this.db. prepare(`
      SELECT goal, COUNT(*) as count FROM bots WHERE goal IS NOT NULL GROUP BY goal
    `).all() as { goal: string; count: number }[];
    
    const result: Record<string, number> = {};
    rows.forEach(r => {
      if (r.goal) result[r.goal] = r.count;
    });
    return result;
  }

  getActivityLevelStats(): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT activity_level, COUNT(*) as count FROM bots WHERE activity_level IS NOT NULL GROUP BY activity_level
    `).all() as { activity_level: string; count: number }[];
    
    const result: Record<string, number> = {};
    rows.forEach(r => {
      if (r. activity_level) result[r.activity_level] = r. count;
    });
    return result;
  }

  getPhysicalStats(): { avgHeight: number; avgWeight: number; avgTargetWeight: number; avgBMI: number } {
    const result = this.db.prepare(`
      SELECT 
        AVG(height) as avgHeight,
        AVG(current_weight) as avgWeight,
        AVG(target_weight) as avgTargetWeight,
        AVG(current_weight / ((height / 100.0) * (height / 100.0))) as avgBMI
      FROM bots
      WHERE height > 0 AND current_weight > 0
    `).get() as { avgHeight:  number; avgWeight:  number; avgTargetWeight: number; avgBMI: number } | undefined;
    
    return {
      avgHeight:  result?.avgHeight || 0,
      avgWeight: result?. avgWeight || 0,
      avgTargetWeight: result?. avgTargetWeight || 0,
      avgBMI:  result?.avgBMI || 0
    };
  }

  getRecentBots(limit: number = 10): LocalBot[] {
    return this.db.prepare(`
      SELECT * FROM bots 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(limit) as LocalBot[];
  }

  getLocationStats(): Record<string, number> {
    const rows = this.db. prepare(`
      SELECT location, COUNT(*) as count FROM bots WHERE location IS NOT NULL GROUP BY location ORDER BY count DESC LIMIT 10
    `).all() as { location: string; count: number }[];
    
    const result: Record<string, number> = {};
    rows.forEach(r => {
      if (r. location) result[r.location] = r.count;
    });
    return result;
  }

  // ============ GLOBAL LIMITS (AI Content Generation) ============

  /**
   * Bugünkü global limitleri getirir
   * @param date YYYY-MM-DD formatında tarih
   * @returns Bugün oluşturulan diyet ve egzersiz sayısı
   */
  getGlobalLimits(date: string): { diets: number; exercises: number } {
    const row = this.db.prepare(`
      SELECT diets_created, exercises_created FROM global_limits WHERE date = ?
    `).get(date) as { diets_created: number; exercises_created: number } | undefined;

    return {
      diets: row?.diets_created || 0,
      exercises: row?.exercises_created || 0,
    };
  }

  /**
   * Bugün diyet oluşturulabilir mi kontrol eder
   * @param date YYYY-MM-DD formatında tarih
   * @param limit Maksimum günlük diyet limiti
   * @returns true ise diyet oluşturulabilir
   */
  canCreateDiet(date: string, limit: number): boolean {
    const { diets } = this.getGlobalLimits(date);
    return diets < limit;
  }

  /**
   * Bugün egzersiz oluşturulabilir mi kontrol eder
   * @param date YYYY-MM-DD formatında tarih
   * @param limit Maksimum günlük egzersiz limiti
   * @returns true ise egzersiz oluşturulabilir
   */
  canCreateExercise(date: string, limit: number): boolean {
    const { exercises } = this.getGlobalLimits(date);
    return exercises < limit;
  }

  /**
   * Diyet sayacını atomik olarak artırır (rezervasyon)
   * @param date YYYY-MM-DD formatında tarih
   * @param limit Maksimum günlük diyet limiti
   * @returns true ise rezervasyon başarılı, false ise limit doldu
   */
  incrementGlobalDietCount(date: string, limit: number): boolean {
    // Transaction ile atomic işlem
    const transaction = this.db.transaction(() => {
      // Önce kayıt var mı kontrol et, yoksa oluştur
      const existing = this.db.prepare(`
        SELECT diets_created FROM global_limits WHERE date = ?
      `).get(date) as { diets_created: number } | undefined;

      if (!existing) {
        // İlk kayıt - oluştur
        // Race condition handling: INSERT OR IGNORE ile eşzamanlı INSERT'leri yönet
        this.db.prepare(`
          INSERT OR IGNORE INTO global_limits (date, diets_created, exercises_created, updated_at)
          VALUES (?, 0, 0, CURRENT_TIMESTAMP)
        `).run(date);
        
        // Tekrar oku (başka transaction oluşturmuş olabilir)
        const recheck = this.db.prepare(`
          SELECT diets_created FROM global_limits WHERE date = ?
        `).get(date) as { diets_created: number } | undefined;
        
        if (!recheck || recheck.diets_created >= limit) {
          return false;
        }
      } else {
        // Limit kontrolü
        if (existing.diets_created >= limit) {
          return false; // Limit doldu
        }
      }

      // Sayacı artır
      this.db.prepare(`
        UPDATE global_limits 
        SET diets_created = diets_created + 1, updated_at = CURRENT_TIMESTAMP
        WHERE date = ? AND diets_created < ?
      `).run(date, limit);
      
      return true;
    });

    return transaction();
  }

  /**
   * Egzersiz sayacını atomik olarak artırır (rezervasyon)
   * @param date YYYY-MM-DD formatında tarih
   * @param limit Maksimum günlük egzersiz limiti
   * @returns true ise rezervasyon başarılı, false ise limit doldu
   */
  incrementGlobalExerciseCount(date: string, limit: number): boolean {
    // Transaction ile atomic işlem
    const transaction = this.db.transaction(() => {
      // Önce kayıt var mı kontrol et, yoksa oluştur
      const existing = this.db.prepare(`
        SELECT exercises_created FROM global_limits WHERE date = ?
      `).get(date) as { exercises_created: number } | undefined;

      if (!existing) {
        // İlk kayıt - oluştur
        // Race condition handling: INSERT OR IGNORE ile eşzamanlı INSERT'leri yönet
        this.db.prepare(`
          INSERT OR IGNORE INTO global_limits (date, diets_created, exercises_created, updated_at)
          VALUES (?, 0, 0, CURRENT_TIMESTAMP)
        `).run(date);
        
        // Tekrar oku (başka transaction oluşturmuş olabilir)
        const recheck = this.db.prepare(`
          SELECT exercises_created FROM global_limits WHERE date = ?
        `).get(date) as { exercises_created: number } | undefined;
        
        if (!recheck || recheck.exercises_created >= limit) {
          return false;
        }
      } else {
        // Limit kontrolü
        if (existing.exercises_created >= limit) {
          return false; // Limit doldu
        }
      }

      // Sayacı artır
      this.db.prepare(`
        UPDATE global_limits 
        SET exercises_created = exercises_created + 1, updated_at = CURRENT_TIMESTAMP
        WHERE date = ? AND exercises_created < ?
      `).run(date, limit);
      
      return true;
    });

    return transaction();
  }

  /**
   * Diyet sayacını azaltır (rollback için)
   * @param date YYYY-MM-DD formatında tarih
   */
  decrementGlobalDietCount(date: string): void {
    this.db.prepare(`
      UPDATE global_limits 
      SET diets_created = MAX(0, diets_created - 1), updated_at = CURRENT_TIMESTAMP
      WHERE date = ?
    `).run(date);
  }

  /**
   * Egzersiz sayacını azaltır (rollback için)
   * @param date YYYY-MM-DD formatında tarih
   */
  decrementGlobalExerciseCount(date: string): void {
    this.db.prepare(`
      UPDATE global_limits 
      SET exercises_created = MAX(0, exercises_created - 1), updated_at = CURRENT_TIMESTAMP
      WHERE date = ?
    `).run(date);
  }

  close(): void {
    this.db.close();
  }
}

// Singleton export
export const botDb = new BotDatabase();