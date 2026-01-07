// Persona Types
export type PersonaType = 
  | 'super_active' 
  | 'active' 
  | 'normal' 
  | 'low_activity' 
  | 'dormant' 
  | 'diet_focused' 
  | 'exercise_focused';

// Bot User Profile (Generator'ın ürettiği)
export interface BotUser {
  username: string;
  email:  string;
  password: string;
  name: string;
  gender: 'male' | 'female';
  birth_date: string;
  height:  number;
  current_weight: number;
  target_weight: number;
  goal: string;
  activity_level:  string;
  description:  string;
  location: string;
  avatar_url: string;
  
  // Simulation fields (user-generator tarafından ekleniyor)
  is_simulation?:  boolean;
  simulation_persona?: PersonaType;
  simulation_batch?: string;
  simulation_active?: boolean;
}

// Alias for backward compatibility
export type BotUserProfile = BotUser;

// Local DB'de tutulan bot
export interface LocalBot {
  id: number;
  user_id: number;
  username: string;
  email: string;
  password: string;
  persona:  PersonaType;
  batch_id: string;
  is_active: number;
  jwt_token: string | null;
  token_expiry: string | null;
  last_login: string | null;
  current_streak: number;
  total_score: number;
  created_at: string;
  updated_at: string;
  
  // Yeni eklenen alanlar (database'de var)
  gender?: string;
  height?: number;
  current_weight?: number;
  target_weight?: number;
  goal?: string;
  activity_level?: string;
  location?: string;
}

// AI Generator State
export interface AIGeneratorState {
  created_diets_today: number;
  created_exercises_today: number;
  created_diet_ids: number[];
  created_exercise_ids: number[];
  last_generation_date: string;
}

// Bot State
export interface BotState {
  bot_id: number;
  started_diets: number[];
  completed_diets: number[];
  reviewed_diets: number[];
  started_exercises:  number[];
  completed_exercises: number[];
  reviewed_exercises: number[];
  followed_users: number[];
  read_blogs: number[];
  commented_posts: number[];
  liked_comments: number[];
  replied_comments: number[];
  circle_id: number | null;
  active_diet_id: number | null;
  active_exercise_id: number | null;
  ai_generator?: AIGeneratorState;
}

// Activity Log
export interface ActivityLog {
  id: number;
  bot_id: number;
  activity_type: string;
  entity_type: string | null;
  entity_id: number | null;
  success: number;
  response:  string | null;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

export interface RegisterResponse {
  user_id: number;
  username: string;
  email:  string;
  token?:  string;
}

export interface LoginResponse {
  token:  string;
  user_id: number;
  user_email: string;
  user_display_name:  string;
  current_streak?:  number;
}

export interface EventDispatchResponse {
  success: boolean;
  points_earned?:  number;
  daily_score?: number;
  total_score?: number;
  current_streak?: number;
  message?: string;
}

// Content Types
export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content?:  string;
  is_sticky?:  boolean;
  author_id?:  number;
}

export interface DietPlan {
  id: number;
  title: string;
  slug: string;
  difficulty?:  string;
  duration?: string;
  score_reward?: number;
}

export interface ExercisePlan {
  id: number;
  title: string;
  slug: string;
  difficulty?: string;
  duration?: string;
  score_reward?:  number;
}

export interface Circle {
  id:  number;
  name: string;
  slug: string;
  member_count: number;
  total_score: number;
}

export interface Expert {
  id:  number;
  user_id: number;
  name: string;
  slug: string;
  profession: string;
}

export interface Comment {
  id:  number;
  content: string;
  author_id: number;
  author_name: string;
  parent:  number;
  reply_count?:  number;
}

export interface LeaderboardUser {
  id:  number;
  name: string;
  username: string;
  avatar_url: string;
  total_score: number;
}