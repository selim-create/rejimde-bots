export const SCHEMA = `
-- Botlar
CREATE TABLE IF NOT EXISTS bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wp_user_id INTEGER UNIQUE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  jwt_token TEXT,
  token_expiry DATETIME,
  
  -- Profile
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  gender TEXT CHECK(gender IN ('male', 'female')),
  height INTEGER,
  current_weight REAL,
  target_weight REAL,
  birth_date TEXT,
  
  -- Simulation
  persona TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  
  -- State
  current_streak INTEGER DEFAULT 0,
  last_login_date TEXT,
  active_diet_id INTEGER,
  active_exercise_id INTEGER,
  circle_id INTEGER,
  
  -- Stats
  total_score INTEGER DEFAULT 0,
  total_logins INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bot durumları (JSON stored)
CREATE TABLE IF NOT EXISTS bot_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id INTEGER NOT NULL UNIQUE,
  started_diets TEXT DEFAULT '[]',      -- JSON array
  completed_diets TEXT DEFAULT '[]',
  started_exercises TEXT DEFAULT '[]',
  completed_exercises TEXT DEFAULT '[]',
  followed_users TEXT DEFAULT '[]',
  read_blogs TEXT DEFAULT '[]',
  commented_posts TEXT DEFAULT '[]',
  FOREIGN KEY (bot_id) REFERENCES bots(id)
);

-- Aktivite logları
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  success INTEGER DEFAULT 1,
  response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_bots_persona ON bots(persona);
CREATE INDEX IF NOT EXISTS idx_bots_batch ON bots(batch_id);
CREATE INDEX IF NOT EXISTS idx_bots_active ON bots(is_active);
CREATE INDEX IF NOT EXISTS idx_activities_bot ON activities(bot_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(created_at);
`;